const { WebClient } = require("@slack/web-api");
require('dotenv').config();

const TOKEN = process.env.SLACK_TOKEN
const client = new WebClient(TOKEN);

async function sendSlack(message) {
    try {
        await client.chat.postMessage({
          channel: "#모아이-mvp",
          text: message,
        })
        .then((res) => console.log(res));
    } catch (error) {
      console.log(error);
    }
}

module.exports = { sendSlack }









