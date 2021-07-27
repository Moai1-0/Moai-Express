const jwt = require('../utils/token');
const err = require('http-errors');

module.exports = {
    async checkSomething(req, res, next) {
        const { something } = req;
        try {
            next()
        } catch (e) {
            next(e)
        }
    }
}