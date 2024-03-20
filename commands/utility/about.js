const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("about")
    .setDescription("Shows the bot's GitHub repository."),
  async execute(interaction) {
    await interaction.reply(
      `# Headgear \n > 頭痛予報bot \n ## GitHub \n > https://github.com/unlimish/headgear`
    );
  },
};
