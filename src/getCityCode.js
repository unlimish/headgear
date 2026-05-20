async function getCityInfo(opt_place) {
  try {
    let enc_place = encodeURI(opt_place);
    console.log(`[getCityInfo] enc_place: ${enc_place}`);
    let response = await fetch(
      "https://zutool.jp/api/getweatherpoint/" + `${enc_place}`
    );

    const responseData = await response.text();
    console.log("\x1b[38;5;34m[getCityInfo] JSON GET \n\x1b[0m" + responseData);
    const data = JSON.parse(responseData);
    const resultParse = JSON.parse(data.result);
    if (!Array.isArray(resultParse) || resultParse.length === 0) {
      console.log(`[getCityInfo] No city found for: ${opt_place}`);
      return null;
    }
    const cityCode = Number(resultParse[0].city_code);
    const cityName = resultParse[0].name;
    console.log(`[getCityInfo] cityCode: ${cityCode}, cityName: ${cityName}`);
    return { cityCode, cityName };
  } catch (error) {
    console.error("Error in getCityInfo:", error);
    return null;
  }
}

async function getCityCode(opt_place) {
  const info = await getCityInfo(opt_place);
  return info ? info.cityCode : -1;
}

module.exports.getCityCode = getCityCode;
module.exports.getCityInfo = getCityInfo;

