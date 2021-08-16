const err = require('http-errors');
const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');

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
            const admin_no = auth(admin, "admin_no");
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

};

module.exports = controller;