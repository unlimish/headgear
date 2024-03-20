async function getCityCode(opt_place) {
  try {
    let enc_place = encodeURI(opt_place);
    console.log(`[getCityCode] enc_place: ${enc_place}`);
    let response = await fetch(
      "https://zutool.jp/api/getweatherpoint/" + `${enc_place}`
    );

    const responseData = await response.text();
    console.log("\x1b[38;5;34m[getCityCode] JSON GET \n\x1b[0m" + responseData);
    const data = JSON.parse(responseData);
    const resultParse = JSON.parse(data.result);
    const cityCode = resultParse[0].city_code;
    console.log(`[getCityCode] cityCode: ${cityCode}`);
    return Number(cityCode);
  } catch (error) {
    console.error("Error:", error);
    return -1;
  }
}

module.exports.getCityCode = getCityCode;
