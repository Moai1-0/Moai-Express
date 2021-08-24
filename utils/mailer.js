const nodemailer = require('nodemailer');
require('dotenv').config();
let transporter = nodemailer.createTransport({
    // 사용하고자 하는 서비스, gmail계정으로 전송할 예정이기에 'gmail'
    service: 'gmail',
    // host를 gmail로 설정
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        // Gmail 주소 입력, 'testmail@gmail.com'
        user: process.env.NODEMAILER_USER,
        // Gmail 패스워드 입력
        pass: process.env.NODEMAILER_PASS,
    },
});
const sendEmail = async () => {
    await transporter.sendMail({
        //보내는 곳의 이름과, 메일 주소를 입력
        from: `"WDMA Team" <${process.env.NODEMAILER_USER}>`,
        // 받는 곳의 메일 주소를 입력
        to: process.env.NODEMAILER_USER,
        // 보내는 메일의 제목을 입력
        subject: 'WDMA Auth Number',
        // 보내는 메일의 내용을 입력
        // text: 일반 text로 작성된 내용
        // html: html로 작성된 내용
        text: 'asdasdasd',
        html: `<b>${"asdasdasd"}</b>`,
    });
};
module.exports = transporter;