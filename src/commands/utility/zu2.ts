import { Interaction } from "discord.js";
import * as config from "../../../config.json";

const handleWeatherCommand = async (interaction: Interaction) => {
  const placeId = config.placeId;
  const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;
  try {
    const fetch = await import("node-fetch");
    const response = await fetch.default(apiUrl);
    const responseData = await response.text();
    const data = JSON.parse(responseData);
    console.log(data);
    let formattedWeather = "";
    data.yesterday.forEach((entry: any) => {
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
          pressureEmoji = "";
          break;
      }
      formattedWeather += `**Time**: ${entry.time}:00\n`;
      formattedWeather += `**Weather**: ${entry.weather}\n`;
      formattedWeather += `**Pressure Level**: ${pressureEmoji}\n`;
      formattedWeather += `**Pressure**: ${entry.pressure} hPa\n\n`;
    });
    await interaction.reply({
      content: formattedWeather,
      allowedMentions: { repliedUser: false },
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    await interaction.reply("Error fetching weather data: $error");
  }
};

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === "weather") {
    await handleWeatherCommand(interaction);
  }
});

module.exports = {
  data: new SlashCommandBuilder()
    .setName("zu2")
    .setDescription("Get info from Zutool.jp"),
  async execute(interaction) {
    await handleWeatherCommand(interaction);
  },
};
