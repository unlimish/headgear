const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");
const { setUserCity } = require("../src/userSettings");
const { getCityInfo } = require("../src/getCityCode");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        const errorMsg = "コマンドの実行中にエラーが発生しました。";
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: errorMsg,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: errorMsg,
            ephemeral: true,
          });
        }
      }
      return;
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("zu2_modal_")) {
        const targetUserId = interaction.customId.replace("zu2_modal_", "");
        const cityNameInput = interaction.fields.getTextInputValue("city_input");

        // Defer reply (publicly!)
        await interaction.deferReply({ ephemeral: false });

        try {
          const cityInfo = await getCityInfo(cityNameInput);
          if (!cityInfo) {
            await interaction.editReply({
              content: `都市「${cityNameInput}」が見つかりませんでした。正しい都市名を入力してください。`,
            });
            return;
          }

          // Fetch weather
          const response = await fetch(`https://zutool.jp/api/getweatherstatus/${cityInfo.cityCode}`);
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

          const saveButton = new ButtonBuilder()
            .setCustomId(`zu2_save_${cityInfo.cityCode}_${cityInfo.cityName}`)
            .setLabel("この地域をマイ地域に保存")
            .setStyle(ButtonStyle.Success);

          const saveRow = new ActionRowBuilder().addComponents(saveButton);

          const replyMessage = await interaction.editReply({
            content: `<@${targetUserId}> の地域の気圧予報（仮設定: ${cityInfo.cityName}）\n${content}`,
            components: [dateRow, saveRow],
          });

          const collector = replyMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: 60000,
          });

          let currentValue = "sl_today";

          collector.on("collect", async (i) => {
            if (i.customId.startsWith("zu2_save_")) return; // Handled globally by the next block

            const matchedConfig = DATE_CONFIGS.find(cfg => `zu2_${cfg.value}` === i.customId);
            if (matchedConfig) {
              currentValue = matchedConfig.value;
            }

            const updatedContent = formatWeatherData(data, currentValue, false);
            const updatedDateRow = createButtonsRow(currentValue, false);

            await i.update({
              content: `<@${targetUserId}> の地域の気圧予報（仮設定: ${cityInfo.cityName}）\n${updatedContent}`,
              components: [updatedDateRow, saveRow],
            });
          });

          collector.on("end", async () => {
            try {
              const disabledDateRow = createButtonsRow(currentValue, true);
              const disabledSaveButton = ButtonBuilder.from(saveButton).setDisabled(true);
              const disabledSaveRow = new ActionRowBuilder().addComponents(disabledSaveButton);
              await interaction.editReply({
                components: [disabledDateRow, disabledSaveRow],
              });
            } catch (err) {
              // Ignored
            }
          });

        } catch (error) {
          console.error("Error processing modal weather data:", error);
          await interaction.editReply({
            content: `気圧データの取得中にエラーが発生しました: ${error.message}`,
          });
        }
      }
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("zu2_save_")) {
        const parts = interaction.customId.split("_");
        const cityCode = parts[2];
        const cityName = parts.slice(3).join("_");

        setUserCity(interaction.user.id, cityCode, cityName);

        await interaction.reply({
          content: `デフォルトの都市を「**${cityName}**」(コード: ${cityCode}) に設定しました！`,
          ephemeral: true,
        });
      }
    }
  },
};
