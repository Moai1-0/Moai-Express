const axios = require('axios');
const queryString = require('query-string');
const err = require('http-errors');

const { auth, param, parser, condition } = require('../utils/params');
const { kakao } = require('../config');
const tp = require('../utils/mailer');
require('dotenv').config();
const { encodeToken } = require('../utils/token');
const { Users, User_sns_data, Shops, sequelize, Accounts } = require('../models');

const controller = {
    async main({ body }, res, next) {
        try {
            next({ message: "main" });
        } catch (e) {
            next(e);
        }
    },
    async main2({ body, query }, res, next) {
        try {
            console.log(body);
            const {
                profile: {
                    id,
                    properties: {
                        nickname
                    },
                    kakao_account: {
                        email
                    }

                }
            } = body;
            console.log(id, nickname, email);
            const user = await Users.findOne({
                include: [
                    {
                        model: User_sns_data,
                        as: "user_sns_data",
                        where: {
                            id,
                            type: 'kakao'
                        }
                    },
                ],
                where: {
                    enabled: 1,
                },
                raw: true
            });
            console.log(user);
            if (!user) {
                // 이름은 여기서 받지말고 추가정보에서 받아야할듯(바뀔 수 있으니까)
                const new_user = await Users.create({
                    name: nickname
                });
                await User_sns_data.create({
                    enabled: 1,
                    id,
                    user_no: new_user.dataValues.no,
                    type: "kakao"
                });
                await Point_accounts.create({
                    user_no: new_user.dataValues.no
                });
                next({
                    status: "no_account",
                    id,
                    nickname,
                    user_no
                });
            } else {
                const user_account = await Accounts.findOne({
                    where: {
                        user_no: user.no
                    }
                });
                if (!user_account) {
                    next({
                        status: "no_account",
                        id,
                        nickname,
                        user_no: user.no
                    });
                } else {
                    const token = encodeToken({
                        type: `user`,
                        user_no: user.no,
                    }, { expiresIn: '1d' });
                    next({
                        status: 'good',
                        token
                    });
                }
            }



            // const result = await axios.post(
            //     "https://kauth.kakao.com/oauth/token",
            //     qs.stringify({
            //         grant_type: "authorization_code",
            //         client_id: "fc4883d7d404fcbd055dfaec3e401957",
            //         redirect_uri: "http://localhost:8030/afterkakao",
            //         code: query.code
            //     }),
            //     {
            //         headers: {
            //             "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            //             "Authorization": `Bearer ${query.code}`
            //         }
            //     }
            // );
            // console.log(result);
            next({ message: "main" });
        } catch (e) {
            next(e);
        }
    },
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async checkKakao({ query, body }, { }, next) {
        try {
            // 임시 코드
            console.log('asdkasndkjanskjadlcasklcals');


            // const [result] = await pool.query(`
            //     SELECT
            //     COUNT(*) AS count
            //     FROM
            //     user_sns_data
            //     WHERE id = ?
            // `, [id]);
            // if (result[0].count < 1) {
            //     const connection = await pool.getConnection(async conn => await conn);
            //     try {
            //         const [result1] = await connection.query(`
            //             INSERT INTO users(
            //                 name,
            //                 phone
            //             )
            //         `);
            //         await connection.query(`
            //             INSERT INTO user_sns_data(
            //                 id,

            //             )
            //         `);
            //         await connection.commit();
            //         next({ message: "ping" });
            //     } catch (e) {
            //         await connection.rollback();
            //         next(e);
            //     } finally {
            //         connection.release();
            //     }
            // }
            next({ message: 'test' });
        } catch (e) {
            next(e);
        }

    },
    async getKakaoCodeFromCallback({ user, body }, { pool }, next) {
        try {
            const code = param(body, 'code');
            const { client_id, redirect_uri } = kakao;
            const data = {
                grant_type: 'authorization_code',
                code,
                client_id,
                redirect_uri
            }
            const options1 = {
                method: 'POST',
                url: `https://kauth.kakao.com/oauth/token`,      
                headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
                data: queryString.stringify(data),
            };

            const res1 = await axios(options1);
            const { access_token, refresh_token } = res1.data;

            const options2 = {
                method: 'GET',
                url: `https://kapi.kakao.com/v2/user/me`,      
                headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8', 'Authorization': `Bearer ${access_token}` },
            };

            const res2 = await axios(options2);
            
            const {
                id,
                properties: {
                    nickname
                },
                kakao_account: {
                    email
                }
            } = res2.data;

            const user = await Users.findOne({
                include: [
                    {
                        model: User_sns_data,
                        as: "user_sns_data",
                        where: {
                            id,
                            type: 'kakao'
                        }
                    },
                ],
                where: {
                    enabled: 1,
                },
                raw: true
            });

            if (!user) {
                next({
                    is_user: false,
                    id,
                    email,
                    nickname,
                });
            } else {
                next({
                    is_user: true,
                    id,
                    email,
                    nickname,
                });
            }
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