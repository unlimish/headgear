const { Interaction, SlashCommandBuilder } = require("discord.js");
const config = require("../../config.json");

const handleWeatherCommand = async (interaction) => {
  const placeId = config.placeId;
  const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;
  await interaction.deferReply();
  try {
    const time_start = Number("06");
    const end_time = Number("12");
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

      // if (time_start <= Number(entry.time) && Number(entry.time) <= end_time) {
      formattedWeather += `${entry.time}:00 ${entry.weather} ${entry.temp} ℃ ${pressureEmoji} ${entry.pressure} hPa\n`;
      console.log(formattedWeather);
      if (formattedWeather.length >= 1900) {
        interaction.followUp(`${formattedWeather}`);
        formattedWeather = "";
      }
      // }
    });
    await interaction.editReply(`${formattedWeather}`);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    await interaction.reply({
      content: `Error fetching weather data: ${error}`,
      ephemeral: true,
    });
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("zu2")
    .setDescription("Get info from Zutool.jp"),
  async execute(interaction) {
    await handleWeatherCommand(interaction);
  },
};
