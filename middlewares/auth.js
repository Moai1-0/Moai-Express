const err = require('http-errors');
const { encodeToken, decodeToken, getToken } = require('../utils/token');
const { auth, } = require('../utils/params');

module.exports = {
    async checkShop(req, { pool }, next) {
        try {
            const authorization = req.headers.authorization;
            if (authorization === undefined || authorization === null) throw err.Unauthorized("authorization 비어있음");
            const decoded = decodeToken(getToken(authorization));
            if (decoded == null) throw err.Unauthorized('토큰 만료');
            const [result] = await pool.query(`
                SELECT *
                FROM shops
                WHERE no = ?
                AND enabled = 1
            `, [decoded.shop_no]);

            if (result.length < 1) throw err.Unauthorized('디비에 shop없음');
            req.shop = { shop_no: decoded.shop_no };
            next();
        } catch (e) {
            next(e);
        }
    },
    async checkUser(req, { pool }, next) {
        try {
            const authorization = req.headers.authorization;
            if (authorization === undefined || authorization === null) throw err.Unauthorized("authorization 비어있음");
            const decoded = decodeToken(getToken(authorization));
            if (decoded == null) throw err.Unauthorized('토큰 만료');
            const [result] = await pool.query(`
                SELECT *
                FROM users
                WHERE no = ?
                AND enabled = 1
            `, [decoded.user_no]);

            if (result.length < 1) throw err.Unauthorized('디비에 user없음');
            req.user = { user_no: decoded.user_no };
            next();
        } catch (e) {
            next(e);
        }
    },
    async checkAdmin(req, { pool }, next) {
        try {
            const authorization = req.headers.authorization;
            if (authorization === undefined || authorization === null) throw err.Unauthorized("authorization 비어있음");
            const decoded = decodeToken(getToken(authorization));
            if (decoded == null) throw err.Unauthorized('토큰 만료');
            const [result] = await pool.query(`
                SELECT *
                FROM admins
                WHERE no = ?
                AND enabled = 1
            `, [decoded.admin_no]);

            if (result.length < 1) throw err.Unauthorized('디비에 user없음');
            req.admin = { admin_no: decoded.admin_no };
            next();
        } catch (e) {
            next(e);
        }
    }
};