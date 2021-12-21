const nodemailer = require('nodemailer');
const admins = require('../config/mailAddress.json')["admins"].join(', ');
const developers = require('../config/mailAddress.json')["developers"].join(', ');
const err = require('http-errors');

require('dotenv').config();

const mailer = {
    async sendMailToAdmins(param) {
        try {
            const { subject, text } = param;

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.NODEMAILER_USER,
                    pass: process.env.NODEMAILER_PASS,
                },
            });

            const options = {
                from: '어비',
                to: admins,
                subject,
                text
            };

            try {
                await transporter.sendMail(options);
            } catch (e) {
                throw err(400);
            }
            return 's';
        } catch (e) {
            return null;
        }

    },
    async sendMailToDevelopers(param) {
        try {
            const { subject, text } = param;

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.NODEMAILER_USER,
                    pass: process.env.NODEMAILER_PASS,
                },
            });

            const options = {
                from: '어비',
                to: developers,
                subject,
                text
            };

            try {
                await transporter.sendMail(options);
            } catch (e) {
                throw err(400);
            }
            return 's';
        } catch (e) {
            return null;
        }

    },
    async sendMail() {
        try {
            const { receiver, subject, text } = param;

            let transporter = nodemailer.createTransport({
                service: 'gmail',
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                auth: {
                    user: process.env.NODEMAILER_USER,
                    pass: process.env.NODEMAILER_PASS,
                },
            });

            const options = {
                from: '어비',
                to: receiver,
                subject,
                text
            };

            try {
                await transporter.sendMail(options);
            } catch (e) {
                throw err(400);
            }
        } catch (e) {
            return null;
        }
    }
};

module.exports = mailer;