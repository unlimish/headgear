import { Client, Intents, Interaction } from "discord.js";
import fetch from "node-fetch";
import * as config from "./config.json";

const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

client.once("ready", () => {
  console.log(`Logged in as ${client.user!.tag}!`);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "weather") {
    const placeId = config.placeId;
    const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;

    try {
      const response = await fetch(apiUrl);
      const data = await response.json();

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
  }
});

client.login(config.token);
