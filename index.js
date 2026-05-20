const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`loaded: ${filePath}`);
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

const getJstHour = () => {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" });
  const localDate = new Date(dateStr);
  return localDate.getHours();
};

async function updatePressureActivity(client) {
  try {
    const placeId = config.placeId || 13209;
    const response = await fetch(`https://zutool.jp/api/getweatherstatus/${placeId}`);
    const data = await response.json();
    const jstHour = getJstHour();
    const entry = data.today.find((e) => Number(e.time) === jstHour);
    if (entry) {
      let pressureEmoji = "";
      switch (entry.pressure_level) {
        case "0":
        case "1":
          pressureEmoji = "🆗";
          break;
        case "2":
          pressureEmoji = "📉";
          break;
        case "3":
          pressureEmoji = "⚠️";
          break;
        case "4":
          pressureEmoji = "💣";
          break;
        default:
          pressureEmoji = "😇";
          break;
      }
      const activityName = `東京: ${entry.pressure} hPa ${pressureEmoji}`;
      client.user.setActivity({ name: activityName });
      console.log(`[Activity] Updated: ${activityName}`);
    }
  } catch (error) {
    console.error("[Activity] Failed to update pressure status:", error);
  }
}

client.on("ready", () => {
  updatePressureActivity(client);
  setInterval(() => {
    updatePressureActivity(client);
  }, 900000); // 15 mins
});

const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

client.login(token);
