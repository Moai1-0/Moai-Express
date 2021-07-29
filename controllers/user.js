const err = require('http-errors');
const dayjs = require('dayjs');
require('dayjs/locale/ko');
dayjs.locale('ko');

const controller = {
    async getProducts ({ query }, { pool }, next) {
        try {
            const count = (query.count === undefined || query.count === null) ? 10 : parseInt(query.count, 10);
            const page = (query.page === undefined || query.page === null) ? 1 : parseInt(query.page, 10);
            const offset = count*page - count;
            
            const [ results ] = await pool.query(`
                SELECT
                COUNT(*) AS total_count
                FROM products AS p
                WHERE p.enabled=1;

                SELECT
                p.no AS product_no,
                i.path,
                p.shop_no,
                p.name AS prduct_name,
                p.description,
                p.expected_quantity,
                p.actual_quantity,
                p.rest_quantity,
                p.regular_price,
                p.discounted_price,
                p.return_price,
                p.expiry_datetime,
                p.return_price,
                p.expiry_datetime,
                p.pickup_datetime
                FROM products AS p
                JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images AS i
                    WHERE i.sort = 1
                ) AS i
                ON p.no = i.product_no
                WHERE p.enabled = 1
                ORDER BY p.created_datetime
                LIMIT ?
                OFFSET ?
            `, [ count, offset ]);
            // datetime필드 디자인에 따라 추후 형식 변경
            next({
                total_count: results[0][0].total_count,
                products: results[1].map((product) => ({
                    ...product,
                    expiry_datetime: dayjs(product.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                    pickup_datetime: dayjs(product.pickup_datetime).format(`M월 D일(ddd) a h시 m분`),
                    impending: dayjs(product.expiry_datetime).diff(dayjs(), 'hour') < 1 ? true : false
                }))
            });
        } catch (e) {
            next(e);
        }
    }
}

module.exports = controller;