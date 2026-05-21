const { Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } = require("discord.js");
const { setUserCity, clearUserCity } = require("../src/userSettings");
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

        // Defer reply
        const isEphemeral = !interaction.inGuild();
        await interaction.deferReply({ ephemeral: isEphemeral });

        try {
          const targetUser = await interaction.client.users.fetch(targetUserId);
          let displayName = targetUser.displayName || targetUser.username;
          if (interaction.guild) {
            try {
              const targetMember = await interaction.guild.members.fetch(targetUserId);
              if (targetMember) {
                displayName = targetMember.displayName;
              }
            } catch (err) {
              // Ignore if fetching member fails or not in guild
            }
          }
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
            .setCustomId(`zu2_save_${targetUserId}_${cityInfo.cityCode}_${cityInfo.cityName}`)
            .setLabel(`この地域を @${displayName} の地域として保存`)
            .setStyle(ButtonStyle.Success);

          const saveRow = new ActionRowBuilder().addComponents(saveButton);

          const replyMessage = await interaction.editReply({
            content: `<@${targetUserId}> の地域の気圧予報\n${content}`,
            components: [dateRow, saveRow],
          });

          const collector = replyMessage.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            componentType: ComponentType.Button,
            time: 60000,
          });

          let currentValue = "sl_today";

          collector.on("collect", async (i) => {
            if (i.customId.startsWith("zu2_save_") || i.customId.startsWith("zu2_clear_")) return; // Handled globally

            const matchedConfig = DATE_CONFIGS.find(cfg => `zu2_${cfg.value}` === i.customId);
            if (matchedConfig) {
              currentValue = matchedConfig.value;
            }

            const updatedContent = formatWeatherData(data, currentValue, false);
            const updatedDateRow = createButtonsRow(currentValue, false);

            // Fetch the current message components to keep the second row intact
            const currentMessage = await interaction.channel.messages.fetch(replyMessage.id);
            const currentSaveRow = ActionRowBuilder.from(currentMessage.components[1]);

            await i.update({
              content: `<@${targetUserId}> の地域の気圧予報\n${updatedContent}`,
              components: [updatedDateRow, currentSaveRow],
            });
          });

          collector.on("end", async () => {
            try {
              const disabledDateRow = createButtonsRow(currentValue, true);
              const currentMessage = await interaction.channel.messages.fetch(replyMessage.id);
              const currentSecondRow = ActionRowBuilder.from(currentMessage.components[1]);
              // Disable the buttons in the second row
              currentSecondRow.components.forEach(btn => btn.setDisabled(true));

              await interaction.editReply({
                components: [disabledDateRow, currentSecondRow],
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
        const targetUserId = parts[2];
        const cityCode = parts[3];
        const cityName = parts.slice(4).join("_");

        const originalUser = interaction.message?.interaction?.user;
        const isOriginalSubmitter = originalUser && interaction.user.id === originalUser.id;

        if (interaction.user.id !== targetUserId && !isOriginalSubmitter) {
          await interaction.reply({
            content: `この操作は <@${targetUserId}> 本人、または予報を表示させたユーザーのみ実行できます。`,
            ephemeral: true,
          });
          return;
        }

        setUserCity(targetUserId, cityCode, cityName);

        const targetUser = await interaction.client.users.fetch(targetUserId);
        let targetDisplayName = targetUser.displayName || targetUser.username;
        if (interaction.guild) {
          try {
            const targetMember = await interaction.guild.members.fetch(targetUserId);
            if (targetMember) {
              targetDisplayName = targetMember.displayName;
            }
          } catch (err) {
            // Ignore
          }
        }

        // Update the button state to clear button in the message!
        const clearButton = new ButtonBuilder()
          .setCustomId(`zu2_clear_${targetUserId}`)
          .setLabel(`${targetDisplayName} の地域を解除`)
          .setStyle(ButtonStyle.Danger);

        const dateRow = ActionRowBuilder.from(interaction.message.components[0]);
        const clearRow = new ActionRowBuilder().addComponents(clearButton);

        await interaction.update({
          components: [dateRow, clearRow]
        });

        // Also send ephemeral success message
        await interaction.followUp({
          content: `デフォルトの都市を「**${cityName}**」(コード: ${cityCode}) に設定しました！`,
          ephemeral: true,
        });
        return;
      }

      if (interaction.customId.startsWith("zu2_clear_")) {
        const parts = interaction.customId.split("_");
        const targetUserId = parts[2];

        const originalUser = interaction.message?.interaction?.user;
        const isOriginalSubmitter = originalUser && interaction.user.id === originalUser.id;

        if (interaction.user.id !== targetUserId && !isOriginalSubmitter) {
          await interaction.reply({
            content: `この操作は <@${targetUserId}> 本人、または予報を表示させたユーザーのみ実行できます。`,
            ephemeral: true,
          });
          return;
        }

        clearUserCity(targetUserId);

        const targetUser = await interaction.client.users.fetch(targetUserId);
        let targetDisplayName = targetUser.displayName || targetUser.username;
        if (interaction.guild) {
          try {
            const targetMember = await interaction.guild.members.fetch(targetUserId);
            if (targetMember) {
              targetDisplayName = targetMember.displayName;
            }
          } catch (err) {
            // Ignore
          }
        }

        // Replace the clear button with a disabled button indicating it has been cleared
        const disabledButton = new ButtonBuilder()
          .setCustomId(`zu2_cleared_${targetUserId}`)
          .setLabel(`${targetDisplayName} の地域を解除しました`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const dateRow = ActionRowBuilder.from(interaction.message.components[0]);
        const disabledRow = new ActionRowBuilder().addComponents(disabledButton);

        await interaction.update({
          components: [dateRow, disabledRow]
        });

        // Also send ephemeral success message
        await interaction.followUp({
          content: "デフォルトの都市設定を解除しました。",
          ephemeral: true,
        });
        return;
      }
    }
  },
};
