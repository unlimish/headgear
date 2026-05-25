const { geocodeCity } = require("./openMeteo");

async function getCityInfo(opt_place) {
  try {
    let enc_place = encodeURI(opt_place);
    console.log(`[getCityInfo] enc_place: ${enc_place}`);
    let response = await fetch(
      "https://zutool.jp/api/getweatherpoint/" + `${enc_place}`
    );

    const responseData = await response.text();
    console.log("\x1b[38;5;34m[getCityInfo] JSON GET \n\x1b[0m" + responseData);
    const data = JSON.parse(responseData);
    const resultParse = JSON.parse(data.result);
    if (Array.isArray(resultParse) && resultParse.length > 0) {
      const cityCode = Number(resultParse[0].city_code);
      const cityName = resultParse[0].name;
      console.log(`[getCityInfo] Zutool found cityCode: ${cityCode}, cityName: ${cityName}`);
      return { cityCode, cityName };
    }
    
    // Fallback to Open-Meteo Geocoding
    console.log(`[getCityInfo] Zutool returned no results. Checking Open-Meteo geocoding for: ${opt_place}`);
    const geo = await geocodeCity(opt_place);
    if (geo) {
      const cityCode = `om:${geo.lat},${geo.lon}`;
      const cityName = geo.name;
      console.log(`[getCityInfo] Open-Meteo found cityCode: ${cityCode}, cityName: ${cityName}`);
      return { cityCode, cityName };
    }
    
    console.log(`[getCityInfo] No city found via Zutool or Open-Meteo for: ${opt_place}`);
    return null;
  } catch (error) {
    console.warn("Zutool getCityInfo failed, attempting Open-Meteo geocoding fallback for:", opt_place);
    try {
      const geo = await geocodeCity(opt_place);
      if (geo) {
        return { cityCode: `om:${geo.lat},${geo.lon}`, cityName: geo.name };
      }
    } catch (e) {
      console.error("Both Zutool and Open-Meteo geocoding failed:", e);
    }
    return null;
  }
}

async function getCityCode(opt_place) {
  const info = await getCityInfo(opt_place);
  return info ? info.cityCode : -1;
}

module.exports.getCityCode = getCityCode;
module.exports.getCityInfo = getCityInfo;

