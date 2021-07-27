const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = {
    encodeToken(payload, options) {
        if (options === undefined || options === null) {
            return jwt.sign(payload, config.jwt.secretKey, { algorithm: config.jwt.algorithm, issuer: config.jwt.issuer });
        }
        else return jwt.sign(payload, config.jwt.secretKey, { ...options, algorithm: config.jwt.algorithm, issuer: config.jwt.issuer });
    },
    decodeToken(token) {
        try {
            return jwt.verify(token, config.jwt.secretKey);
        } catch (e) {
            return null;
        }
    },
    getToken(auth) {
        try {
            const array = auth.split(' ');
            if (array.length == 1) {
                return array[0];
            } else if (array.length == 2) {
                return array[1];
            }
        } catch(e) {
            return '';
        }
    },
    bearer(token) {
        return `Bearer ${token}`;
    }
}