const { config, msg } = require('solapi');
require('dotenv').config();
// apiKey, apiSecret 설정 (설정하지 않으면 패키지 홈의 config.json 파일의 설정을 참고합니다.)
config.init({
    apiKey: process.env.SOLAPI_API_KEY,
    apiSecret: process.env.SOLAPI_API_SECRET_KEY
});

async function send(params = {}) {
    try {
        const result = await msg.send(params);
        console.log('RESULT:', result);
    } catch (e) {
        console.log('statusCode:', e.statusCode);
        console.log('errorCode:', e.error.errorCode);
        console.log('errorMessage:', e.error.errorMessage);
    }
}
module.exports = { send };
// send({
//     messages: [
//         {
//             to: '01000000001',
//             from: '029302266',
//             text: '한글 45자, 영자 90자 이하 입력되면 자동으로 SMS타입의 메시지가 발송됩니다.'
//         },
//         {
//             to: '01000000002',
//             from: '029302266',
//             text: '한글 45자, 영자 90자 이상 입력되면 자동으로 LMS타입의 문자메시지가 발송됩니다. 0123456789 ABCDEFGHIJKLMNOPQRSTUVWXYZ'
//         }

//         // ...
//         // 1만건까지 추가 가능
//     ]
// });