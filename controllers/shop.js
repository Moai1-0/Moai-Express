const err = require('http-errors');
const dayjs = require('dayjs');
const { param, auth } = require('../utils/params');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { encodeToken } = require('../utils/token');
const { S3 } = require('../utils/multer');
const schedule = require("node-schedule");
const tp = require('../utils/mailer');
const { send, sendConsumerResult } = require('../utils/solapi');
require('dotenv').config();
const S3_URL = require('../config/index').s3.endPoint;
const { connect } = require('../routes/shop');

// db-api 상수
const productLogAPI = require("../db_api/product_log_api");
const reservationLogApi = require("../db_api/reservation_log_api");
const pointLogApi = require("../db_api/point_log_api");


const controller = {
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async getShopInfo({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, 'shop_no');
            const [result] = await pool.query(`
                SELECT *
                FROM shops
                WHERE
                no = ?
            `, [shop_no]);
            next({
                shop_no: result[0].no,
                shop_name: result[0].name
            });
        } catch (e) {
            next(e);
        }
    },
    async uploadProduct({ body, shop, files }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const name = param(body, "name");
            const description = param(body, "description");
            const expected_quantity = param(body, "expected_quantity");
            const rest_quantity = expected_quantity;
            const regular_price = param(body, "regular_price");
            const discounted_price = param(body, "discounted_price");
            const return_price = param(body, "return_price");
            const expiry_datetime = param(body, "expiry_datetime");
            const pickup_start_datetime = param(body, "pickup_start_datetime");
            const pickup_end_datetime = param(body, "pickup_end_datetime");
            const discount_rate = 100 - parseFloat(discounted_price / regular_price * 100).toFixed(2);
            const is_bookmark = param(body, "is_bookmark");
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                const [result] = await connection.query(`
                INSERT INTO products(
                    shop_no,
                    name,
                    description,
                    expected_quantity,
                    rest_quantity,
                    regular_price,
                    discounted_price,
                    return_price,
                    expiry_datetime,
                    pickup_start_datetime,
                    pickup_end_datetime,
                    discount_rate
                    )
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                    [
                        shop_no,
                        name,
                        description,
                        expected_quantity,
                        rest_quantity,
                        regular_price,
                        discounted_price,
                        return_price,
                        expiry_datetime,
                        pickup_start_datetime,
                        pickup_end_datetime,
                        discount_rate
                    ]);
                files.map(async (file, index) => {
                    const { instance, params } = S3;
                    // 등록 시간+ product_no + shop_no
                    const file_name = `product/${dayjs().format("YYYYMMDDHHmmss")}-${result.insertId}-${shop_no}-${index + 1}`;
                    params.Key = file_name;
                    params.Body = file.buffer;
                    instance.upload(params, (error, data) => {
                        if (error) throw err.InternalServerError('S3 에러');
                    });
                    await connection.query(`
                        INSERT INTO product_images (
                            product_no,
                            name,
                            path,
                            sort
                        )
                        VALUES(?,?,?,?)
                    `, [result.insertId, name, `/${file_name}`, index + 1]);

                });

                if (is_bookmark) {
                    await connection.query(`
                        INSERT INTO product_bookmark(
                            shop_no,
                            product_no
                        )
                        VALUES(?,?)


                    `, [shop_no, result.insertId]);
                }
                
                // db 상태변화에 따른 로그 처리
                await productLogAPI.postLogProductStatusModels(result.insertId,
                                                            "ongoing",
                                                            connection);

                // db 수량변화에 따른 로그 처리
                await productLogAPI.postLogProductQuantityModels(result.insertId,
                                                              expected_quantity,
                                                              null,
                                                              rest_quantity,
                                                              connection);

                await connection.commit();
                next({ message: "업로드가 완료 되었습니다" });
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();
            }

        } catch (e) {
            next(e);
        }
    },
    async getBookmarkProducts({ shop }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const [result] = await pool.query(`
                SELECT 
                a.no AS product_bookmark_no,
                a.shop_no,
                a.product_no,
                b.name,
                b.description,
                b.expected_quantity,
                b.regular_price,
                b.discounted_price,
                b.expiry_datetime,
                b.pickup_start_datetime,
                b.pickup_end_datetime,
                b.return_price,
                GROUP_CONCAT(path) AS "product_images"
                FROM product_bookmark AS a
                INNER JOIN products AS b
                ON a.product_no = b.no
                INNER JOIN shops AS c
                ON a.shop_no = c.no
                LEFT JOIN product_images AS d
                ON b.no = d.product_no
                WHERE a.shop_no = ?
                GROUP BY a.product_no
            `, [shop_no]);

            next(
                result.map(product =>
                ({
                    ...product,
                    pickup_start_datetime: dayjs(product.pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                    pickup_end_datetime: dayjs(product.pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                    expiry_datetime: dayjs(product.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                    product_images: (product.product_images) ? product.product_images.split(',').map(item => S3_URL + item) : []
                }))

            );
        } catch (e) {
            next(e);
        }
    },
    async deleteBookmarkProduct({ shop, body }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const product_bookmark_no = param(body, 'product_bookmark_no');

            await pool.query(`
                UPDATE product_bookmark
                SET
                enabled = 0,
                removed_datetime = NOW()
                WHERE
                no = ?
                AND shop_no = ?

            `, [product_bookmark_no, shop_no]);

            next({ message: '즐겨찾기가 삭제 되었습니다' });
        } catch (e) {
            next(e);
        }
    },
    async signin({ body }, res, next) {
        try {
            console.log(body);
            const id = param(body, "id");
            const password = param(body, 'password');

            const [results] = await res.pool.query(`
                    SELECT
                    *
                    FROM shops 
                    WHERE enabled = 1
                    AND id = ?;
                    `, [id]);
            if (results.length < 1) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);
            const accountValid = compareSync(password.toString(), results[0].password);
            if (results.length < 1 || !accountValid) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);

            const token = encodeToken({ type: `shop_owner`, shop_no: results[0].no, id: results[0].id }, { expiresIn: '7d' });
            // res.cookie("accessToken", token, { httpOnly: true, maxAge: 1000 * 60 * 60 });
            next({ token });
        } catch (e) {
            next(e);
        }
    },
    async getPrebidProducts({ shop }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`
                    SELECT
                    a.no AS 'product_no',
                    a.name AS 'product_name',
                    a.expected_quantity,
                    a.rest_quantity,
                    a.regular_price,
                    a.return_price,
                    a.discounted_price,
                    a.pickup_start_datetime,
                    a.pickup_end_datetime,
                    a.expiry_datetime,
                    a.actual_quantity,
                    b.sort,
                    GROUP_CONCAT(path) AS "product_images"
                    FROM products AS a
                    INNER JOIN product_images AS b
                    ON a.no = b.product_no
                    WHERE
                    a.actual_quantity IS NULL
                    AND a.status = 'ongoing'
                    AND a.shop_no = ?
                    AND a.enabled = 1
                    GROUP BY b.product_no
                    `, [shop_no]);
            next(result.map(item => ({
                ...item,
                pickup_start_datetime: dayjs(item.pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                pickup_end_datetime: dayjs(item.pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                product_images: item.product_images.split(',').map(item => S3_URL + item).filter(item => item[item.length - 1] === '1')
            })));
        } catch (e) {
            next(e);
        }
    },
    async getPrebidProduct({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const product_no = param(query, "product_no");

            const [result] = await pool.query(`
                SELECT 
                a.no AS reservation_no,
                a.user_no,
                a.shop_no,
                a.product_no,
                a.depositor_name,
                a.total_purchase_quantity,
                a.total_purchase_price,
                b.name AS "product_name",
                c.name AS "user_name",
                c.phone,
                a.created_datetime
                FROM reservations AS a
                INNER JOIN products AS b
                ON a.product_no = b.no
                INNER JOIN users AS c
                ON a.user_no = c.no 
                WHERE
                a.shop_no = ?
                AND a.product_no = ?
                AND a.status = "ongoing"
                AND a.enabled = 1
                ORDER BY a.created_datetime ASC;

                SELECT
                a.no AS product_no,
                a.name AS product_name,
                a.expected_quantity,
                a.rest_quantity,
                a.actual_quantity,
                a.regular_price,
                a.return_price,
                a.discounted_price,
                a.discount_rate,
                a.pickup_start_datetime,
                a.pickup_end_datetime,
                a.expiry_datetime,
                a.created_datetime,
                b.sort,
                GROUP_CONCAT(path) AS "product_images"
                FROM products AS a
                INNER JOIN product_images AS b
                ON a.no = b.product_no
                WHERE
                a.shop_no = ?
                AND a.no = ?
                GROUP BY b.product_no
            `, [shop_no, product_no, shop_no, product_no]);
            if (result[1].length < 1) throw err.NotFound('비정상적인 접근');


            next({
                product: {
                    ...result[1][0],
                    pickup_start_datetime: dayjs(result[1][0].pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                    pickup_end_datetime: dayjs(result[1][0].pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                    expiry_datetime: dayjs(result[1][0].expiry_datetime).format("YYYY-MM-DD HH:mm"),
                    created_datetime: dayjs(result[1][0].created_datetime).format("YYYY-MMDD HH:mm"),
                    product_images: result[1][0].product_images.split(',').map(item => S3_URL + item),

                },
                orders: result[0].map(item => ({
                    ...item,
                    created_datetime: dayjs(item.created_datetime).format("YYYY-MM-DD HH:mm")
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getBidProducts({ shop }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`       
                SELECT
                a.no AS 'product_no',
                a.name AS 'product_name',
                a.expected_quantity,
                a.actual_quantity,
                a.rest_quantity,
                a.regular_price,
                a.return_price,
                a.discounted_price,
                a.pickup_start_datetime,
                a.pickup_end_datetime,
                a.expiry_datetime,
                a.actual_quantity,
                b.sort,
                c.pre_pickup_count,
                d.pre_return_count,
                GROUP_CONCAT(path) AS "product_images"
                FROM products AS a            
                LEFT JOIN (SELECT 
                            product_no,
                            COUNT(*) as pre_pickup_count
                            FROM orders
                            WHERE status = 'pre_pickup'
                            GROUP BY product_no) AS c
                ON c.product_no = a.no
                LEFT JOIN (SELECT 
                            product_no,
                            COUNT(*) as pre_return_count
                            FROM orders
                            WHERE status = 'pre_return'
                            GROUP BY product_no) AS d
                ON d.product_no = a.no
                LEFT JOIN product_images AS b
                ON a.no = b.product_no
                WHERE
                a.shop_no = ?
                AND actual_quantity IS NOT NULL
                AND a.expiry_datetime < NOW()
                AND a.status = 'ongoing'
                AND a.enabled = 1
                GROUP BY a.no

                    `, [shop_no]);

            next(result.map(item => ({
                ...item,
                pickup_start_datetime: dayjs(item.pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                pickup_end_datetime: dayjs(item.pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                product_images: (item.product_images) ? item.product_images.split(',').map(item => S3_URL + item) : []
            })));
        } catch (e) {
            next(e);
        }
    },
    async getBidProduct({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const product_no = param(query, "product_no");
            const [result] = await pool.query(`
                SELECT 
                a.no AS reservation_no,
                a.user_no,
                a.shop_no,
                a.product_no,
                a.depositor_name,
                a.total_purchase_quantity,
                a.total_purchase_price,
                a.status,
                b.name AS "product_name",
                c.name AS "user_name",
                c.phone,
                a.created_datetime,
                d.purchase_quantity AS pre_pickup_quantity,
                e.purchase_quantity AS pickup_quantity,
                f.purchase_quantity AS pre_return_quantity,
                g.purchase_quantity AS return_quantity,
                d.pre_pickup_order_no
                FROM 
                reservations AS a
                INNER JOIN products AS b
                ON a.product_no = b.no
                INNER JOIN users AS c
                ON a.user_no = c.no 
                LEFT JOIN 
                (SELECT
                no AS pre_pickup_order_no,
                reservation_no,
                purchase_quantity,
                status
                FROM orders
                WHERE status = 'pre_pickup') AS d
                ON a.no = d.reservation_no
                LEFT JOIN 
                (SELECT 
                reservation_no,
                purchase_quantity,
                status
                FROM orders
                WHERE status = 'pickup') AS e
                ON a.no = e.reservation_no
                LEFT JOIN 
                (SELECT 
                reservation_no,
                purchase_quantity,
                status
                FROM orders
                WHERE status = 'pre_return') AS f
                ON a.no = f.reservation_no
                LEFT JOIN 
                (SELECT 
                reservation_no,
                purchase_quantity,
                status
                FROM orders
                WHERE status = 'return') AS g
                ON a.no = g.reservation_no
                WHERE
                a.shop_no = ?
                AND a.product_no = ?
                AND a.enabled = 1
                ORDER BY a.created_datetime ASC;

                SELECT
                a.no AS product_no,
                a.name AS product_name,
                a.actual_quantity, 
                a.expected_quantity,
                a.rest_quantity,
                a.regular_price,
                a.return_price,
                a.discounted_price,
                a.discount_rate,
                a.pickup_start_datetime,
                a.pickup_end_datetime,
                a.expiry_datetime,
                a.created_datetime,
                b.sort,
                GROUP_CONCAT(path) AS "product_images"
                FROM products AS a
                LEFT JOIN product_images AS b
                ON a.no = b.product_no
                WHERE
                a.expiry_datetime < NOW()
                AND a.actual_quantity IS NOT NULL
                AND a.shop_no = ?
                AND a.no = ?
                GROUP BY b.product_no
            `, [shop_no, product_no, shop_no, product_no]);
            if (result[1].length < 1) throw err.BadRequest('비정상적인 접근');
            // if (result[1].length >= 1) throw err.Unauthorized('비권한 테스트');

            next({
                product: {
                    ...result[1][0],
                    pickup_start_datetime: dayjs(result[1][0].pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                    pickup_end_datetime: dayjs(result[1][0].pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                    expiry_datetime: dayjs(result[1][0].expiry_datetime).format("YYYY-MM-DD HH:mm"),
                    created_datetime: dayjs(result[1][0].created_datetime).format("YYYY-MMDD HH:mm"),
                    product_images: result[1][0].product_images.split(',').map(item => S3_URL + item),

                },
                orders: result[0].map(item => ({
                    ...item,
                    created_datetime: dayjs(item.created_datetime).format("YYYY-MM-DD HH:mm")
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getCompleteProducts({ shop }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`
            SELECT
            a.no AS 'product_no',
            a.name AS 'product_name',
            a.expected_quantity,
            a.actual_quantity,
            a.rest_quantity,
            a.regular_price,
            a.return_price,
            a.discounted_price,
            a.pickup_start_datetime,
            a.pickup_end_datetime,
            a.expiry_datetime,
            a.actual_quantity,
            b.sort,
            c.pickup_count,
            d.return_count,
            GROUP_CONCAT(path) AS "product_images"
            FROM products AS a            
            LEFT JOIN (SELECT 
                        product_no,
                        COUNT(*) as pickup_count
                        FROM orders
                        WHERE status = 'pickup'
                        GROUP BY product_no) AS c
            ON c.product_no = a.no
            LEFT JOIN (SELECT 
                product_no,
                COUNT(*) as return_count
                FROM orders
                WHERE status = 'return'
                GROUP BY product_no) AS d
            ON d.product_no = a.no
            LEFT JOIN product_images AS b
            ON a.no = b.product_no
            WHERE
            a.shop_no = ?
            AND actual_quantity IS NOT NULL
            AND a.expiry_datetime < NOW()
            AND a.status = 'done'
            AND a.enabled = 1
            GROUP BY a.no
                    `, [shop_no]);

            next(result.map(item => ({
                ...item,
                pickup_start_datetime: dayjs(item.pickup_start_datetime).format("YYYY-MM-DD HH:mm"),
                pickup_end_datetime: dayjs(item.pickup_end_datetime).format("YYYY-MM-DD HH:mm"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm"),
                product_images: (item.product_images) ? item.product_images.split(',').map(item => S3_URL + item) : []
            })));


            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
    async getCompleteProduct({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const product_no = param(query, "product_no");
            const [result] = await pool.query(`
                SELECT 
                a.no AS reservation_no,
                a.user_no,
                a.shop_no,
                a.product_no,
                a.depositor_name,
                a.total_purchase_quantity,
                a.total_purchase_price,
                b.name AS "product_name",
                c.name AS "user_name",
                c.phone,
                a.created_datetime
                FROM reservations AS a
                INNER JOIN products AS b
                ON a.product_no = b.no
                INNER JOIN users AS c
                ON a.user_no = c.no 
                WHERE
                a.shop_no = ?
                AND a.product_no = ?
                AND a.enabled = 1
                ORDER BY a.created_datetime ASC;

                SELECT
                a.no AS product_no,
                a.name AS product_name,
                a.expected_quantity,
                a.rest_quantity,
                a.regular_price,
                a.discounted_price,
                a.pickup_datetime,
                a.expiry_datetime,
                b.sort,
                GROUP_CONCAT(path) AS "product_images"
                FROM products AS a
                INNER JOIN product_images AS b
                ON a.no = b.product_no
                WHERE
                a.expiry_datetime < NOW()
                AND a.shop_no = ?
                AND a.no = ?
                GROUP BY b.product_no
            `, [shop_no, product_no, shop_no, product_no]);
            if (result[1].length < 1) throw err.BadRequest('비정상적인 접근');
            next({
                product: {
                    ...result[1][0],
                    pickup_datetime: dayjs(result[1][0].pickup_datetime).format("YYYY-MM-DD HH:mm:ss"),
                    expiry_datetime: dayjs(result[1][0].expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                    product_images: result[1][0].product_images.split(',').map(item => S3_URL + item)
                },
                orders: result[0]
            });
        } catch (e) {
            next(e);
        }
    },
    async enterActualQuantity({ shop, body }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const actual_quantity = param(body, 'actual_quantity');
            const product_no = param(body, "product_no");
            const [result] = await pool.query(`
                SELECT *
                FROM products
                WHERE
                no = ?
            `, [product_no]);

            if (result[0].expected_quantity < actual_quantity
                // || result[0].actual_quantity != null
            ) throw err.BadRequest("예상 재고수 보다 많이 입력");

            // actual >= reserved_quantity(예약 완료된 재고) -> 그냥 모두 픽업처리
            // actual < reserved_quantity -> 선착순으로 픽업 나머지 환급


            const [result1] = await pool.query(`
                    SELECT
                    a.no AS 'reservation_no',
                    a.user_no,
                    a.product_no,
                    a.shop_no,
                    a.depositor_name,
                    a.total_purchase_quantity,
                    a.total_purchase_price,
                    a.status,
                    b.expected_quantity,
                    b.actual_quantity,
                    b.rest_quantity,
                    b.regular_price,
                    b.discounted_price,
                    b.return_price,
                    c.name,
                    c.phone
                    FROM reservations AS a
                    INNER JOIN products AS b
                    ON a.product_no = b.no
                    INNER JOIN users AS c
                    ON a.user_no = c.no
                    WHERE
                    a.product_no = ?
                    AND a.status = "ongoing"
                    AND a.enabled = 1
                    ORDER BY a.created_datetime ASC

                `, [product_no]);
            // 실재고보다 예약한 재고가 더 많은 경우
            let for_check_quantity = actual_quantity;
            const reserved_quantity = result[0].expected_quantity - result[0].rest_quantity;
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE products SET
                    actual_quantity = ?
                    WHERE no = ?
                `, [actual_quantity, product_no]);

                // 예약 총 재고 보다 총 실재고가 많은경우;
                for (let i = 0; i < result1.length; i++) {
                    let temp_reserved_quantity = result1[i].total_purchase_quantity;
                    // 싹 다 픽업 처리(실재고가 예약 주문보다 많은 경우)
                    if (for_check_quantity >= temp_reserved_quantity) {
                        await connection.query(`
                            INSERT INTO orders (
                                reservation_no,
                                product_no,
                                user_no,
                                shop_no,
                                purchase_quantity,
                                purchase_price,
                                return_price,
                                status
                            )
                            VALUES
                            (?,?,?,?,?,?,?,"pre_pickup")
                            `, [
                            result1[i].reservation_no, product_no, result1[i].user_no, shop_no, temp_reserved_quantity, result1[i].discounted_price * temp_reserved_quantity, 0
                        ]);
                        // await sendConsumerResult({
                        //     pickup_number: temp_reserved_quantity,
                        //     return_number: 0,
                        //     to: result1[i].phone
                        // });
                    }
                    // 부분 픽업/환급 처리(실재고가 예약 주문보다 적은 경우)
                    else if (for_check_quantity < temp_reserved_quantity) {
                        const temp_return_quantity = temp_reserved_quantity - for_check_quantity;
                        const temp_pickup_quantity = for_check_quantity;
                        if (temp_pickup_quantity > 0) {
                            await connection.query(`
                                INSERT INTO orders (
                                    reservation_no,
                                    product_no,
                                    user_no,
                                    shop_no,
                                    purchase_quantity,
                                    purchase_price,
                                    return_price,
                                    status
                                )
                                VALUES
                                (?,?,?,?,?,?,?,"pre_pickup"),
                                (?,?,?,?,?,?,?,"pre_return")
                            `, [
                                result1[i].reservation_no, product_no, result1[i].user_no, shop_no, temp_pickup_quantity, result1[i].discounted_price * temp_pickup_quantity, 0,
                                result1[i].reservation_no, product_no, result1[i].user_no, shop_no, temp_return_quantity, 0, result1[i].return_price * temp_return_quantity,
                            ]);
                            // await sendConsumerResult({
                            //     pickup_number: temp_pickup_quantity,
                            //     return_number: temp_return_quantity,
                            //     to: result1[i].phone
                            // });
                        } else if (temp_pickup_quantity == 0) {
                            await connection.query(`
                                INSERT INTO orders (
                                    reservation_no,
                                    product_no,
                                    user_no,
                                    shop_no,
                                    purchase_quantity,
                                    purchase_price,
                                    return_price,
                                    status
                                )
                                VALUES
                                (?,?,?,?,?,?,?,"pre_return")
                            `, [
                                result1[i].reservation_no, product_no, result1[i].user_no, shop_no, temp_return_quantity, 0, result1[i].return_price * temp_return_quantity
                            ]);
                            // await sendConsumerResult({
                            //     pickup_number: 0,
                            //     return_number: temp_reutrn_quantity,
                            //     to: result1[i].phone
                            // });
                        }

                        await connection.query(`
                                UPDATE point_accounts SET
                                point = point + ?
                                WHERE user_no = ?
                            `, [result1[i].return_price * temp_return_quantity, result1[i].user_no]);

                        const [pointResult] = await pool.query(`
                            SELECT point
                            FROM point_accounts
                            WHERE user_no = ?
                            AND enabled = 1;
                            `, [result1[i].user_no]);
                        
                        await pointLogApi.postLogPointModels(result1[i].user_no,
                                                            result1[i].return_price * temp_return_quantity,
                                                            pointResult[0].point + (result1[i].return_price * temp_return_quantity),
                                                            connection)

                    }
                    await connection.query(`
                            UPDATE
                            reservations
                            SET status = "waiting"
                            WHERE
                            no = ?
                            AND enabled = 1
                        `, [result1[i].reservation_no]);
                    for_check_quantity -= temp_reserved_quantity;
                    
                    // 예약 상태 변경 사항 로그 반영
                    await reservationLogApi.postLogReservationStatusModels(result1[i].reservation_no,
                                                                     "waiting",
                                                                     connection);
                }

                // 실재고수량 기입에 따른 로그 처리
                await productLogAPI.postLogProductQuantityModels(product_no,
                                                                 result1[0].expected_quantity,
                                                                 actual_quantity,
                                                                 result1[0].rest_quantity,
                                                                 connection);

                await connection.commit();
                next({ message: "ping" });
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();
            }

        } catch (e) {
            next(e);
        }
    },
    async setPickup({ shop, body }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const product_no = param(body, "product_no");
            const order_no = param(body, 'order_no');
            const reservation_no = param(body, 'reservation_no');


            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE orders SET
                    status = 'pickup'
                    WHERE
                    no = ?
                `, [order_no]);

                const [result1] = await connection.query(`
					SELECT
					COUNT(*) AS count
                    FROM
                    orders
                    WHERE
                    reservation_no = ?
					AND (status = 'pre_pickup' or status ="pre_return")
                `, [reservation_no]);

                if (result1[0].count <= 0) {
                    await connection.query(`
                        UPDATE reservations
                        SET status = "done"
                        WHERE
                        no = ?
                    `, [reservation_no]);
                    
                    // 예약 상태 변경 사항 로그 반영
                    await reservationLogApi.postLogReservationStatusModels(reservation_no,
                                                                            "done",
                                                                             connection);

                    const [result2] = await connection.query(`
                        SELECT
                        COUNT(*) AS count
                        FROM
                        reservations
                        WHERE
                        product_no = ?
                        AND status = 'waiting'
                    `, [product_no]);

                    if (result2[0].count <= 0) {
                        await connection.query(`
                            UPDATE products
                            SET status = "done"
                            WHERE
                            no = ?
                        `, [product_no]);

                        // 프로덕트완 관련된 거래 모두 완료시 "done"으로 상태 변경
                        await productLogAPI.postLogProductStatusModels(product_no,
                                                                    "done",
                                                                     connection);
                    }
                }
                // for (let i = 0; i < result1.length; i++) {
                //     const temp = result1[i];
                //     if (temp.status === "pre_pickup" || temp.status === "pre_return") {
                //         next({ message: "ping" });
                //     }
                // }


                await connection.commit();
                next({ message: "ping" });
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();
            }

        } catch (e) {
            next(e);
        }
    },
    // 임시 api
    async signup({ body }, { pool }, next) {
        try {
            const id = param(body, "id");
            const password = param(body, 'password');
            const name = param(body, 'name');
            const region_no = param(body, 'region_no');
            const tel = param(body, 'tel');
            const representative_name = param(body, 'representative_name');
            const zone_code = param(body, 'zone_code');
            const road_address = param(body, 'road_address');
            const road_detail_address = param(body, 'road_detail_address');
            const region_address = param(body, 'region_address');
            const region_detail_address = param(body, 'region_detail_address');
            const opening_time = param(body, 'opening_time');
            const closing_time = param(body, 'closing_time');

            const salt = genSaltSync(10);
            const hashedPassword = hashSync(password, salt);

            const [idCheck] = await pool.query(`
                SELECT *
                FROM shops
                WHERE enabled = 1
                AND id = ?
            `, [id]);
            if (idCheck.length > 0) throw err.BadRequest('이미 존재하는 아이디');

            const [result] = await pool.query(
                `INSERT INTO shops (
                    id,
                    password,
                    name,
                    region_no,
                    tel,
                    representative_name,
                    zone_code,
                    road_address,
                    road_detail_address,
                    region_address,
                    region_detail_address,
                    opening_time,
                    closing_time
                    )
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    id,
                    hashedPassword,
                    name,
                    region_no,
                    tel,
                    representative_name,
                    zone_code,
                    road_address,
                    road_detail_address,
                    region_address,
                    region_detail_address,
                    opening_time,
                    closing_time
                ]);

            next({ message: "good" });
        } catch (e) {
            next(e);
        }
    },
    async controllerFormat({ shop, body, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(``);
                await connection.commit();
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();
            }
            next({ message: "ping" });
        } catch (e) {
            next(e);
        }
    },
};

module.exports = controller;



