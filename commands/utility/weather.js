const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Get the current weather"),
  async execute(interaction) {
    await interaction.reply(
      "uwu ${interaction.guild.name} ${interaction.guild.memberCount}"
    );
  },
};
