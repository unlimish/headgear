const { Events } = require("discord.js");
const { execute } = require("../commands/utility/weather");

module.exports = {
  name: Events.ClietnReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);
  },
};
