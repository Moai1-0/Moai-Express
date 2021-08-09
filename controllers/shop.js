const err = require('http-errors');
const dayjs = require('dayjs');
const { param, auth } = require('../utils/params');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { encodeToken } = require('../utils/token');
const { S3 } = require('../utils/multer');

const S3_URL = require('../config/index').s3.endPoint;
const { connect } = require('../routes/shop');

const controller = {
    async ping(req, res, next) {
        try {
            next({ message: "ping" });
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
            const pickup_datetime = param(body, "pickup_datetime");

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
                    pickup_datetime
                    )
                VALUES (?,?,?,?,?,?,?,?,?,?)`,
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
                        pickup_datetime
                    ]);
                files.map(async (file, index) => {
                    const { instance, params } = S3;
                    // 이름 + 등록 시간 + shop_no
                    const file_name = `product/${result.insertId}-${dayjs().format("YYYYMMDDHHmmss")}-${shop_no}-${index + 1}`;
                    params.Key = file_name;
                    params.Body = file.buffer;
                    instance.upload(params, (error, data) => {
                        if (error) throw err.InternalServerError('S3 에러');
                    });
                    const [result2] = await pool.query(`
                        INSERT INTO product_images (
                            product_no,
                            name,
                            path
                        )
                        VALUES(?,?,?)
                    `, [result.insertId, name, `/${file_name}`]);
                });
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
    async getBookmarkProducts({ shop, body, query }, { pool }, next) {
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
                b.pickup_datetime,
                b.return_price
                FROM product_bookmark AS a
                INNER JOIN products AS b
                ON a.product_no = b.no
                INNER JOIN shops AS c
                ON a.shop_no = c.no
                WHERE a.shop_no = ?
        
            `, [shop_no]);

            next(
                result.map(product =>
                ({
                    ...product,
                    pickup_datetime: dayjs(product.pickup_datetime).format("YYYY-MM-DD HH:mm:ss"),
                    expiry_datetime: dayjs(product.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
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

            const [result] = await pool.query(`
                UPDATE product_bookmark
                SET
                enabled = 0,
                removed_datetime = NOW()
                WHERE
                no = ?
            `, [product_bookmark_no]);

            next({ message: 'good' });
        } catch (e) {
            next(e);
        }
    },
    async signin({ body }, { pool }, next) {
        try {
            const id = param(body, "id");
            const password = param(body, 'password');

            const [results] = await pool.query(`
                    SELECT
                    *
                    FROM shops 
                    WHERE enabled = 1
                    AND id = ?;
                    `, [id]);
            const accountValid = compareSync(password.toString(), results[0].password);
            if (results.length < 1 || !accountValid) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);

            const token = encodeToken({ type: `shop_owner`, shop_no: results[0].no, id: results[0].id }, { expiresIn: '7d' });

            next({ token });
        } catch (e) {
            next(e);
        }
    },
    async getPrebidProducts({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`
                    SELECT
                    a.no AS 'product_no',
                    a.name AS 'product_name',
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
                    a.expiry_datetime > NOW()
                    AND a.status = 'ongoing'
                    AND a.shop_no = ?
                    AND a.enabled = 1
                    GROUP BY b.product_no
                    `, [shop_no]);

            next(result.map(item => ({
                ...item,
                pickup_datetime: dayjs(item.pickup_datetime).format("YYYY-MM-DD HH:mm:ss"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                product_images: item.product_images.split(',').map(item => S3_URL + item)
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
                a.expiry_datetime > NOW()
                AND a.shop_no = ?
                AND a.no = ?
                GROUP BY b.product_no
            `, [shop_no, product_no, shop_no, product_no]);

            if (result[1].length < 1) throw err.BadRequest('비정상적인 접근');
            next({
                reservations: {
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
    async getBidProducts({ shop, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`
                    SELECT
                    a.no,
                    a.name,
                    a.expected_quantity,
                    a.actual_quantity,
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
                    a.shop_no = ?
                    AND a.expiry_datetime < NOW()
                    AND a.status = 'ongoing'
                    AND a.enabled = 1
                    GROUP BY b.product_no
                    `, [shop_no]);

            next(result.map(item => ({
                ...item,
                pickup_datetime: dayjs(item.pickup_datetime).format("YYYY-MM-DD HH:mm:ss"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                product_images: item.product_images.split(',').map(item => S3_URL + item)
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
    async getCompleteProducts({ shop, body, query }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");

            const [result] = await pool.query(`
                    SELECT
                    a.no,
                    a.name,
                    a.expected_quantity,
                    a.actual_quantity,
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
                    a.shop_no = ?
                    AND a.expiry_datetime < NOW()
                    AND a.status = 'done'
                    AND a.enabled = 1
                    GROUP BY b.product_no
                    `, [shop_no]);

            next(result.map(item => ({
                ...item,
                pickup_datetime: dayjs(item.pickup_datetime).format("YYYY-MM-DD HH:mm:ss"),
                expiry_datetime: dayjs(item.expiry_datetime).format("YYYY-MM-DD HH:mm:ss"),
                product_images: item.product_images.split(',').map(item => S3_URL + item)
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

            if (result[0].expected_quantity < actual_quantity) throw err.BadRequest("예상 재고수 보다 많이 입력");

            await pool.query(`
                UPDATE products SET
                actual_quantity = ?
                WHERE no = ?
            `, [actual_quantity, product_no]);

            const reserved_quantity = result[0].expected_quantity - result[0].rest_quantity;
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
                    AND a.enabled = 1
                    ORDER BY a.created_datetime ASC

                `, [product_no]);
            // 실재고보다 예약한 재고가 더 많은 경우
            let for_check_quantity = actual_quantity;
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                if (reserved_quantity > actual_quantity) {

                    for (let i = 0; i < result1.length; i++) {
                        let temp_reserved_quantity = result1[i].total_purchase_quantity;
                        // 싹 다 픽업 처리(실재고가 예약 주문보다 많은 경우)
                        if (for_check_quantity >= temp_reserved_quantity) {
                            console.log(result1[i].reservation_no, result1[i].user_no, temp_reserved_quantity, result1[i].discounted_price * temp_reserved_quantity, 0);
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

                        }
                        // 부분 픽업/환급 처리(실재고가 예약 주문보다 적은 경우)
                        else if (for_check_quantity < temp_reserved_quantity) {
                            const temp_return_quantity = temp_reserved_quantity - for_check_quantity;
                            const temp_pickup_quantity = for_check_quantity;
                            console.log(temp_return_quantity, temp_pickup_quantity);

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
                            }

                            await connection.query(`
                                UPDATE point_accounts SET
                                point = point + ?
                                WHERE user_no = ?
                            `, [result1[i].return_price * temp_return_quantity, result1[i].user_no]);


                        }
                        for_check_quantity -= temp_reserved_quantity;

                    }
                    // 예약 총 재고 보다 총 실재고가 많은경우 
                } else if (reserved_quantity < actual_quantity) {
                    for (let i = 0; i < result1.length; i++) {
                        let temp_reserved_quantity = result1[i].total_purchase_quantity;
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
                            result1[i].reservation_no, product_no, result1[i].user_no, shop_no, temp_reserved_quantity, result1[i].discounted_price * temp_reserved_quantity, 0,
                        ]);

                        for_check_quantity -= temp_reserved_quantity;
                    }
                }
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

                    const [result2] = await connection.query(`
                        SELECT
                        COUNT(*) AS count
                        FROM
                        reservations
                        WHERE
                        product_no = ?
                        AND status = 'ongoing'
                    `, [product_no]);

                    if (result2[0].count <= 0) {
                        await connection.query(`
                            UPDATE products
                            SET status = "done"
                            WHERE
                            no = ?
                        `, [product_no]);
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
    async setReturn({ shop, body }, { pool }, next) {
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
                    status = 'return'
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

                    const [result2] = await connection.query(`
                        SELECT
                        COUNT(*) AS count
                        FROM
                        reservations
                        WHERE
                        product_no = ?
                        AND status = 'ongoing'
                    `, [product_no]);

                    if (result2[0].count <= 0) {
                        await connection.query(`
                            UPDATE products
                            SET status = "done"
                            WHERE
                            no = ?
                        `, [product_no]);
                    }
                }
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



