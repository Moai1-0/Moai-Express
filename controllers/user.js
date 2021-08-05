const err = require('http-errors');
const dayjs = require('dayjs');
require('dayjs/locale/ko');
dayjs.locale('ko');
const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const check = require('../utils/check');


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
                FROM products
                WHERE enabled = 1;

                SELECT
                p.no AS product_no,
                i.path,
                p.shop_no,
                p.name AS prduct_name,
                p.rest_quantity,
                p.regular_price,
                p.discounted_price,
                p.expiry_datetime
                FROM products AS p
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
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
                WHERE p.no = ?
                AND p.enabled = 1
                AND s.enabled = 1;
            `, [ product_no, product_no ]);
            
            if (result[0].length < 1) throw err(404, `상품이 삭제되었거나 존재하지 않습니다.`);

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
    async signup({ body }, { pool }, next) {
        try {
            /**
             * 임시 코드
             */
            const type = param(body, 'type', 'normal');
            condition.contains(type, [ 'normal', 'kakao', 'naver', 'facebook', 'google', 'apple' ]);
            const email = param(body, 'email');
            const password = type === 'normal' ? param(body, 'password') : null;
            const sns_id = type !== 'normal' ? param(body, 'sns_id') : null;
            const name = param(body, 'name');
            const phone = param(body, 'phone');
            const birthday = param(body, 'birthday', birthday => parser.emptyToNull(birthday));
            const gender = param(body, 'gender', null);
            condition.contains(gender, [ 'male', 'female', 'etc', null ]);
            const bank = param(body, 'bank'); // https://superad.tistory.com/229 (개설기관 표준코드)
            // condition check needed
            const account_number = param(body, 'account_number');
            // account_number check needed

            let salt = null;
            let hashedPassword = null;
            
            if (!check.phone(phone)) throw err(400, `핸드폰 번호가 올바르지 않습니다. 핸드폰 번호를 확인하세요.`);
            if (!check.email(email)) throw err(400, `이메일을 정확히 입력하세요.`);
            if (password) {
                if (!check.password(password)) throw err(400, `패스워드를 정확히 입력하세요.`);
                salt = genSaltSync(10);
                hashedPassword = hashSync(password, salt);
            }

            const [ results1 ] = await pool.query(`
            SELECT
            COUNT(*) AS 'count'
            FROM users
            WHERE enabled = 1
            AND phone = ?;

            SELECT
            COUNT(*) AS 'count'
            FROM users
            WHERE enabled = 1
            AND email = ?;

            SELECT
            COUNT(*) AS 'count'
            FROM users AS a
            JOIN user_sns_data AS b
            ON a.no = b.user_no
            WHERE b.id = ?
            AND b.type = ?
            AND a.enabled = 1
            AND b.enabled = 1;
            `, [ phone, email, sns_id, type ]);

            if (results1[0][0].count > 0) throw err(400, `이미 가입된 핸드폰 번호입니다. 다른 핸드폰 번호를 입력하세요.`);
            if (results1[1][0].count > 0) throw err(400, `이미 가입된 이메일 입니다. 다른 이메일을 입력하세요.`);
            if (results1[2][0].count > 0) throw err(400, `이미 가입된 ${type} 계정 입니다. 다른 계정을 통해 가입을 진행하세요.`);

            let user_no = null;
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                if (type === 'normal') {
                    const [ result ] = await connection.query(`
                        INSERT INTO users (
                            email,
                            password,
                            phone,
                            name,
                            birthday,
                            gender
                        )
                        VALUES (?, ?, ?, ?, ?, ?);
                    `, [ email, hashedPassword, phone, name, birthday, gender ]);
                    user_no = result.insertId;
                } else {
                    const [ result ] = await connection.query(`
                        INSERT INTO users (
                            email,
                            phone,
                            name,
                            birthday,
                            gender
                        )
                        VALUES
                        (?, ?, ?, ?, ?);
                    `, [ email, phone, name, birthday, gender ]);
                    await connection.query(`
                        INSERT INTO user_sns_data (user_no, type, id) 
                        VALUES
                        (?, ?, ?);
                    `, [ result.insertId, type, sns_id ]);
                    user_no = result.insertId;
                }
                await connection.query(`
                    INSERT INTO accounts (
                        user_no,
                        bank,
                        account_number
                    )
                    VALUES
                    (?, ?, ?);
                `, [ user_no, bank, account_number ]);
                await connection.query(`
                    INSERT INTO point_accounts (user_no)
                    VALUES (?)
                `, [ user_no ]);

                await connection.commit();
                next({ message: "가입되었습니다." });
            } catch (e) {
                await connection.rollback();
                next(e);
            } finally {
                connection.release();}
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
            const product_no = param(body, 'product_no');
            const depositor_name = param(body, 'depositor_name');
            const account_number = param(body, 'account_number');
            const total_purchase_quantity = param(body, 'total_purchase_quantity');
            const total_purchase_price = param(body, 'total_purchase_price');
            const [ result1 ] = await pool.query(`
                SELECT *
                FROM users
                WHERE phone = ?
                AND name = ?
                AND enabled = 1;
            `, [ phone, name ]);
            
            const connection = await pool.getConnection(async conn => await conn);
            try {
                let user_no = null;
                await connection.beginTransaction();

                if (result1[0].length < 1) {
                    const [ result2 ] = await connection.query(`
                        INSERT INTO users (
                            name,
                            phone
                        )
                        VALUES (?, ?);
                    `, [ name, phone ]);
                    user_no = result2.insertId;
                } else {
                    user_no = result1[0].no;
                }
                const [ result3 ] = await connection.query(`
                    SELECT
                    rest_quantity
                    FROM products
                    WHERE no = ?
                    AND enabled = 1;
                `, [ product_no ]);

                if (result3[0].rest_quantity < total_purchase_quantity) throw err(400, `잔여 재고가 부족합니다.`);

                await connection.query(`
                    INSERT INTO reservations (
                        user_no,
                        shop_no,
                        product_no,
                        depositor_name,
                        account_number,
                        total_purchase_quantity,
                        total_purchase_price
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                `, [ user_no, shop_no, product_no, depositor_name, account_number, total_purchase_quantity, total_purchase_price ]);
                
                await connectionx.query(`
                    UPDATE
                    products
                    SET rest_quantity = rest_quantity - ?
                    WHERE no = ?
                    AND enabled = 1;
                `, [ total_purchase_quantity, product_no]);

                await connection.commit();
                next({ message: "예약되었습니다." });
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
    async cancelReservation({ user, body }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const reservation_no = param(body, 'reservation_no');

            const [ result ] = await pool.query(`
                SELECT
                user_no,
                status
                FROM
                reservations
                WHERE no = ?
                AND enabled = 1;
            `, [ reservation_no ]);

            if (result.length < 1 || result[0].status === 'canceled') throw err(400);
            if (result[0].user_no !== user_no) throw err(401);
            
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE
                    reservations
                    SET status = 'canceled'
                    WHERE no = ?
                    AND enabled = 1
                `, [reservation_no]);
                
                await connection.commit();
                next({ message: "취소되었습니다." });
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
    async confirmUser({ body }, { pool }, next) {
        try {
            const name = param(body, 'name');
            const phone = param(body, 'phone'); // DB 내 phone에 인덱스 설정 필요

            const [ result ] = await pool.query(`
                SELECT
                no AS user_no
                FROM users
                WHERE phone = ?
                AND name = ?
                AND enabled = 1;
            `, [phone, name]);

            if (result[0].length < 1) throw err(400, `이름 또는 전화번호가 일치하지 않습니다.`);
            const token = encodeToken({ type: `customer`, user_no: result[0].user_no }, { expiresIn: '10m' });

            next({ token });
        } catch (e) {
            next(e);
        }
    },
    async getReservationHistory({ user }, { pool }, next) {
        try {
            /**
             * 페이지네이션 추가
             */
            const user_no = auth(user, 'user_no');

            const [ results ] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                p.no AS product_no,
                i.path,
                r.created_datetime,
                p.pickup_datetime,
                p.expiry_datetime
                FROM reservations AS r
                JOIN products AS p
                ON r.product_no = p.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                WHERE r.user_no = ?
                AND r.status = 'ongoing'
                AND r.enabled = 1;
            `, [ user_no ]);

            next({
                reservations: results.map((reservation) => ({
                    ...reservation,
                    created_datetime: dayjs(reservation.created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    pickup_datetime: dayjs(reservation.pickup_datetime).format(`M월 D일(ddd) a h시 m분`),
                    expiry_datetime: dayjs(reservation.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getPurchaseHistory({ user }, { pool }, next) {
        try {
            /**
             * 페이지네이션 추가
             */
            const user_no = auth(user, 'user_no');
            
            const [ results ] = await pool.query(`
                SELECT
                o.no AS order_no,
                p.no AS product_no,
                o.reservation_no,
                i.path,
                o.status,
                o.purchase_price,
                o.purchase_quantity,
                o.return_price,
                o.created_datetime,
                p.pickup_datetime,
                p.expiry_datetime
                FROM orders as o
                JOIN products as p
                ON o.product_no = p.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                WHERE o.user_no = ?
                AND p.enabled = 1
                AND o.enabled = 1
                ORDER BY o.created_datetime DESC
            `, [ user_no ]);

            next({
                orders: results.map((order) => ({
                    ...order,
                    created_datetime: dayjs(order.created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    pickup_datetime: dayjs(order.pickup_datetime).format(`M월 D일(ddd) a h시 m분`),
                    expiry_datetime: dayjs(order.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
}

module.exports = controller;