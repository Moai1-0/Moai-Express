const err = require('http-errors');

const { auth, param, parser, condition } = require('../utils/params');
const tp = require('../utils/mailer');
const { Users, User_sns_data, Shops, sequelize, Accounts } = require('../models');

const controller = {
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async sendOpinion({ user, body }, { pool }, next) {
        try {
            const user_no = auth(user, "user_no");
            const title = param(body, "title");
            const content = param(body, "content");

            const sender = await Users.findOne({
                where: {
                    no: user_no,
                    enabled: 1,
                },
                attributes: [
                    'email',
                    'name',
                    'phone',
                    'created_datetime'
                ],
                raw: true
            });
            
            await tp.sendMail({
                from: `[의견보내기] <${sender.email}>`,
                to: `dbsdudxor121@naver.com`,
                subject: `${title}`,
                text: `${content}`,
            });

            next({ message: `등록되었습니다.` });
        } catch (e) {
            next(e);
        }
    },
};

module.exports = controller;