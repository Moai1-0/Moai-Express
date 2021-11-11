const err = require('http-errors');
const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { Users, Shops, sequelize } = require('../models');
const dayjs = require('dayjs');

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
            const email = param(body, 'email');
            const password = param(body, 'password');

            const [result] = await pool.query(`
                SELECT
                *
                FROM admins
                WHERE email = ?;
            `, [email]);

            const accountValid = compareSync(password.toString(), result[0].password);
            if (result.length < 1 || !accountValid) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);

            const token = encodeToken({
                type: `admin`,
                shop_no: result[0].no,
                email: result[0].email
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
        console.log(1123);
        try {
           const [preConfirmedResult] = await pool.query(`
                SELECT r.no, r.total_purchase_price, r.total_purchase_quantity, p.name, u.phone_number
                FROM reservations as r
                LEFT OUTER JOIN user_mvp as u
                ON r.user_mvp_no = u.no
                LEFT OUTER JOIN products as p
                ON r.product_no = p.no
                WHERE r.status = 'pre_confirmed'
           `);
           next(preConfirmedResult); 
        } catch (e) {
            next(e);
        }
    },

    async mvpPatchPreConfirmedReservation({ body }, {pool}, next) {
        const rNo = param(body, 'no');

        try {
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                const [patchResult] = await connection.query(`
                    UPDATE reservations as r
                    SET r.status = 'ongoing'
                    WHERE r.no = ?
                `, rNo);

                await connection.commit();
                next({ message: "이체 확인 상태로 변경되었습니다." })
            } catch(e) {
                await connection.rollback();
                next(e)
            } finally {
                connection.release();
            }
        } catch(e) {
            next(e)
        }
        
    },

    async mvpGetNoActualQuantityProduct(req, { pool }, next) {
        try {
            const [productsResult] = await pool.query(`
                SELECT p.no AS 'product_no', p.name AS 'product_name', s.name AS 'shop_name', p.expected_quantity AS 'expected_quantity'
                FROM products as p
                JOIN shops as s
                ON p.no = s.no
                WHERE actual_quantity IS NULL
            `)
            next(productsResult)
        } catch(e) {
            next(e)
        }
    },

    async mvpPatchActualQuantityProduct ({ body }, { pool }, next) {
        const actualQuantity = param(body, "actual_quantity");
        const expectedQuantity = param(body, 'expected_quantity');
        const productId = param(body, "product_id");
        

        try {
            if (expectedQuantity < actualQuantity) {
                throw err(400, "예상 재고보다 입력된 재고량이 더 많습니다");
            }
            
            const [reservationResult] = await pool.query(`
                SELECT *
                FROM reservations as r 
                WHERE r.product_no = ?
            `, [productId]);

            const connection = await pool.getConnection(async conn => await conn);

            try {
                if (reservationResult.count <= 0) {
                    connection.query(`
                        UPDATE products as p
                        SET p.status = 'done'
                        WHERE p.no = ?
                    `, [productId])
                    next("예약이 없어 상품 판매가 종료되었습니다.")
                } 
                
                let count = actualQuantity

                for (const r of reservationResult) {
                    let totalPurchased = r.total_purchase_quantity
                    const productPrice = r.total_purchase_price / totalPurchased


                    if (totalPurchased <= count) {
                        count -= totalPurchased
                        await connection.query( `
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
                            r.no,
                            r.product_no,
                            r.user_mvp_no,
                            r.shop_no,
                            totalPurchased,
                            r.total_purchase_price,
                            0,
                            "pre_pickup"
                        ]);
                    } else {
                        if (count > 0) {
                            await connection.query( `
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
                            r.no,
                            r.product_no,
                            r.user_mvp_no,
                            r.shop_no,
                            count,
                            count * productPrice,
                            0,
                            "pre_pickup"
                        ]);
                            totalPurchased -= count
                            count = 0
                        }
                        if (totalPurchased > 0 ) {
                            await connection.query( `
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
                            r.no,
                            r.product_no,
                            r.user_mvp_no,
                            r.shop_no,
                            totalPurchased,
                            0,
                            totalPurchased*productPrice,
                            "pre_return"
                        ]);
                        }
                    }
                    await connection.query(`
                        UPDATE reservations as r
                        SET r.status = "waiting"
                        WHERE r.no = ?
                    `,[r.no]);

                    await connection.query(`
                        UPDATE products as p
                        SET p.actual_quantity = ?
                        Where p.no = ?
                    `, [actualQuantity, productId]);

                    next("성공적으로 처리되었습니다");
                }
            } catch (e) {
                connection.rollback();
                next(e)
            } finally {
                connection.release();
            }

        } catch (e) {
            next(e)
        }

    },

    
};

module.exports = controller;

// const makeOrderSQL = (r, quantity, singlePrice, isReturn) => {

//     console.log();
//     let sql = `
//     INSERT INTO orders (
//         reservation_no,
//         product_no,
//         user_mvp_no,
//         shop_no,
//         purchase_quantity,
//         purchase_price,
//         return_price,
//         status
//     ) 
//     VALUES(
//         ${r.no},
//         ${r.product_no},
//         ${r.user_mvp_no},
//         ${r.shop_no},
//         ${quantity},
//         ${isReturn ? 0 :quantity * singlePrice},
//         ${isReturn ? quantity * singlePrice : 0},
//         ${isReturn ? 'pre_return' : 'pre_pickup'})
//     `
//     return sql
// }

/*
최종재고입력해야 하는 상품 리스트업

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
*/
