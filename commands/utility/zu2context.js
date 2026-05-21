const {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ComponentType,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const { getUserCity } = require("../../src/userSettings");

module.exports = {
  data: new ContextMenuCommandBuilder()
    .setName("気圧の表示")
    .setType(ApplicationCommandType.User)
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
  async execute(interaction) {
    const targetUser = interaction.targetUser;
    const saved = getUserCity(targetUser.id);

    if (!saved) {
      // If the target user has no saved city, show a modal to the caller
      const modal = new ModalBuilder()
        .setCustomId(`zu2_modal_${targetUser.id}`)
        .setTitle(`気圧表示: ${targetUser.username}`);

      const cityInput = new TextInputBuilder()
        .setCustomId("city_input")
        .setLabel("地域名を入力してください（例: 大阪市, 横浜市）")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const actionRow = new ActionRowBuilder().addComponents(cityInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
      return;
    }

    // If the target user has a saved city, fetch and display publicly!
    await interaction.deferReply({ ephemeral: false });

    try {
      const response = await fetch(`https://zutool.jp/api/getweatherstatus/${saved.cityCode}`);
      const responseData = await response.text();
      const data = JSON.parse(responseData);

      const zu2Command = interaction.client.commands.get("zu2");
      if (!zu2Command) {
        await interaction.editReply({ content: "コマンド情報の取得に失敗しました。" });
        return;
      }

      const { formatWeatherData, createButtonsRow, DATE_CONFIGS } = zu2Command;

      const content = formatWeatherData(data, "sl_today", false);
      const dateRow = createButtonsRow("sl_today", false);

      const replyMessage = await interaction.editReply({
        content: `<@${targetUser.id}> の地域の気圧予報（登録地: ${saved.cityName}）\n${content}`,
        components: [dateRow],
      });

      const collector = replyMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 60000,
      });

      let currentValue = "sl_today";

      collector.on("collect", async (i) => {
        const matchedConfig = DATE_CONFIGS.find(cfg => `zu2_${cfg.value}` === i.customId);
        if (matchedConfig) {
          currentValue = matchedConfig.value;
        }

        const updatedContent = formatWeatherData(data, currentValue, false);
        const updatedDateRow = createButtonsRow(currentValue, false);

        await i.update({
          content: `<@${targetUser.id}> の地域の気圧予報（登録地: ${saved.cityName}）\n${updatedContent}`,
          components: [updatedDateRow],
        });
      });

      collector.on("end", async () => {
        try {
          const disabledDateRow = createButtonsRow(currentValue, true);
          await interaction.editReply({
            components: [disabledDateRow],
          });
        } catch (err) {
          // Ignored
        }
      });

    } catch (error) {
      console.error("Error fetching weather for context menu target:", error);
      await interaction.editReply({
        content: `気圧データの取得中にエラーが発生しました: ${error.message}`,
      });
    }
  },
};
