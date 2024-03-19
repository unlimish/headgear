import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  Interaction,
} from "discord.js";
import * as config from "../config.json";
import fs from "node:fs";
import path from "node:path";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const folderPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(folderPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".ts"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
    } else {
      console.log(
        `{WARN} The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}
client.once("ready", () => {
  console.log(`Logged in as ${client.user!.tag}!`);
});

client.on("interactionCreate", async (interaction: Interaction) => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === "weather") {
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
  }
});

client.login(config.token);
