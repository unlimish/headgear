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

client.login(config.token);
