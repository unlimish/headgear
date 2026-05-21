const {
  Interaction,
  SlashCommandBuilder,
  spoiler,
  inlineCode,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ApplicationIntegrationType,
  InteractionContextType,
} = require("discord.js");
const config = require("../../config.json");
const { getCityCode } = require("../../src/getCityCode");
const { getUserCity } = require("../../src/userSettings");

const DATE_CONFIGS = [
  { value: "sl_yesterday", label: "昨日", apiField: "yesterday", englishLabel: "Yesterday" },
  { value: "sl_today", label: "今日", apiField: "today", englishLabel: "Today" },
  { value: "sl_tomorrow", label: "明日", apiField: "tommorow", englishLabel: "Tomorrow" },
  { value: "sl_da_tomorrow", label: "明後日", apiField: "dayaftertomorrow", englishLabel: "Day after tomorrow" }
];

const createButtonsRow = (currentValue, disabled = false) => {
  const row = new ActionRowBuilder();
  DATE_CONFIGS.forEach((cfg) => {
    const isCurrent = cfg.value === currentValue;
    const btn = new ButtonBuilder()
      .setCustomId(`zu2_${cfg.value}`)
      .setLabel(cfg.label)
      .setStyle(isCurrent ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(disabled);
    row.addComponents(btn);
  });
  return row;
};

const formatWeatherData = (data, selectedValue, isDefault) => {
  const cfg = DATE_CONFIGS.find(c => c.value === selectedValue) || DATE_CONFIGS[1];
  let filter = data[cfg.apiField] || [];
  let formattedWeather = "";

  if (isDefault) {
    formattedWeather += `# 🗼 ${cfg.englishLabel}\n\n`;
  } else {
    formattedWeather += `${spoiler(data.place_name)} (${cfg.englishLabel})\n\n`;
  }

  filter.forEach((entry) => {
    let pressureEmoji = "";
    switch (entry.pressure_level) {
      case "0":
      case "1":
        pressureEmoji = ":ok:";
        break;
      case "2":
        pressureEmoji = ":arrow_heading_down:";
        break;
      case "3":
        pressureEmoji = ":warning:";
        break;
      case "4":
        pressureEmoji = ":bomb:";
        break;
      default:
        pressureEmoji = ":innocent:";
        break;
    }

    let weatherEmoji = "";
    switch (entry.weather) {
      case "100":
        weatherEmoji = ":sunny:";
        break;
      case "200":
        weatherEmoji = ":cloud:";
        break;
      case "300":
        weatherEmoji = ":cloud_rain:";
        break;
      default:
        weatherEmoji = ":innocent:";
        break;
    }

    formattedWeather += `${inlineCode(
      String(entry.time).padStart(2, "0") + ":00"
    )} ${weatherEmoji} ${inlineCode(
      String(entry.temp).padStart(4, " ") + " °C"
    )} ${pressureEmoji} ${inlineCode(Number(entry.pressure).toFixed(1) + " hPa")}\n`;
  });

  return formattedWeather;
};

const handleWeatherCommand = async (interaction, opt_date, opt_place) => {
  let placeId = String(config.placeId);
  const saved = getUserCity(interaction.user.id);
  if (saved) {
    placeId = String(saved.cityCode);
  }

  if (opt_place) {
    const search_placeId = await getCityCode(opt_place);
    console.log("search_placeId: " + `${search_placeId}`);
    if (search_placeId != -1) placeId = String(search_placeId);
  }

  const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;
  const initialValue = opt_date || "sl_today";

  await interaction.deferReply({ ephemeral: false });
  try {
    const response = await fetch(apiUrl);
    const responseData = await response.text();
    const data = JSON.parse(responseData);

    const isDefault = !opt_place && !saved;

    const getResponsePayload = (selectedVal, disabled = false) => {
      const content = formatWeatherData(data, selectedVal, isDefault);
      const row = createButtonsRow(selectedVal, disabled);
      return {
        content,
        components: [row],
        ephemeral: false,
      };
    };

    let currentValue = initialValue;
    const initialPayload = getResponsePayload(currentValue);
    const replyMessage = await interaction.editReply(initialPayload);

    const collector = replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: "このボタンはコマンドを実行した本人だけが使用できます。",
          ephemeral: true,
        });
        return;
      }

      const matchedConfig = DATE_CONFIGS.find(cfg => `zu2_${cfg.value}` === i.customId);
      if (matchedConfig) {
        currentValue = matchedConfig.value;
      }

      const updatedPayload = getResponsePayload(currentValue);
      await i.update(updatedPayload);
    });

    collector.on("end", async () => {
      try {
        const disabledPayload = getResponsePayload(currentValue, true);
        await interaction.editReply(disabledPayload);
      } catch (err) {
        // Ignored if interaction was deleted or expired
      }
    });

  } catch (error) {
    console.error("Error fetching weather data:", error);
    try {
      await interaction.editReply({
        content: `Error fetching weather data: ${error}`,
        components: [],
        ephemeral: true,
      });
    } catch (err) {
      console.error("Failed to edit error reply:", err);
    }
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("zu2")
    .setDescription("Get info from Zutool.jp")
    .addStringOption((option) =>
      option
        .setName("city_name")
        .setDescription(
          "get API unique city number by inspecting official page"
        )
        .setMaxLength(2_000)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Default: Today")
        .addChoices(
          { name: "Yesterday", value: "sl_yesterday" },
          { name: "Today", value: "sl_today" },
          { name: "Tomorrow", value: "sl_tomorrow" },
          { name: "Day after tomorrow", value: "sl_da_tomorrow" }
        )
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),
  async execute(interaction, opt_date, opt_place) {
    opt_date = interaction.options.getString("date");
    opt_place = interaction.options.getString("city_name");
    await handleWeatherCommand(interaction, opt_date, opt_place);
  },
  DATE_CONFIGS,
  createButtonsRow,
  formatWeatherData,
};
