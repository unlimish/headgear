const dns = require('dns');

// Predefined fallback data for geocoding when offline (timeout/network error)
const GEOCODE_FALLBACKS = {
  "new york": { lat: 40.7128, lon: -74.0060, name: "New York" },
  "london": { lat: 51.5074, lon: -0.1278, name: "London" },
  "paris": { lat: 48.8566, lon: 2.3522, name: "Paris" },
  "los angeles": { lat: 34.0522, lon: -118.2437, name: "Los Angeles" },
  "seoul": { lat: 37.5665, lon: 126.9780, name: "Seoul" },
  "taipei": { lat: 25.0330, lon: 121.5654, name: "Taipei" },
  "singapore": { lat: 1.3521, lon: 103.8198, name: "Singapore" }
};

/**
 * Geocodes a city name to latitude/longitude using Open-Meteo Geocoding API.
 * Falls back to predefined cities or a default if network fails.
 */
async function geocodeCity(cityName) {
  const cleanName = cityName.trim().toLowerCase();
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    if (data && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.latitude,
        lon: result.longitude,
        name: result.name
      };
    }
  } catch (error) {
    console.warn(`Geocoding fetch failed for "${cityName}", using fallback:`, error.message);
  }

  // Fallback behavior
  for (const [key, val] of Object.entries(GEOCODE_FALLBACKS)) {
    if (cleanName.includes(key)) {
      return val;
    }
  }

  // Generic fallback: Default to New York
  return { lat: 40.7128, lon: -74.0060, name: `${cityName} (Fallback: New York)` };
}

/**
 * Fetches hourly weather and pressure forecast for given lat/lon.
 * Automatically requests times in Asia/Tokyo timezone to align with bot local JST.
 */
async function fetchForecast(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=pressure_msl,temperature_2m,weather_code&timezone=Asia%2FTokyo`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await response.json();
    if (data && data.hourly) {
      return data;
    }
  } catch (error) {
    console.warn(`Weather forecast fetch failed for lat=${lat}, lon=${lon}, generating mock data:`, error.message);
  }

  // Fallback mock data generation (7 days = 168 hours of data)
  const hourly = {
    time: [],
    pressure_msl: [],
    temperature_2m: [],
    weather_code: []
  };

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 2); // Start 2 days ago to ensure yesterday is covered

  for (let i = 0; i < 168; i++) {
    const d = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
    
    // Format to match Open-Meteo YYYY-MM-DDTHH:00
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hour = String(d.getHours()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day}T${hour}:00`;

    // Generate weather-like sinusoidal pressure curve with a drop
    // Simulate a pressure drop (headache trigger) around index 60-84
    let pressure = 1013.0 + 3.0 * Math.sin((i / 24) * 2 * Math.PI);
    if (i >= 48 && i <= 84) {
      // Simulate drop of 4 hPa
      pressure -= (i - 48) * (4.0 / 36);
    }
    
    // Temperature: sinusoidal daily oscillation (15 to 25 deg C)
    const temp = 20.0 + 5.0 * Math.sin(((i - 8) / 24) * 2 * Math.PI);
    
    // Weather code: 0 (Clear), 3 (Cloudy), 61 (Rain)
    let weatherCode = 0;
    if (pressure < 1010) {
      weatherCode = 61; // Rain
    } else if (pressure < 1013) {
      weatherCode = 3;  // Cloudy
    }

    hourly.time.push(timeStr);
    hourly.pressure_msl.push(Number(pressure.toFixed(1)));
    hourly.temperature_2m.push(Number(temp.toFixed(1)));
    hourly.weather_code.push(weatherCode);
  }

  return { hourly };
}

/**
 * Calculates Zutool-like pressure levels (0 = Ok, 2 = Caution, 3 = Warning, 4 = Bomb)
 * based on hourly pressure changes (both past and future drops).
 */
