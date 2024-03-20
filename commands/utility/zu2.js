const {
  Interaction,
  SlashCommandBuilder,
  spoiler,
  inlineCode,
} = require("discord.js");
const config = require("../../config.json");
const { getCityCode } = require("../../src/getCityCode");

let placeId = config.placeId;

const handleWeatherCommand = async (interaction, opt_date, opt_place) => {
  if (opt_place) {
    search_placeId = await getCityCode(opt_place);
    console.log("serarch_placeId: " + `${search_placeId}`);
    if (search_placeId != -1) placeId = String(search_placeId);
  }

  const apiUrl = `https://zutool.jp/api/getweatherstatus/${placeId}`;
  let date = "Today";
  await interaction.deferReply({ ephemeral: true });
  try {
    const response = await fetch(apiUrl);
    const responseData = await response.text();
    const data = JSON.parse(responseData);
    let formattedWeather = "";
    let filter = data.today;
    if (opt_date) {
      switch (opt_date) {
        case "sl_yesterday":
          filter = data.yesterday;
          date = "Yesterday";
          break;
        case "sl_today":
          filter = data.today;
          date = "Today";
          break;
        case "sl_tomorrow":
          filter = data.tommorow;
          date = "Tomorrow";
          break;
        case "sl_da_tomorrow":
          filter = data.dayaftertomorrow;
          date = "Day after tomorrow";
          break;
        default:
          filter = data.today;
          date = "Today";
      }
    }
    if (!opt_place && !opt_date) {
      formattedWeather += `# 🗼 ${date}\n\n`;
    } else {
      formattedWeather += `${spoiler(data.place_name)} (${date})\n\n`;
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

      switch (entry.weather) {
        case "100":
          entry.weather = ":sunny:";
          break;
        case "200":
          entry.weather = ":cloud:";
          break;
        case "300":
          entry.weather = ":cloud_rain:";
          break;
        default:
          entry.weather = ":innocent:";
          break;
      }

      // if (time_start <= Number(entry.time) && Number(entry.time) <= end_time) {
      formattedWeather += `${inlineCode(
        String(entry.time).padStart(2, "0") + ":00"
      )} ${entry.weather} ${inlineCode(
        String(entry.temp).padStart(4, " ") + " °C"
      )} ${pressureEmoji} ${inlineCode(entry.pressure + " hPa")}\n`;
      // console.log(formattedWeather);
      // if (formattedWeather.length >= 1900) {
      //   interaction.followUp(`${formattedWeather}`);
      //   formattedWeather = "";
      // }
      // }
    });
    await interaction.editReply({
      content: `${formattedWeather}`,
      ephemeral: true,
    });
  } catch (error) {
    console.error("Error fetching weather data:", error);
    await interaction.reply({
      content: `Error fetching weather data: ${error}`,
      ephemeral: true,
    });
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
    ),
  async execute(interaction, opt_date, opt_place) {
    opt_date = interaction.options.getString("date");
    opt_place = interaction.options.getString("city_name");
    await handleWeatherCommand(interaction, opt_date, opt_place);
  },
};
