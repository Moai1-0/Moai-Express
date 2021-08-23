const axios = require('axios');
const queryString = require('query-string');
const err = require('http-errors');
const { param } = require('../utils/params');
const { kakao } = require('../config');

const controller = {
    async main(req, res, next) {
        try {
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
    async signupWithKakao({ user }, { pool }, next) {
        try {
            // 임시 코드
            const { profile, accessToken, refreshToken } = user;
            const {
                provider,
                id,
                username,
                displayName,
                _json: {
                    properties: {
                        nickname
                    },
                    kakao_account: {
                        email
                    }
                }
            } = profile;
            console.log(profile);
            console.log(provider, id, username, nickname, email);

            const [result] = await pool.query(`
                SELECT
                COUNT(*) AS count
                FROM
                user_sns_data
                WHERE id = ?
            `, [id]);
            if (result[0].count < 1) {
                const connection = await pool.getConnection(async conn => await conn);
                try {
                    const [result1] = await connection.query(`
                        INSERT INTO users(
                            name,
                            phone
                        )
                    `);
                    await connection.query(`
                        INSERT INTO user_sns_data(
                            id,

                        )
                    `);
                    await connection.commit();
                    next({ message: "ping" });
                } catch (e) {
                    await connection.rollback();
                    next(e);
                } finally {
                    connection.release();
                }
            }
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
            console.log(res2.data);

            next({ access_token, refresh_token });
        } catch (e) {
            next(e);
        }
    },
};

module.exports = controller;