const { config, msg, Group } = require('solapi');
const solapiConfig = require('../config').solapi;
// apiKey, apiSecret 설정 (설정하지 않으면 패키지 홈의 config.json 파일의 설정을 참고합니다.)
config.init({ ...solapiConfig });

async function send(params = {}) {
  try {
    const result = await msg.send(params);
    // console.log('RESULT:', result);
    return result;
  } catch (e) {
    // console.log('statusCode:', e.statusCode);
    // console.log('errorCode:', e.error.errorCode);
    console.log('errorMessage:', e.error.errorMessage);
    return e;
  }
}

async function sendKakaoMessage(message, agent = {}) {
  try {
    await Group.sendSimpleMessage(message, agent);
  } catch (e) {
    // console.log('statusCode:', e.statusCode);
    // console.log('errorCode:', e.error.errorCode);
    console.log('errorMessage:', e.error.errorMessage);
    return null;
  }
}

module.exports = { send, sendKakaoMessage };