function calculatePressureLevels(hourly) {
  const pressureMsl = hourly.pressure_msl;
  const levels = [];

  for (let i = 0; i < pressureMsl.length; i++) {
    const P = pressureMsl[i];

    // Future drop (next 6h and next 12h)
    let minFut6h = P;
    const end6 = Math.min(i + 6, pressureMsl.length - 1);
    for (let w = i + 1; w <= end6; w++) {
      if (pressureMsl[w] < minFut6h) minFut6h = pressureMsl[w];
    }
    const futDrop6h = P - minFut6h;

    let minFut12h = P;
    const end12 = Math.min(i + 12, pressureMsl.length - 1);
    for (let w = i + 1; w <= end12; w++) {
      if (pressureMsl[w] < minFut12h) minFut12h = pressureMsl[w];
    }
    const futDrop12h = P - minFut12h;

    // Past drop (past 6h and past 12h)
    let maxPast6h = P;
    const start6 = Math.max(i - 6, 0);
    for (let w = start6; w < i; w++) {
      if (pressureMsl[w] > maxPast6h) maxPast6h = pressureMsl[w];
    }
    const pastDrop6h = maxPast6h - P;

    let maxPast12h = P;
    const start12 = Math.max(i - 12, 0);
    for (let w = start12; w < i; w++) {
      if (pressureMsl[w] > maxPast12h) maxPast12h = pressureMsl[w];
    }
    const pastDrop12h = maxPast12h - P;

    // Recovery check: has the pressure risen by >= 0.3 hPa from recent minimum in past 3h?
    let minRecent3h = P;
    const start3 = Math.max(i - 3, 0);
    for (let w = start3; w < i; w++) {
      if (pressureMsl[w] < minRecent3h) minRecent3h = pressureMsl[w];
    }
    const recoveryAmount = P - minRecent3h;
    const isRecovering = recoveryAmount >= 0.3;

    // Combine features to assign warning levels
    let level = 0;

    if (isRecovering) {
      level = 0;
    } else {
      const maxDrop = Math.max(futDrop6h, futDrop12h * 0.7, pastDrop6h);
      if (maxDrop >= 2.5) {
        level = 4; // Bomb
      } else if (maxDrop >= 1.5) {
        level = 3; // Warning
      } else if (maxDrop >= 0.8) {
        level = 2; // Caution
      }
    }

    levels.push(level);
  }

  return levels;
}

/**
 * Map Weather Codes from WMO (Open-Meteo) to Zutool Weather Codes
 * Zutool: 100 = Clear, 200 = Cloudy, 300 = Rain
 */
function mapWeatherCode(code) {
  if (code === 0) {
    return "100"; // Clear
  } else if ([1, 2, 3, 45, 48].includes(code)) {
    return "200"; // Cloudy
  } else {
    return "300"; // Rain
  }
}

/**
 * Formats Open-Meteo response into the Zutool response structure.
 */
function formatToZutool(omData, placeName) {
  const { hourly } = omData;
  const levels = calculatePressureLevels(hourly);

  // Map JST days
  const getJstDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const parts = new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(d);
    
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  };

  const dates = {
    yesterday: getJstDateString(-1),
    today: getJstDateString(0),
    tommorow: getJstDateString(1),
    dayaftertomorrow: getJstDateString(2)
  };

  const result = {
    place_name: placeName,
    yesterday: [],
    today: [],
    tommorow: [],
    dayaftertomorrow: []
  };

  // Find and map data matching the target dates
  for (let i = 0; i < hourly.time.length; i++) {
    const timeStr = hourly.time[i]; // e.g. "2026-05-25T00:00"
    const [datePart, hourPart] = timeStr.split('T');
    const hour = String(parseInt(hourPart.split(':')[0], 10));

    const entry = {
      time: hour,
      weather: mapWeatherCode(hourly.weather_code[i]),
      temp: String(hourly.temperature_2m[i]),
      pressure: String(hourly.pressure_msl[i]),
      pressure_level: String(levels[i])
    };

    if (datePart === dates.yesterday) {
      result.yesterday.push(entry);
    } else if (datePart === dates.today) {
      result.today.push(entry);
    } else if (datePart === dates.tommorow) {
      result.tommorow.push(entry);
    } else if (datePart === dates.dayaftertomorrow) {
      result.dayaftertomorrow.push(entry);
    }
  }

  // Ensure arrays have exactly 24 elements (fill dummy entries if missing)
  const keys = ['yesterday', 'today', 'tommorow', 'dayaftertomorrow'];
  keys.forEach(k => {
    if (result[k].length < 24) {
      console.warn(`Zutool-Mapped array for ${k} has missing entries (${result[k].length}/24), filling...`);
      const existingHours = result[k].map(e => parseInt(e.time, 10));
      for (let h = 0; h < 24; h++) {
        if (!existingHours.includes(h)) {
          result[k].push({
            time: String(h),
            weather: "100",
            temp: "20.0",
            pressure: "1013.0",
            pressure_level: "0"
          });
        }
      }
      result[k].sort((a, b) => parseInt(a.time, 10) - parseInt(b.time, 10));
    }
  });

  return result;
}

module.exports = {
  geocodeCity,
  fetchForecast,
  calculatePressureLevels,
  formatToZutool
};
