const err = require('http-errors');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);
dayjs.extend(timezone);
require('dayjs/locale/ko');
dayjs.locale('ko');

const mailer = require('../utils/mailer');
const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');
const { send, sendKakaoMessage } = require('../utils/solapi');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { Users, Shops, sequelize } = require('../models');
const { sendSlack } = require('../utils/slack');

const solapi = require('../config').solapi;
const template = require('../config/template');

const PAGINATION_COUNT = 10;

const controller = {
    async controllerFormat({ admin, body, query }, { pool }, next) {
        try {
            const admin_no = auth(admin, "admin_no");

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
    async registerAdmin({ body }, { pool }, next) {
        try {
            const email = param(body, 'email');
            const password = param(body, 'password');
            const name = param(body, 'name');
            const phone = param(body, 'phone');
            const auth = param(body, 'auth', 3);

            // if (!check.phone(phone)) throw err(400, `핸드폰 번호가 올바르지 않습니다. 핸드폰 번호를 확인하세요.`);
            // if (!check.email(email)) throw err(400, `이메일을 정확히 입력하세요.`);

            const salt = genSaltSync(10);
            const hashedPassword = hashSync(password, salt);

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    INSERT INTO admins (
                        email,
                        password,
                        name,
                        phone,
                        auth
                    )
                    VALUES (?, ?, ?, ?, ?);
                `, [email, hashedPassword, name, phone, auth]);

                await connection.commit();
                next({ message: "가입되었습니다." });
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
    async signin({ body }, { pool }, next) {
        try {
            const username = param(body, 'username');
            const password = param(body, 'password');

            const [result] = await pool.query(`
                SELECT
                *
                FROM admins
                WHERE email = ?;
            `, [username]);

            const accountValid = compareSync(password.toString(), result[0].password);
            if (result.length < 1 || !accountValid) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);

            const token = encodeToken({
                type: `admin`,
                admin_no: result[0].no,
            }, { expiresIn: '7d' });

            next({ token });
        } catch (e) {
            next(e);
        }
    },
    async setReturn({ admin, body }, { pool }, next) {
        try {
            // const admin_no = auth(admin, "admin_no");
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
                        AND status = 'wait'
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
    async setCancel({ shop, body }, { pool }, next) {
        try {
            const shop_no = auth(shop, "shop_no");
            const reservation_no = param(body, 'reservation_no');


            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE reservations SET
                    status = 'canceled'
                    WHERE
                    no = ?
                `, [reservation_no]);
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
    async getUsers({ admin, query }, { pool }, next) {
        try {
            // const admin_no = auth(admin, "admin_no");
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const users = await Users.findAndCountAll({
                where: {
                    enabled: 1
                },
                attributes: [
                    ['no', 'user_no'],
                    'email',
                    'name',
                    'phone',
                    'gender',
                    'birthday',
                    'created_datetime'
                ],
                limit: count,
                offset,
                raw: true
            });

            next({
                total_count: users.count,
                users: users.rows.map((user) => ({
                    ...user,
                    created_datetime: dayjs(user.created_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getUser({ admin, query }, { pool }, next) {

        try {
            // const admin_no = auth(admin, "admin_no");
            const user_no = param(query, 'user_no');

            const user = await Users.findOne({
                where: {
                    enabled: 1
                },
                attributes: [
                    ['no', 'user_no'],
                    'email',
                    'name',
                    'phone',
                    'gender',
                    'birthday',
                    'created_datetime'
                ],
                raw: true
            });

            next({
                ...user,
                created_datetime: dayjs(user.created_datetime).format(`M월 D일(ddd) a h시 m분`),
            });
        } catch (e) {
            next(e);
        }
    },
    async getShops({ admin, query }, { pool }, next) {
        try {
            // const admin_no = auth(admin, "admin_no");
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const shops = await Shops.findAndCountAll({
                where: {
                    enabled: 1
                },
                attributes: [
                    ['no', 'shop_no'],
                    'region_no',
                    'id',
                    'name',
                    'tel',
                    'shop_image',
                    'representative_name',
                    'zone_code',
                    'road_address',
                    'road_detail_address',
                    'region_address',
                    'region_detail_address',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'created_datetime',
                ],
                limit: count,
                offset,
                raw: true
            });

            next({
                total_count: shops.count,
                shops: shops.rows.map((shop) => ({
                    ...shop,
                    created_datetime: dayjs(shop.created_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getShop({ admin, query }, { pool }, next) {
        try {
            // const admin_no = auth(admin, "admin_no");
            const shop_no = param(query, 'shop_no');

            const shop = await Shops.findOne({
                where: {
                    enabled: 1
                },
                attributes: [
                    ['no', 'shop_no'],
                    'region_no',
                    'id',
                    'name',
                    'tel',
                    'shop_image',
                    'representative_name',
                    'zone_code',
                    'road_address',
                    'road_detail_address',
                    'region_address',
                    'region_detail_address',
                    'latitude',
                    'longitude',
                    'opening_time',
                    'closing_time',
                    'created_datetime',
                ],
                raw: true
            });

            next({
                ...shop,
                created_datetime: dayjs(shop.created_datetime).format(`M월 D일(ddd) a h시 m분`),
            });
        } catch (e) {
            next(e);
        }
    },
    async setAgreed({ admin, body, query }, { pool }, next) {
        try {
            const admin_no = auth(admin, "admin_no");
            const reservation_no = param(body, "reservation_no");
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE
                    reservations
                    SET status = 'agreed'
                    WHERE no = ?
                `, [reservation_no]);
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


    async mvpGetPreConfirmedReservation(req, { pool }, next) {
        try {
            const [preConfirmedResult] = await pool.query(`
            SELECT
            r.no AS reservation_no,
            r.total_purchase_price,
            r.total_purchase_quantity,
            r.bank,
            r.depositor_name,
            r.account_number,
            u.phone_number,
            s.name AS shop_name,
            p.rest_quantity,
            p.name AS product_name
            FROM reservations as r
            LEFT OUTER JOIN user_mvp as u
            ON r.user_mvp_no = u.no
            LEFT OUTER JOIN products as p
            ON r.product_no = p.no
            LEFT JOIN shops as s
            ON r.shop_no = s.no
            WHERE r.status = 'pre_confirmed'
            AND r.enabled = 1
            AND u.enabled = 1
            AND p.enabled = 1
            AND s.enabled = 1;
            
       `);
            const [confirmedResult] = await pool.query(`
            SELECT
            r.no AS reservation_no,
            r.total_purchase_price,
            r.total_purchase_quantity,
            r.bank,
            r.depositor_name,
            r.account_number,
            u.phone_number,
            s.name AS shop_name,
            p.rest_quantity,
            p.name AS product_name
            FROM reservations as r
            LEFT OUTER JOIN user_mvp as u
            ON r.user_mvp_no = u.no
            LEFT OUTER JOIN products as p
            ON r.product_no = p.no
            LEFT JOIN shops as s
            ON r.shop_no = s.no
            WHERE r.status = 'ongoing'
            AND r.enabled = 1
            AND u.enabled = 1
            AND p.enabled = 1
            AND s.enabled = 1;
            
        `);
            next({
                preConfirmedList: preConfirmedResult,
                confirmedList: confirmedResult
            });
        } catch (e) {
            next(e);
        }
    },

    async mvpPatchPreConfirmedReservation({ body }, { pool }, next) {
        const reservation_no = param(body, 'reservation_no');

        try {
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                const [patchResult] = await connection.query(`
                    UPDATE reservations as r
                    SET r.status = 'ongoing'
                    WHERE r.no = ?
                    AND r.enabled = 1
                `, reservation_no);

                const [result] = await connection.query(`
                    SELECT 
                    r.depositor_name,
                    u.phone_number,
                    p.name as 'product_name',
                    r.total_purchase_quantity,
                    r.total_purchase_price,
                    p.expiry_datetime,
                    p.pickup_start_datetime,
                    p.pickup_end_datetime,
                    p.return_price,
                    s.region_address,
                    s.tel,
                    s.name as 'shop_name'
                    FROM reservations as r
                    JOIN shops as s
                    ON r.shop_no = s.no
                    JOIN products as p
                    ON r.product_no = p.no
                    JOIN user_mvp as u
                    ON r.user_mvp_no = u.no
                    WHERE r.no = ?
                `, [reservation_no]);

                const depositor_name = result[0].depositor_name;
                const phone_number = result[0].phone_number;
                const product_name = result[0].product_name;
                const total_purchase_quantity = result[0].total_purchase_quantity;
                const total_purchase_price = result[0].total_purchase_price;
                const expiry_datetime = dayjs(result[0].expiry_datetime).format(`YYYY-MM-DD(ddd) a h:mm`);
                const pickup_start_datetime = dayjs(result[0].pickup_start_datetime).format(`YYYY-MM-DD(ddd) a h:mm`);
                const pickup_end_datetime = dayjs(result[0].pickup_end_datetime).format(`YYYY-MM-DD(ddd) a h:mm`);
                const return_price = result[0].return_price;
                const region_address = result[0].region_address;
                const shop_name = result[0].shop_name;
                const tel = result[0].tel;

                const kakaoResult = await send({
                    messages: [{
                        to: `${phone_number}`,
                        from: `01043987759`,
                        kakaoOptions: {
                            pfId: solapi.pfId,
                            templateId: solapi.reservationConfirmTemplate,
                            variables: {
                                '#{예금주명}': `${depositor_name}`,
                                '#{상품명}': `${product_name}`,
                                '#{가게명}': `${shop_name}`,
                                '#{총구매수량}': `${total_purchase_quantity}`,
                                '#{총구매가격}': `${total_purchase_price}`,
                                '#{예약마감시간}': `${expiry_datetime}`,
                                '#{수령시작시간}': `${pickup_start_datetime}`,
                                '#{수령마감시간}': `${pickup_end_datetime}`,
                                '#{가게주소}': `${region_address}`,
                                '#{가게전화번호}': `${tel}`,
                                '#{개당환급금}': `${return_price}`
                            }
                        }
                    }]
                });

                if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');


                // const [temp] = await connection.query(`
                //     SELECT
                //     r.depositor_name,
                //     u.phone_number,
                //     p.name,
                //     r.total_purchase_quantity ,
                //     p.expiry_datetime
                //     FROM reservations as r
                //     JOIN products as p
                //     ON p.no = r.product_no
                //     JOIN user_mvp as u
                //     ON r.user_mvp_no = u.no
                //     WHERE r.no = ?
                // `, [reservaton_no]);
                // let tempMessage = temp[0];
                // tempMessage["expiry_datetime"] = dayjs(tempMessage["expiry_datetime"]).format(`YYYY-MM-DD(ddd) a h:mm`);

                // console.log(JSON.stringify(tempMessage));


                await connection.commit();


                next({ message: "이체 확인 상태로 변경되었습니다." });
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
    async mvpDeletePreConfirmedReservation({ body }, { pool }, next) {
        const reservation_no = param(body, 'reservation_no');

        try {
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                const [result] = await connection.query(`
                    SELECT 
                    r.total_purchase_quantity, 
                    r.product_no, 
                    r.depositor_name, 
                    u.phone_number,
                    p.name as 'product_name' 
                    FROM reservations as r
                    JOIN products as p
                    ON r.product_no = p.no
                    JOIN user_mvp as u
                    ON r.user_mvp_no = u.no
                    WHERE
                    r.no = ?
                    AND r.enabled = 1
                `, [reservation_no]);

                const depositor_name = result[0].depositor_name;
                const product_name = result[0].product_name;
                const phone_number = result[0].phone_number;

                //  에러 처리 필요하면 

                await connection.query(`
                    UPDATE reservations as r
                    SET r.enabled = 0
                    WHERE r.no = ?
                    AND r.enabled = 1
                `, reservation_no);
                await connection.query(`
                    UPDATE products as p
                    SET rest_quantity = rest_quantity + ?
                    WHERE no = ?
                    AND p.enabled = 1
                `, [
                    result[0].total_purchase_quantity,
                    result[0].product_no
                ]);

                const kakaoResult = await send({
                    messages: [{
                        to: `${phone_number}`,
                        from: `01043987759`,
                        kakaoOptions: {
                            pfId: solapi.pfId,
                            templateId: solapi.reservationCancelTemplate,
                            variables: {
                                '#{예금주명}': `${depositor_name}`,
                                '#{상품명}': `${product_name}`
                            }
                        }
                    }]
                });

                if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');

                await connection.commit();


                next({ message: "예약 취소 되었습니다." });
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
    async mvpGetNoActualQuantityProduct(req, { pool }, next) {
        try {
            const [productsResult] = await pool.query(`
                SELECT 
                p.no AS 'product_no',
                p.name AS 'product_name',
                s.name AS 'shop_name',
                p.expected_quantity,
                p.rest_quantity,
                p.expiry_datetime,
                p.pickup_start_datetime,
                p.pickup_end_datetime,
                p.discounted_price
                FROM products as p
                JOIN shops as s
                ON p.shop_no = s.no
                WHERE actual_quantity IS NULL
                AND p.enabled = 1
                AND s.enabled = 1
                ORDER BY p.expiry_datetime ASC;
            `);

            next({
                productList: productsResult
            });
        } catch (e) {
            next(e);
        }
    },

    async mvpPatchActualQuantityProduct({ body }, { pool }, next) {
        try {
            const actual_quantity = param(body, "actual_quantity");
            const product_no = param(body, "product_no");
            // console.log(process.env.SOLAPI_CONFIRM_PICKUP_TEMPLATE, "ENV@@");
            let pickupArray = [];
            let returnArray = [];

            const [verifyAllConfirmed] = await pool.query(`
                SELECT *
                FROM reservations as r
                WHERE r.product_no = ? 
                AND r.status = 'pre_confirmed' 
                AND r.enabled = 1
            `, [product_no]);

            if (verifyAllConfirmed.length > 0) {
                throw err(400, "승인되지 않은 예약이 있습니다.");
            }

            const [reservationResult] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                r.user_mvp_no,
                r.shop_no,
                r.product_no,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.bank,
                r.account_number,
                r.depositor_name,
                r.status,
                p.expected_quantity,
                p.return_price,
                s.name AS shop_name,
                s.tel AS shop_tel,
                CONCAT(s.road_address, ' ', s.road_detail_address) AS shop_address
                FROM reservations AS r
                JOIN products AS p
                ON r.product_no = p.no 
                JOIN shops AS s
                ON r.shop_no = s.no
                WHERE r.product_no = ?
                AND r.enabled = 1
                AND p.enabled = 1
                AND s.enabled = 1
            `, [product_no]);

            const connection = await pool.getConnection(async conn => await conn);

            try {
                if (reservationResult.length <= 0) {
                    console.log(1);
                    connection.query(`
                        UPDATE products as p
                        SET p.status = 'done', p.actual_quantity = ?
                        WHERE p.no = ?
                        AND p.enabled = 1
                    `, [actual_quantity, product_no]);
                    await connection.commit();
                    next({ message: "예약이 없어 상품 판매가 종료되었습니다." });
                }

                const expected_quantity = reservationResult[0].expected_quantity;
                const return_price = reservationResult[0].return_price;
                const shop_name = reservationResult[0].shop_name;
                const shop_tel = reservationResult[0].shop_tel;
                const shop_address = reservationResult[0].shop_address;

                if (expected_quantity < actual_quantity) {
                    throw err(400, "예상 재고보다 입력된 재고량이 더 많습니다");
                }

                let leftQuantity = actual_quantity;

                for (let r of reservationResult) {
                    let totalPurchased = r.total_purchase_quantity;
                    const productPrice = r.total_purchase_price / totalPurchased;

                    const [temp] = await connection.query(`
                        SELECT 
                        r.depositor_name,
                        u.phone_number,
                        p.name AS product_name,
                        p.pickup_start_datetime,
                        p.pickup_end_datetime
                        FROM reservations AS r
                        JOIN products AS p
                        ON r.product_no = p.no
                        JOIN user_mvp AS u
                        ON r.user_mvp_no = u.no
                        WHERE r.no = ?
                        AND r.enabled = 1
                        AND p.enabled = 1
                        AND u.enabled = 1
                    `, [r.reservation_no]);

                    temp[0].pickup_start_datetime = dayjs(temp[0].pickup_start_datetime).format(`YYYY-MM-DD(ddd) a h:mm`);
                    temp[0].pickup_end_datetime = dayjs(temp[0].pickup_end_datetime).format(`YYYY-MM-DD(ddd) a h:mm`);

                    if (totalPurchased <= leftQuantity) {
                        leftQuantity -= totalPurchased;
                        await connection.query(`
                            INSERT INTO orders (
                                reservation_no,
                                product_no,
                                user_mvp_no,
                                shop_no,
                                purchase_quantity,
                                purchase_price,
                                return_price,
                                status
                            ) 
                            VALUES(?,?,?,?,?,?,?,?)
                        `, [
                            r.reservation_no,
                            r.product_no,
                            r.user_mvp_no,
                            r.shop_no,
                            totalPurchased,
                            r.total_purchase_price,
                            0,
                            "pre_pickup"
                        ]);
                        let tempPickup = {
                            ...temp[0],
                            total_purchase_quantity: totalPurchased
                        };
                        pickupArray.push(tempPickup);
                    } else {
                        if (leftQuantity > 0) {
                            await connection.query(`
                                INSERT INTO orders (
                                    reservation_no,
                                    product_no,
                                    user_mvp_no,
                                    shop_no,
                                    purchase_quantity,
                                    purchase_price,
                                    return_price,
                                    status
                                ) 
                                VALUES(?,?,?,?,?,?,?,?)
                        `, [
                                r.reservation_no,
                                r.product_no,
                                r.user_mvp_no,
                                r.shop_no,
                                leftQuantity,
                                leftQuantity * productPrice,
                                0,
                                "pre_pickup"
                            ]);
                            let tempPickup = {
                                ...temp[0],
                                total_purchase_quantity: leftQuantity
                            };
                            pickupArray.push(tempPickup);
                            totalPurchased -= leftQuantity;
                            leftQuantity = 0;
                        }

                        if (totalPurchased > 0) {
                            await connection.query(`
                            INSERT INTO orders (
                                reservation_no,
                                product_no,
                                user_mvp_no,
                                shop_no,
                                purchase_quantity,
                                purchase_price,
                                return_price,
                                status
                            ) 
                            VALUES(?,?,?,?,?,?,?,?)
                        `, [
                                r.reservation_no,
                                r.product_no,
                                r.user_mvp_no,
                                r.shop_no,
                                totalPurchased,
                                0,
                                totalPurchased * (productPrice + return_price),
                                "pre_return"
                            ]);
                            let tempReturn = {
                                ...temp[0],
                                total_purchase_quantity: totalPurchased,
                                total_return_price: totalPurchased * (productPrice + return_price)
                            };
                            returnArray.push(tempReturn);
                        }
                    }
                    await connection.query(`
                        UPDATE reservations as r
                        SET r.status = "waiting"
                        WHERE r.no = ?
                        AND r.enabled = 1;
                        UPDATE products as p
                        SET p.actual_quantity = ?
                        WHERE p.no = ?
                        AND p.enabled = 1;
                    `, [r.reservation_no, actual_quantity, product_no]);
                }

                /**
                 * 배열돌면서 쏘는 방식이 아니라
                 * 솔라피에 배열 방식으로 넣어주는 방식으로 바꿀 예정
                 */
                for (let p of pickupArray) {
                    const {
                        phone_number,
                        depositor_name,
                        product_name,
                        total_purchase_quantity,
                        pickup_start_datetime,
                        pickup_end_datetime,
                    } = p;

                    const kakaoResult = await send({
                        messages: [
                            {
                                to: `${phone_number}`,
                                from: `01043987759`,
                                kakaoOptions: {
                                    pfId: solapi.pfId,
                                    templateId: solapi.confirmPickupTemplate,
                                    variables: {
                                        '#{예금자명}': `${depositor_name}`,
                                        '#{상품명}': `${product_name}`,
                                        '#{구매수량}': `${total_purchase_quantity}`,
                                        '#{수령시작시간}': `${pickup_start_datetime}`,
                                        '#{수령마감시간}': `${pickup_end_datetime}`,
                                        '#{가게명}': `${shop_name}`,
                                        '#{가게주소}': `${shop_address}`,
                                        '#{가게전화번호}': `${shop_tel}`
                                    }

                                }
                            }
                        ]
                    });

                    if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');

                }


                for (let r of returnArray) {
                    const {
                        phone_number,
                        depositor_name,
                        product_name,
                        total_purchase_quantity,
                        total_return_price
                    } = r;

                    const kakaoResult = await send({
                        messages: [{
                            to: `${phone_number}`,
                            from: `01043987759`,
                            kakaoOptions: {
                                pfId: solapi.pfId,
                                templateId: solapi.confirmReturnTemplate,
                                variables: {
                                    '#{예금자명}': `${depositor_name}`,
                                    '#{상품명}': `${product_name}`,
                                    '#{구매수량}': `${total_purchase_quantity}`,
                                    '#{가게명}': `${shop_name}`,
                                    '#{총환급금}': `${total_return_price}`
                                }
                            }
                        }]
                    });

                    if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');
                }

                next({ message: "성공적으로 처리되었습니다" });
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

    async mvpGetOrderPreStatus(req, { pool }, next) {
        try {
            const [orderResult] = await pool.query(`
            SELECT 
            o.no AS order_no,
            r.depositor_name,
            u.phone_number,
            r.account_number,
            s.name AS shop_name,
            p.name AS product_name,
            o.purchase_quantity,
            o.purchase_price,
            o.return_price,
            o.status,
            r.bank
            FROM orders AS o
            JOIN reservations AS r
            ON o.reservation_no = r.no
            JOIN user_mvp AS u
            ON o.user_mvp_no = u.no
            JOIN products AS p
            ON o.product_no = p.no
            JOIN shops AS s
            ON o.shop_no = s.no
            WHERE o.status = "pre_pickup" OR o.status = "pre_return"
            AND o.enabled = 1
            AND r.enabled = 1
            AND u.enabled = 1
            AND p.enabled = 1
            AND s.enabled = 1
            `);

            next(orderResult);
        } catch (e) {
            next(e);
        }
    },

    async mvpPatchOrderPreStatus({ body }, { pool }, next) {
        try {
            const order_no = param(body, 'order_no');
            const connection = await pool.getConnection(async conn => await conn);

            await connection.beginTransaction();
            try {
                const [orderResult] = await connection.query(`
                    SELECT 
                    o.status,
                    o.reservation_no,
                    o.product_no,
                    o.return_price AS total_return_price,
                    r.depositor_name,
                    u.phone_number
                    FROM orders AS o
                    JOIN reservations AS r
                    ON o.reservation_no = r.no
                    JOIN user_mvp AS u
                    ON o.user_mvp_no = u.no
                    WHERE o.no = ? 
                    AND (o.status = 'pre_pickup' OR o.status = 'pre_return')
                    AND o.enabled = 1
                    AND r.enabled = 1
                    AND u.enabled = 1;
                `, [order_no]);

                const order_status = orderResult[0].status; // 상태 추출
                const reservation_no = orderResult[0].reservation_no;
                const product_no = orderResult[0].product_no;
                const total_return_price = orderResult[0].total_return_price;
                const depositor_name = orderResult[0].depositor_name;
                const phone_number = orderResult[0].phone_number;
                const update_status = order_status === 'pre_pickup' ? 'pickup' : 'return';

                await connection.query(`
                    UPDATE orders as o
                    SET status = ?
                    WHERE no = ?
                    AND o.enabled = 1
                `, [update_status, order_no]);

                const [reservationTemp] = await connection.query(`
                    SELECT *
                    FROM orders AS o
                    WHERE o.reservation_no = ? 
                    AND (o.status = 'pre_pickup' OR o.status = 'pre_return')
                    AND o.enabled = 1
                `, [reservation_no]);

                const reservationCount = reservationTemp.length;

                if (update_status === 'return') {
                    const kakaoResult = await send({
                        messages: [{
                            to: `${phone_number}`,
                            from: `01043987759`,
                            kakaoOptions: {
                                pfId: solapi.pfId,
                                templateId: solapi.returnCompleteTemplate,
                                variables: {
                                    '#{예금자명}': `${depositor_name}`,
                                    '#{총환급금}': `${total_return_price}`
                                }
                            }
                        }]
                    });
                    if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');

                }

                // 픽업 대기나 환급 대기가 있는 상황
                if (reservationCount > 0) {
                    await connection.commit();

                    next({ message: "입력이 완료되었습니다" });
                }

                // 픽업 대기나 환급 대기가 더 이상 없는 상황(예약 종료 처리)
                await connection.query(`
                    UPDATE reservations as r
                    SET status = 'done'
                    WHERE no = ? 
                    AND r.enabled = 1
                `, [reservation_no]);

                // 예약 종료가 되지 않은 상품이 있는지 확인
                const [productTemp] = await connection.query(`
                    SELECT *
                    FROM reservations AS r
                    WHERE r.product_no = ? 
                    AND r.status != 'done'
                    AND r.enabled = 1
                `, [product_no]);

                if (productTemp.length > 0) {
                    await connection.commit();
                    next({ message: "입력이 완료되었습니다" });
                }

                // 상품 마감 처리
                await connection.query(`
                    UPDATE products as p
                    SET status = 'done'
                    WHERE no = ? 
                    AND p.enabled = 1
                `, [product_no]);

                await connection.commit();
                next({ message: "입력이 완료되었습니다" });
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();
            }
        } catch (e) {
            next(e);
        }
    }

};

module.exports = controller;

