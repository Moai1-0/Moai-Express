const err = require('http-errors');
const url = require('url');
const qs = require('querystring');
const axios = require('axios');
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

    }
};

module.exports = controller;