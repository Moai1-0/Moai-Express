const err = require('http-errors');

const controller = {
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    }
};

module.exports = controller;