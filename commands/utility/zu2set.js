const { SlashCommandBuilder } = require("discord.js");
const { getCityInfo } = require("../../src/getCityCode");
const { setUserCity, clearUserCity } = require("../../src/userSettings");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("zu2set")
    .setDescription("Save or clear your default city for the /zu2 command")
    .addStringOption((option) =>
      option
        .setName("city_name")
        .setDescription("The city name to save (e.g. 東京, 大阪, 門真市). Leave empty to clear.")
        .setMaxLength(2_000)
    ),
  async execute(interaction) {
    const cityNameInput = interaction.options.getString("city_name");
    const userId = interaction.user.id;

    await interaction.deferReply({ ephemeral: true });

    if (!cityNameInput) {
      try {
        clearUserCity(userId);
        await interaction.editReply({
          content: "デフォルトの都市設定をクリアしました。今後はサーバーのデフォルト（東京等）が使用されます。",
          ephemeral: true,
        });
      } catch (error) {
        console.error("Error clearing city:", error);
        await interaction.editReply({
          content: "設定のクリア中にエラーが発生しました。",
          ephemeral: true,
        });
      }
      return;
    }

    try {
      const cityInfo = await getCityInfo(cityNameInput);
      if (!cityInfo) {
        await interaction.editReply({
          content: `都市「${cityNameInput}」が見つかりませんでした。正しい都市名を入力してください。`,
          ephemeral: true,
        });
        return;
      }

      setUserCity(userId, cityInfo.cityCode, cityInfo.cityName);
      await interaction.editReply({
        content: `デフォルトの都市を「**${cityInfo.cityName}**」(コード: ${cityInfo.cityCode}) に設定しました。`,
        ephemeral: true,
      });
    } catch (error) {
      console.error("Error setting city:", error);
      await interaction.editReply({
        content: "都市の設定中にエラーが発生しました。",
        ephemeral: true,
      });
    }
  },
};
