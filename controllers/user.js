const err = require('http-errors');
const dayjs = require('dayjs');
require('dayjs/locale/ko');
dayjs.locale('ko');
const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');

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
    },
    async reserveProduct({ body }, { pool }, next) {
        try {
            /**
             * 임시 코드
             */
            const name = param(body, 'name');
            const phone = param(body, 'phone');
            const shop_no = param(body, 'shop_no');
            const prodcut_no = param(body, 'product_no');
            const depositor_no = param(body, 'depositor_no');
            const account_number = param(body, 'account_number');
            const bank = param(body, 'bank');
            const first_registration_number = param(body, 'first_registration_number');
            // 계좌번호 체크
        } catch (e) {
            next(e);            
        }
    },
    async confirmUser({ body }, { pool }, next) {
        try {
            const name = param(body, 'name');
            const phone = param(body, 'phone'); // DB 내 phone에 인덱스 설정 필요

            const [ result ] = await pool.query(`
                SELECT
                no AS user_no
                FROM users
                WHERE enabled = 1
                AND phone = ?
                AND name = ?;
            `, [phone, name]);
            if (result[0].length < 1) throw err(400, `이름 또는 전화번호가 일치하지 않습니다.`);
            const token = encodeToken({ type: `customer`, user_no: result[0].user_no }, { expiresIn: '10m' });
            next({ token });
        } catch (e) {
            next(e);
        }
    },
    async getPurchaseHistory({ user }, { pool }, next) {
        try {
            next();
        } catch (e) {
            next(e);
        }
    }
}

module.exports = controller;