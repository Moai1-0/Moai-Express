const err = require('http-errors');
const { param } = require('../utils/params');

const controller = {
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async uploadProduct({ body, files }, { pool }, next) {
        try {
            const shop_no = param(body, "shop_no");
            const name = param(body, "name");
            const description = param(body, "description");
            const expected_quantity = param(body, "expected_quantity");
            const actual_quantity = param(body, "actual_quantity");
            const rest_quantity = expected_quantity;
            const regular_price = param(body, "regular_price");
            const discounted_price = param(body, "discounted_price");
            const return_price = param(body, "return_price");
            const expiry_datetime = param(body, "expiry_datetime");
            const pickup_datetime = param(body, "pickup_datetime");


            console.log(body);
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async signin(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
};

module.exports = controller;