const err = require('http-errors');
const dayjs = require('dayjs');
const { auth, param, parser, condition } = require('../utils/params');
require('dayjs/locale/ko');
dayjs.locale('ko');

const PAGINATION_COUNT = 10;

const controller = {
    async getProducts ({ query }, { pool }, next) {
        try {
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;
            const [ results ] = await pool.query(`
                SELECT
                COUNT(*) AS total_count
                FROM products AS p
                WHERE p.enabled=1;

                SELECT
                p.no AS product_no,
                i.path,
                p.shop_no,
                s.name AS shop_name,
                p.name AS prduct_name,
                p.rest_quantity,
                p.regular_price,
                p.discounted_price,
                p.expiry_datetime
                FROM products AS p
                JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                JOIN shops AS s
                ON p.shop_no = s.no
                WHERE p.enabled = 1
                ORDER BY p.created_datetime
                LIMIT ? OFFSET ?;
            `, [ count, offset ]);
            next({
                total_count: results[0][0].total_count,
                products: results[1].map((product) => ({
                    ...product,
                    discount_rate: product.discounted_price / product.regular_price * 100,
                    expiry_datetime: dayjs(product.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                    impending: dayjs(product.expiry_datetime).diff(dayjs(), 'hour') < 1 ? true : false
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getProduct({ query }, { pool }, next) {
        try {
            const product_no = param(query, 'product_no');
            const [ result ] = await pool.query(`
                SELECT
                p.no AS product_no,
                i.paths,
                p.name AS prduct_name,
                p.shop_no,
                s.name AS shop_name,
                s.tel,
                p.expected_quantity,
                p.rest_quantity,
                p.regular_price,
                p.discounted_price,
                p.return_price,
                p.description,
                p.expiry_datetime,
                p.pickup_datetime
                FROM products AS p
                LEFT JOIN (
                    SELECT
                    product_no,
                    GROUP_CONCAT(path) AS paths
                    FROM product_images
                    WHERE enabled = 1
                    AND product_no = ?
                    GROUP BY product_no
                    ORDER BY sort ASC
                ) AS i
                ON p.no = i.product_no
                JOIN shops AS s
                ON p.shop_no = s.no
                WHERE p.enabled = 1
                AND s.enabled = 1
                AND p.no = ?;
            `, [ product_no, product_no ]);
            next({
                ...result[0],
                paths: result[0].paths.split(','),
                discount_rate: result[0].discounted_price / result[0].regular_price * 100,
                expiry_datetime: dayjs(result[0].expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                pickup_datetime: dayjs(result[0].pickup_datetime).format(`M월 D일(ddd) a h시 m분`),
                impending: dayjs(result[0].expiry_datetime).diff(dayjs(), 'hour') < 1 ? true : false
            });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = controller;