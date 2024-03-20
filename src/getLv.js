export const getPressureLv = async (currentTime) => {
  const placeId = config.placeId;
  const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;
  try {
    const response = await fetch(apiUrl);
    const responseData = await response.text();
    const data = JSON.parse(responseData);
    let formattedWeather = "";
    data.today.forEach((entry) => {
      let pressureEmoji = "";
      switch (entry.pressure_level) {
        case "0":
        case "1":
          pressureEmoji = ":ok:";
          break;
        case "2":
          pressureEmoji = ":arrow_heading_down:";
          break;
        case "3":
          pressureEmoji = ":warning:";
          break;
        case "4":
          pressureEmoji = ":bomb:";
          break;
        default:
          pressureEmoji = ":innocent:";
          break;
      }

      switch (entry.weather) {
        case "100":
          entry.weather = ":sunny:";
          break;
        case "200":
          entry.weather = ":cloud:";
          break;
        case "300":
          entry.weather = ":cloud_rain:";
          break;
        default:
          entry.weather = ":innocent:";
          break;
      }

      if (currentTime == Number(entry.time)) {
        // if (time_start <= Number(entry.time) && Number(entry.time) <= end_time) {
        currentWeather += `${entry.weather} ${entry.temp} ℃ ${pressureEmoji} ${entry.pressure} hPa\n`;
        console.log(currentWeather);
        return (currentWeather);
    };
  } catch (error) {
    console.error("Error fetching weather data:", error);
    await interaction.reply({
      content: `Error fetching weather data: ${error}`,
      ephemeral: true,
    });
  }
};
