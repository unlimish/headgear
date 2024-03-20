const fetch = require("node-fetch");

async function getCityCode(opt_place) {
  try {
    const response = await fetch(
      `https://zutool.jp/api/getweatherpoint/${opt_place}`
    );
    const data = await response.json();
    const cityCode = data.city_code;
    return cityCode;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

module.exports = getCityCode;
