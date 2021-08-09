const err = require('http-errors');

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
                    `)
                    await connection.query(`
                        INSERT INTO user_sns_data(
                            id,

                        )
                    `)
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
            next(e)
        }
        
    }
};

module.exports = controller;