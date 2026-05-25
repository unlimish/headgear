const { SlashCommandBuilder } = require("discord.js");
const { version } = require("../../package.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Shows the bot's GitHub repository and version."),
  async execute(interaction) {
    await interaction.reply(
      `# Headgear \n > 頭痛予報bot \n ## Version \n > v${version} \n ## GitHub \n > https://github.com/unlimish/headgear`
    );
  },
};
