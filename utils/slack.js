const { WebClient } = require("@slack/web-api");
require('dotenv').config();

const TOKEN = process.env.SLACK_TOKEN;
const client = new WebClient(TOKEN);

async function sendSlack(message, channel) {
  try {
    await client.chat.postMessage({
      channel: channel,
      text: message,
    });
  } catch (error) {
    console.log(error);
  }
}

module.exports = { sendSlack };









