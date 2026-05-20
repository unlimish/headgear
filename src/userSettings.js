const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../data");
const SETTINGS_FILE = path.join(DATA_DIR, "user_cities.json");

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}), "utf8");
  }
}

function loadSettings() {
  try {
    ensureDataFile();
    const data = fs.readFileSync(SETTINGS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading user settings:", error);
    return {};
  }
}

function saveSettings(settings) {
  try {
    ensureDataFile();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error saving user settings:", error);
    return false;
  }
}

function getUserCity(userId) {
  const settings = loadSettings();
  return settings[userId] || null;
}

function setUserCity(userId, cityCode, cityName) {
  const settings = loadSettings();
  settings[userId] = { cityCode, cityName };
  return saveSettings(settings);
}

function clearUserCity(userId) {
  const settings = loadSettings();
  if (settings[userId]) {
    delete settings[userId];
    return saveSettings(settings);
  }
  return true;
}

module.exports = {
  getUserCity,
  setUserCity,
  clearUserCity,
};
