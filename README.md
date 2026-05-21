![headgear](https://github.com/user-attachments/assets/64b8734b-6df8-4d37-b3fe-efeb8e5275f1)

<a href="https://discord.com/oauth2/authorize?client_id=1219698709978153111">
<img src="https://github.com/unlimish/headgear/assets/14168376/82679c7a-0d86-4d68-8b46-bff0dac5dccb" height="75px"></a>

**headgear** is a modern Discord bot designed to check atmospheric pressure forecasts in Japan. It helps users manage and predict weather-related headaches (meteopathy) by fetching real-time data from [Zutool (ずつーる)](https://zutool.jp).

---

## Key Features

* **Real-time Pressure Forecasts**: Quickly retrieve hourly atmospheric pressure forecasts for cities across Japan with clear indicators (Ok, Down, Warning, Bomb).
* **User Installable App Support (Discord My Apps)**: Add the bot directly to your Discord account. You can use it across any server, DM, or group chat without needing the server administrator to install it.
* **Interactive Context Menu Integration**: Right-click on any server member or friend, navigate to **Apps** -> **Show Pressure (気圧の表示)** to quickly see their local pressure forecast. If they have not set their city yet, a prompt modal will guide them to set it.
* **Dynamic Status Update (Every 15 minutes)**: The bot automatically updates its status and presence (online status and custom activity) to reflect the nearest hourly pressure forecast (e.g., 1007.6 hPa, along with status indicators).

---

## Slash Commands and Context Menus

| Name | Type | Description |
| :--- | :--- | :--- |
| `/zu2 [city_name] [date]` | Slash Command | Fetches the weather and pressure forecast. You can click interactive buttons to toggle between Yesterday, Today, Tomorrow, and Day after tomorrow. |
| `/zu2set [city_name]` | Slash Command | Saves your default city for the `/zu2` command. Run it without arguments to clear your settings. |
| Show Pressure (気圧の表示) | User Context Menu | Right-click a user -> **Apps** -> **気圧の表示** to see their registered city's forecast. |

---

## Configuration

Create a `config.json` file in the root directory before launching the bot:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_DISCORD_APPLICATION_CLIENT_ID",
  "guildId": "YOUR_DEVELOPMENT_SERVER_ID",
  "placeId": 13209
}
```

### Parameter Details:
* `token`: Your Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications).
* `clientId`: Your Discord Application Client ID.
* `guildId`: The ID of your test server (used for registering slash commands locally during development).
* `placeId`: The default city code for the bot's custom status (JST-based status update). You can find city codes by querying the Zutool search API: `https://zutool.jp/api/getweatherpoint/YOUR_CITY_NAME_IN_JAPANESE`

---

## How to Run

### Option 1: Running Locally (Node.js)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Deploy application commands to Discord**:
   ```bash
   npm run deploy
   ```
3. **Start the bot**:
   ```bash
   npm run start
   ```

### Option 2: Running with Docker (Recommended)

Start the bot in the background using Docker Compose:
```bash
docker compose up -d --build
```

---

## Legal Documents

These documents are hosted on GitHub Pages:
* [Terms of Service](https://unlimish.github.io/headgear/TERMS_OF_SERVICE.html) (利用規約)
* [Privacy Policy](https://unlimish.github.io/headgear/PRIVACY_POLICY.html) (プライバシーポリシー)

---

## 日本語クイックスタート (Quick Start in Japanese)

**headgear** は、頭痛や気象病の原因となる気圧の変化を Discord 上で素早く確認できるボットです。

### 主な機能
1. **ユーザーインストール対応**: 「マイアプリ」として個人アカウントに追加することで、ボットが導入されていないサーバーやDMでも `/zu2` コマンドを使用可能。
2. **コンテキストメニュー**: ユーザーを右クリック -> 「アプリ」 -> 「気圧の表示」から、そのユーザーの地域の気圧予報を簡単に確認可能。
3. **ステータス自動更新**: ボットアカウントのステータス（オンライン状態とカスタムステータス）が15分ごとに自動更新され、登録地域の現在の気圧と警戒度（OK、注意、警戒、爆弾）が表示されます。

### コマンド
* `/zu2 [都市名] [日付]`: 指定した都市の気圧予報を表示します。
* `/zu2set [都市名]`: 自分のデフォルトの都市を保存します（引数なしでクリア）。
* 右クリック -> アプリ -> 「気圧の表示」: 選択したユーザーの登録都市の気圧を表示します（未登録の場合は登録用の入力画面が表示されます）。


