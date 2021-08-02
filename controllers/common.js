const err = require('http-errors');

const controller = {
    async main (req, res, next) {
        try {
            next({ message: "main" });
        } catch (e) {
            next(e);
        }
    },
    async ping (req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = controller;