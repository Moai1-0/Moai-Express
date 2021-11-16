const err = require('http-errors');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);
require('dayjs/locale/ko');
dayjs.locale('ko');

const { auth, param, parser, condition } = require('../utils/params');
const { encodeToken } = require('../utils/token');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const check = require('../utils/check');
const fb = require('../utils/firebase');
const mailer = require('../utils/mailer');
const { generateRandomCode } = require('../utils/random');
const { send, sendKakaoMessage } = require('../utils/solapi');
const { scheduleJob } = require('../utils/scheduler');

const template = require('../config/template');
const bankCode = require('../config/bankCode.json');

// db-api 상수
const productLogAPI = require("../db_api/product_log_api");
const reservationLogApi = require("../db_api/reservation_log_api");
const authenticationLogApi = require("../db_api/authentication_log_api.js");
const pointLogApi = require("../db_api/point_log_api");

const PAGINATION_COUNT = 5;
const BASE_URL = `https://aws-s3-hufsalumnischolarship-test.s3.ap-northeast-2.amazonaws.com`;

const controller = {
    async controllerFormat({ user, body, query }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');

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
    async getProducts({ query }, { pool }, next) {
        try {
            // const region_no = param(query, 'region_no', 0); // 0:광장동
            const sort = param(query, 'sort', 'impending');
            condition.contains(sort, ['impending', 'descending', 'discount_rate']);
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const [result] = await pool.query(`
                SELECT
                p.no AS product_no,
                p.name AS product_name,
                p.regular_price,
                p.discounted_price,
                p.discount_rate,
                p.return_price,
                p.rest_quantity,
                p.expiry_datetime,
                s.no AS shop_no,
                s.name AS shop_name,
                i.path
                FROM products AS p
                JOIN shops AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                WHERE p.actual_quantity IS NULL
                AND p.expiry_datetime - NOW() > 0
                AND p.enabled = 1
                AND s.enabled = 1
                ORDER BY ${sort === 'impending' ? 'p.expiry_datetime ASC' : sort === 'descending' ? 'p.created_datetime DESC' : 'p.discount_rate DESC'}
                LIMIT ? OFFSET ?;
            `, [count, offset]);
                
            next({
                total_count: result.length,
                products: result.map((product) => ({
                    ...product,
                    regular_price: product.regular_price.toLocaleString('ko-KR'),
                    discounted_price: product.discounted_price.toLocaleString('ko-KR'),
                    return_price: product.return_price.toLocaleString('ko-KR'),
                    path: BASE_URL + product.path,
                    discount_rate: parseFloat(product.discount_rate),
                    raw_expiry_datetime: product.expiry_datetime,
                    expiry_datetime: dayjs(product.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getProduct({ query }, { pool }, next) {
        try {
            const product_no = param(query, 'product_no');
            const [result] = await pool.query(`
                SELECT
                p.no AS product_no,
                i.paths,
                p.name AS product_name,
                p.shop_no,
                s.name AS shop_name,
                s.tel,
                s.road_address,
                s.road_detail_address,
                s.region_address,
                s.region_detail_address,
                s.latitude,
                s.longitude,
                p.expected_quantity,
                p.rest_quantity,
                p.regular_price,
                p.discounted_price,
                p.return_price,
                p.discount_rate,
                p.description,
                p.expiry_datetime,
                p.pickup_start_datetime,
                p.pickup_end_datetime
                
                FROM products AS p
                JOIN shops AS s
                ON p.shop_no = s.no
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
                WHERE p.no = ?
                AND p.enabled = 1
                AND s.enabled = 1;
            `, [product_no, product_no]);

            if (result.length < 1) throw err(404, `상품이 삭제되었거나 존재하지 않습니다.`);

            next({
                ...result[0],
                discount_rate: parseFloat(result[0].discount_rate),
                paths: result[0].paths ? (result[0].paths.split(',')).map((path) => (
                    BASE_URL + path
                )) : [],
                regular_price: result[0].regular_price.toLocaleString('ko-KR'),
                discounted_price: result[0].discounted_price.toLocaleString('ko-KR'),
                return_price: result[0].return_price.toLocaleString('ko-KR'),
                raw_expiry_datetime: result[0].expiry_datetime,
                expiry_datetime: dayjs(result[0].expiry_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
                pickup_start_datetime: dayjs(result[0].pickup_start_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
                pickup_end_datetime: dayjs(result[0].pickup_end_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
                impending: dayjs(result[0].expiry_datetime).diff(dayjs(), 'hour') < 1 ? true : false
            });
        } catch (e) {
            next(e);
        }
    },
    async searchProducts({ query }, { pool }, next) {
        try {
            const q = param(query, 'q');
            const region_no = param(query, 'region_no', 0); // 0:광장동
            const sort = param(query, 'sort', 'descending');
            condition.contains(sort, ['descending', 'impending', 'discount_rate']);
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const [results] = await pool.query(`
                SELECT
                COUNT(*) AS total_count
                FROM (
                    SELECT * FROM (
                        SELECT
                        p.no AS product_no,
                        p.name AS product_name,
                        p.rest_quantity,
                        p.regular_price,
                        p.discounted_price,
                        p.discount_rate,
                        p.expiry_datetime,
                        i.path,
                        s.no AS shop_no,
                        s.name AS shop_name
                        FROM (
                            SELECT
                            no,
                            name,
                            shop_no,
                            rest_quantity,
                            regular_price,
                            discounted_price,
                            discount_rate,
                            expiry_datetime
                            FROM products
                            WHERE MATCH(name)
                            AGAINST(${pool.escape(q)} IN BOOLEAN MODE)
                            AND enabled = 1
                        ) AS p
                        JOIN (
                            SELECT
                            no,
                            name
                            FROM shops
                            WHERE region_no = ${pool.escape(region_no)}
                            AND enabled = 1
                        ) AS s
                        ON p.shop_no = s.no
                        LEFT JOIN (
                            SELECT
                            product_no,
                            path
                            FROM product_images
                            WHERE enabled = 1
                            AND sort = 1
                        ) AS i
                        ON p.no = i.product_no
                    ) AS by_product_name
                    UNION
                    SELECT * FROM (
                        SELECT
                        p.no AS product_no,
                        p.name AS product_name,
                        p.rest_quantity,
                        p.regular_price,
                        p.discounted_price,
                        p.discount_rate,
                        p.expiry_datetime,
                        i.path,
                        s.no AS shop_no,
                        s.name AS shop_name
                        FROM (
                            SELECT
                            no,
                            name,
                            shop_no,
                            rest_quantity,
                            regular_price,
                            discounted_price,
                            discount_rate,
                            expiry_datetime
                            FROM products
                            WHERE enabled = 1
                        ) AS p
                        JOIN (
                            SELECT
                            no,
                            name
                            FROM shops
                            WHERE MATCH(name)
                            AGAINST(${pool.escape(q)} IN BOOLEAN MODE)
                            AND region_no = ${pool.escape(region_no)}
                            AND enabled = 1
                        ) AS s
                        ON p.shop_no = s.no
                        LEFT JOIN (
                            SELECT
                            product_no,
                            path
                            FROM product_images
                            WHERE enabled = 1
                            AND sort = 1
                        ) AS i
                        ON p.no = i.product_no                        
                    ) AS by_shop_name
                ) AS matched_products;

                SELECT
                product_no,
                product_name,
                rest_quantity,
                regular_price,
                discounted_price,
                discount_rate,
                expiry_datetime,
                path,
                shop_no,
                shop_name
                FROM (
                    SELECT * FROM (
                        SELECT
                        p.no AS product_no,
                        p.name AS product_name,
                        p.rest_quantity,
                        p.regular_price,
                        p.discounted_price,
                        p.discount_rate,
                        p.expiry_datetime,
                        p.created_datetime,
                        i.path,
                        s.no AS shop_no,
                        s.name AS shop_name
                        FROM (
                            SELECT
                            no,
                            name,
                            shop_no,
                            rest_quantity,
                            regular_price,
                            discounted_price,
                            discount_rate,
                            expiry_datetime,
                            created_datetime
                            FROM products
                            WHERE MATCH(name)
                            AGAINST(${pool.escape(q)} IN BOOLEAN MODE)
                            AND enabled = 1
                        ) AS p
                        JOIN (
                            SELECT
                            no,
                            name
                            FROM shops
                            WHERE region_no = ${pool.escape(region_no)}
                            AND enabled = 1
                        ) AS s
                        ON p.shop_no = s.no
                        LEFT JOIN (
                            SELECT
                            product_no,
                            path
                            FROM product_images
                            WHERE enabled = 1
                            AND sort = 1
                        ) AS i
                        ON p.no = i.product_no
                    ) AS by_product_name
                    UNION
                    SELECT * FROM (
                        SELECT
                        p.no AS product_no,
                        p.name AS product_name,
                        p.rest_quantity,
                        p.regular_price,
                        p.discounted_price,
                        p.discount_rate,
                        p.expiry_datetime,
                        p.created_datetime,
                        i.path,
                        s.no AS shop_no,
                        s.name AS shop_name
                        FROM (
                            SELECT
                            no,
                            name,
                            shop_no,
                            rest_quantity,
                            regular_price,
                            discounted_price,
                            discount_rate,
                            expiry_datetime,
                            created_datetime
                            FROM products
                            WHERE enabled = 1
                        ) AS p
                        JOIN (
                            SELECT
                            no,
                            name
                            FROM shops
                            WHERE MATCH(name)
                            AGAINST(${pool.escape(q)} IN BOOLEAN MODE)
                            AND region_no = ${pool.escape(region_no)}
                            AND enabled = 1
                        ) AS s
                        ON p.shop_no = s.no
                        LEFT JOIN (
                            SELECT
                            product_no,
                            path
                            FROM product_images
                            WHERE enabled = 1
                            AND sort = 1
                        ) AS i
                        ON p.no = i.product_no
                    ) AS by_shop_name
                )  AS matched_products
                ORDER BY ${sort === 'descending' ? 'created_datetime DESC' : sort === 'impending' ? 'expiry_datetime ASC' : 'discount_rate DESC'}
                LIMIT ? OFFSET ?;
            `, [count, offset]);

            next({
                total_count: results[0][0].total_count,
                products: results[1].map((product) => ({
                    ...product,
                    discount_rate: parseFloat(product.discount_rate),
                    expiry_datetime: dayjs(product.expiry_datetime).format(`M월 D일(ddd) a h시 m분`),
                    impending: dayjs(product.expiry_datetime).diff(dayjs(), 'hour') < 1 ? true : false
                }))
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
            condition.contains(type, ['normal', 'kakao', 'naver', 'facebook', 'google', 'apple']);
            const email = param(body, 'email');
            const password = type === 'normal' ? param(body, 'password') : null;
            const sns_id = type !== 'normal' ? param(body, 'sns_id') : null;
            const name = param(body, 'name');
            const phone = param(body, 'phone');
            const birthday = param(body, 'birthday', birthday => parser.emptyToNull(birthday));
            const gender = param(body, 'gender', null);
            condition.contains(gender, ['male', 'female', 'etc', null]);
            const bank_code = param(body, 'bank_code'); // https://superad.tistory.com/229 (개설기관 표준코드)
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

            const [results1] = await pool.query(`
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
            `, [phone, email, sns_id, type]);

            if (results1[0][0].count > 0) throw err(400, `이미 가입된 핸드폰 번호입니다. 다른 핸드폰 번호를 입력하세요.`);
            if (results1[1][0].count > 0) throw err(400, `이미 가입된 이메일 입니다. 다른 이메일을 입력하세요.`);
            if (results1[2][0].count > 0) throw err(400, `이미 가입된 ${type} 계정 입니다. 다른 계정을 통해 가입을 진행하세요.`);

            let user_no = null;
            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                if (type === 'normal') {
                    const [result] = await connection.query(`
                        INSERT INTO users (
                            email,
                            password,
                            phone,
                            name,
                            birthday,
                            gender
                        )
                        VALUES (?, ?, ?, ?, ?, ?);
                    `, [email, hashedPassword, phone, name, birthday, gender]);
                    user_no = result.insertId;
                } else {
                    const [result] = await connection.query(`
                        INSERT INTO users (
                            email,
                            phone,
                            name,
                            birthday,
                            gender
                        )
                        VALUES
                        (?, ?, ?, ?, ?);
                    `, [email, phone, name, birthday, gender]);
                    await connection.query(`
                        INSERT INTO user_sns_data (user_no, type, id) 
                        VALUES
                        (?, ?, ?);
                    `, [result.insertId, type, sns_id]);
                    user_no = result.insertId;
                }
                await connection.query(`
                    INSERT INTO accounts (
                        user_no,
                        bank_name,
                        bank_code,
                        account_number
                    )
                    VALUES
                    (?, ?, ?, ?);
                `, [user_no,
                    bankCode.filter(code => code["code"] === bank_code)[0].name,
                    bank_code,
                    account_number]);
                const [pointResult] = await connection.query(`
                    INSERT INTO point_accounts (user_no)
                    VALUES (?);
                `, [user_no]);

                await pointLogApi.postLogPointModels(pointResult.insertId,
                    0,
                    0,
                    connection);

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
    async checkEmail({ body }, { pool }, next) {
        try {
            const email = param(body, 'email');
            const [result] = await pool.query(`
                SELECT *
                FROM users
                WHERE email = ?
                AND enabled = 1
            `, [email]);
            if (result.length > 0) throw err(409, '중복된 이메일입니다.');
            next({ message: `중복되지 않은 이메일입니다.` });
        } catch (e) {
            next(e);
        }
    },
    async sendAuthCode({ body }, { pool }, next) {
        try {
            const phone = param(body, 'phone');
            const authCode = generateRandomCode(6);

            const [result] = await pool.query(`
            SELECT *
            FROM users
            WHERE phone = ?
            AND enabled = 1
            `, [phone]);
            if (result.length > 0) throw err(409, '중복된 전화번호입니다.');

            const connection = await pool.getConnection(async conn => await conn);
            try {
                fb.ref(`/auth/sms/${phone}`).set({
                    authCode
                });
                scheduleJob(dayjs().tz("Asia/Seoul").add(5, 'm').format(`YYYY-MM-DD HH:mm:ss`), () => {
                    fb.ref(`/auth/sms/${phone}`).remove();
                });
                // const res = await send({
                //     messages: [
                //         {
                //             to: phone,
                //             from: '01043987759',
                //             text: `인증번호는 ${authCode}입니다.`
                //         }
                //     ]
                // });
                // if(res.error) {
                //     throw err(400);
                // }


                // 데이터베이스 접근
                try {
                    await connection.beginTransaction();
                    // 인증번호 로그 추가 
                    await authenticationLogApi.postLogAuthentication(phone,
                        authCode,
                        connection);
                    await connection.commit();
                } catch (e) {
                    connection.rollback();
                } finally {
                    connection.release();
                }


                next({ message: `인증코드 발송에 성공했습니다.` }); // 수정
            } catch (e) {
                fb.ref(`/auth/sms/${phone}`).remove();
                next(e);
            }

            try {
                await connection.beginTransaction();
                // 인증번호 로그 추가 
                await authenticationLogApi.postLogAuthentication(phone,
                    authCode);
                await connection.commit();
            } catch (e) {
                connection.rollback();
            } finally {
                connection.release();
            }

        } catch (e) {
            next(e);
        }
    },
    async checkAuthCode({ body }, { pool }, next) {

        try {
            const phone = param(body, 'phone'); // key
            const authCode = param(body, 'authCode'); // value

            try {
                const snapshot = await fb.ref(`/auth/sms/${phone}`).get();
                if (snapshot.exists()) {
                    const cacheValue = snapshot.val().authCode;
                    if (cacheValue === authCode) {
                        fb.ref(`/auth/sms/${phone}`).remove();
                        next({ message: `인증에 성공하셨습니다.` });
                    } else {
                        throw err(400, '인증번호를 다시 요청해주세요.');
                    }
                } else {
                    throw err(400, '인증번호를 다시 요청해주세요.');
                }
            } catch (e) {
                next(e);
            }
        } catch (e) {
            next(e);
        }
    },
    async signin({ body }, { pool }, next) {
        try {
            const type = param(body, 'type', 'normal');
            condition.contains(type, ['normal', 'kakao', 'naver', 'facebook', 'google', 'apple']);
            const email = param(body, 'email', email => parser.emptyToNull(email));
            const password = param(body, 'password', password => parser.emptyToNull(password));
            const sns_id = type !== 'normal' ? param(body, 'sns_id') : null;

            if (type === 'normal') {
                const [result] = await pool.query(`
                    SELECT
                    no AS user_no,
                    email,
                    password
                    FROM users
                    WHERE email = ?
                    AND enabled = 1;
                `, [email]);

                if (result.length < 1) throw err(400, `아이디가 일치하지 않습니다.`);

                const isValid = compareSync(password.toString(), result[0].password);
                if (!isValid) throw err(400, `비밀번호가 일치하지 않습니다.`);

                const token = encodeToken({
                    type: `user`,
                    user_no: result[0].user_no,
                    email: result[0].email
                }, { expiresIn: '1d' });

                next({ token });
            } else {
                const [result] = await pool.query(`
                    SELECT
                    a.no AS 'user_no',
                    a.email
                    FROM users AS a
                    JOIN user_sns_data AS b
                    ON a.no = b.user_no
                    WHERE b.id = ?
                    AND b.type = ?
                    AND a.enabled = 1
                    AND b.enabled = 1;
                `, [sns_id, type]);

                if (result.length < 1) throw err(400, `${type} 계정을 통해 가입된 이력이 없습니다.`);

                const token = encodeToken({
                    type: `user`,
                    user_no: result[0].user_no,
                    email: result[0].email
                }, { expiresIn: '1d' });

                next({ token });
            }
        } catch (e) {
            next(e);
        }
    },
    async reserveProduct({ user, body }, { pool }, next) {
        try {
            /**
             * 임시 코드
             */
            const user_no = auth(user, 'user_no');
            const shop_no = param(body, 'shop_no');
            const product_no = param(body, 'product_no');
            const depositor_name = param(body, 'depositor_name');
            const total_purchase_quantity = param(body, 'total_purchase_quantity');
            const total_purchase_price = param(body, 'total_purchase_price');

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();

                const [result] = await connection.query(`
                    SELECT
                    discounted_price,
                    expected_quantity,
                    rest_quantity
                    FROM products
                    WHERE no = ?
                    AND enabled = 1;
                `, [product_no]);

                if (result[0].discounted_price > total_purchase_price) throw err(400, `할인가 이상을 입력해야 합니다.`);
                if (result[0].rest_quantity < total_purchase_quantity) throw err(400, `잔여 재고가 부족합니다.`);

                const [reserveResult] = await connection.query(`
                    INSERT INTO reservations (
                        user_no,
                        shop_no,
                        product_no,
                        depositor_name,
                        total_purchase_quantity,
                        total_purchase_price
                    )
                    VALUES (?, ?, ?, ?, ?, ?);
                `, [user_no, shop_no, product_no, depositor_name, total_purchase_quantity, total_purchase_price]);

                await connection.query(`
                    UPDATE
                    products
                    SET rest_quantity = rest_quantity - ?
                    WHERE no = ?
                    AND enabled = 1;
                `, [total_purchase_quantity, product_no]);

                // 상품 수량 변경 사항 로그 반영
                await productLogAPI.postLogProductQuantityModels(product_no,
                    result[0].expected_quantity,
                    null,
                    result[0].rest_quantity - total_purchase_quantity,
                    connection);
                // 예약 상태 변경 사항 로그 반영
                await reservationLogApi.postLogReservationStatusModels(reserveResult.insertId,
                    "ongoing",
                    connection);



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
    async applyForReturn({ user, body }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const return_price = param(body, 'return_price');

            const [result1] = await pool.query(`
                SELECT
                *
                FROM point_accounts
                WHERE user_no = ?
                AND enabled = 1;
            `, [user_no]);

            if (result1[0].point < return_price) throw err(400, `환급액이 잔여 포인트를 초과했습니다.`);

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                await connection.query(`
                    UPDATE
                    point_accounts
                    SET point = point - ?
                    WHERE user_no = ?
                    AND enabled = 1;

                    INSERT INTO return_statuses (
                        user_no,
                        return_price
                    )
                    VALUES (?, ?);
                `, [return_price, user_no, user_no, return_price]);



                await pointLogApi.postLogPointModels(result1[0].no,
                    -(parseInt(return_price)),
                    result1[0].point - (parseInt(return_price)),
                    connection);
                await connection.commit();

                next({ message: "환급신청이 완료되었습니다." });
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
    async getReturnAccount({ user }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');

            const [result] = await pool.query(`
                SELECT
                *
                FROM accounts
                WHERE user_no = ?
                AND enabled = 1
            `, [user_no]);

            next({
                bank_code: result[0].bank_code,
                account_number: result[0].account_number
            });
        } catch (e) {
            next(e);
        }
    },
    async editReturnAccount({ user, body }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const bank_code = param(body, 'bank_code');
            const account_number = param(body, 'account_number');

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.query(`
                    UPDATE
                    accounts
                    SET bank_code = ?
                    AND account_number = ?
                    WHERE user_no = ?
                    AND enabled = 1
                `, [bank_code, account_number, user_no]);
                await connection.commit();

                next({ message: "환급계좌 수정이 완료되었습니다." });
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
    async getReservationStatus({ user, query }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const [result] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.status AS reservation_status,
                r.created_datetime AS reservation_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                p.expiry_datetime,
                s.no AS shop_no,
                s.name AS shop_name,
                i.path
                FROM reservations AS r
                JOIN products AS p
                ON r.product_no = p.no
                JOIN shops AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE sort = 1
                ) AS i
                ON p.no = i.product_no
                WHERE r.user_no = ?
                AND (r.status = 'ongoing' OR r.status = 'waiting')
                AND r.enabled = 1
                ORDER BY r.created_datetime DESC
                LIMIT ? OFFSET ?;
                `, [user_no, count, offset]);

            next({
                reservations: result.map((reservation) => ({
                    ...reservation,
                    total_purchase_price: reservation.total_purchase_price.toLocaleString('ko-KR'),
                    raw_expiry_datetime: reservation.expiry_datetime,
                    reservation_created_datetime: dayjs(reservation.reservation_created_datetime).format(`M월 D일(ddd)`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getReservationStatusDetail({ user, query }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const reservation_no = param(query, 'reservation_no');

            const [result] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                r.status AS reservation_status,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.created_datetime,
                ppo.no AS pre_pickup_no,
                ppo.purchase_quantity AS pre_pickup_purchase_quantity,
                ppo.created_datetime AS pre_pickup_created_datetime,
                po.no AS pickup_no,
                po.purchase_quantity AS pickup_purchase_quantity,
                po.created_datetime AS pickup_created_datetime,
                pro.no AS pre_return_no,
                pro.purchase_quantity AS pre_return_purchase_quantity,
                pro.return_price AS pre_return_return_price,
                pro.created_datetime AS pre_return_created_datetime,
                ro.no AS return_no,
                ro.purchase_quantity AS return_purchase_quantity,
                ro.return_price AS return_return_price,
                ro.created_datetime AS return_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                p.pickup_start_datetime,
                p.pickup_end_datetime,
                s.no AS shop_no,
                s.name AS shop_name,
                s.tel,
                s.road_address,
                s.road_detail_address,
                s.region_address,
                s.region_detail_address,
                s.latitude,
                s.longitude,
                s.shop_image,
                s.opening_time,
                s.closing_time,             
                i.path
                FROM reservations AS r
                JOIN products as p
                ON r.product_no = p.no
                JOIN shops AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE sort = 1
                ) AS i
                ON p.no = i.product_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pre_pickup'
                    AND enabled = 1
                ) AS ppo
                ON r.no = ppo.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pickup'
                    AND enabled = 1
                ) AS po
                ON r.no = po.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pre_return'
                    AND enabled = 1
                ) AS pro
                ON r.no = pro.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'return'
                ) AS ro
                ON r.no = ro.reservation_no
                WHERE r.no = ?
                AND r.user_no = ?
                AND r.enabled = 1
                AND s.enabled = 1
                ORDER BY created_datetime DESC;
            `, [reservation_no, user_no]);

            if (result.length < 1) throw err(404, `존재하지 않는 상품현황입니다.`);

            next({
                ...result[0],
                created_datetime: dayjs(result[0].created_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
                pickup_start_datetime: dayjs(result[0].pickup_start_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
                pickup_end_datetime: dayjs(result[0].pickup_end_datetime).format(`YYYY-MM-DD(ddd) a h:mm`),
            });
        } catch (e) {
            next(e);
        }
    },

    async getOrderStatus({ user, query }, { pool }, next) {
        try {
            /**
             * 삭제 예정
             */
            const user_no = auth(user, 'user_no');
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const [results] = await pool.query(`
                SELECT
                COUNT(*) AS total_count
                FROM reservations
                WHERE user_no = ?
                AND status = 'waiting'
                AND enabled = 1;

                SELECT
                r.no AS reservation_no,
                r.status AS reservation_status,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.created_datetime AS reservation_created_datetime,
                po.no AS pickup_no,
                po.purchase_quantity AS pickup_purchase_quantity,
                po.purchase_price AS pickiup_purchase_price,
                po.created_datetime AS pickup_created_datetime,
                ro.no AS return_purchase_no,
                ro.purchase_quantity AS return_purchase_quantity,
                ro.purchase_price AS return_purchase_price,
                ro.return_price AS return_price,
                ro.created_datetime AS order_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                s.no AS shop_no,
                s.name AS shop_name,
                i.path
                FROM (
                    SELECT
                    no,
                    product_no,
                    status,
                    total_purchase_quantity,
                    total_purchase_price,
                    created_datetime
                    FROM reservations 
                    WHERE user_no = ?
                    AND status = 'waiting'
                    AND enabled = 1
                ) AS r
                JOIN (
                    SELECT
                    no,
                    name,
                    shop_no,
                    discounted_price,
                    return_price
                    FROM products
                ) as p
                ON r.product_no = p.no
                JOIN (
                    SELECT
                    no,
                    name
                    FROM shops
                    WHERE enabled = 1
                ) AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pickup'
                    AND enabled = 1
                ) AS po
                ON r.no = po.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'return'
                    AND enabled = 1
                ) AS ro
                ON r.no = ro.reservation_no
                LIMIT ? OFFSET ?;
                `, [user_no, user_no, count, offset]);

            next({
                total_count: results[0][0].total_count,
                reservations: results[1].map((reservation) => ({
                    ...reservation,
                    reservation_created_datetime: dayjs(reservation.reservation_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    pickup_created_datetime: dayjs(reservation.pickup_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    order_created_datetime: dayjs(reservation.order_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getOrderStatusDetail({ user, query }, { pool }, next) {
        try {
            /**
             * 삭제 예정
             */
            const user_no = auth(user, 'user_no');
            const reservation_no = param(query, 'reservation_no');

            const [result] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                r.status AS reservation_status,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.created_datetime AS reservation_created_datetime,
                po.no AS pickup_no,
                po.purchase_quantity AS pickup_purchase_quantity,
                po.purchase_price AS pickiup_purchase_price,
                po.created_datetime AS pickup_created_datetime,
                ro.no AS return_purchase_quantity,
                ro.purchase_quantity AS return_purchase_quantity,
                ro.purchase_price AS return_purchase_price,
                ro.return_price AS return_price,
                ro.created_datetime AS order_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                s.no AS shop_no,
                s.name AS shop_name,
                s.tel,
                s.road_address,
                s.road_detail_address,
                s.region_address,
                s.region_detail_address,
                s.latitude,
                s.longitude,
                s.shop_image,
                s.opening_time,
                s.closing_time,
                i.path
                FROM (
                    SELECT
                    no,
                    product_no,
                    status,
                    total_purchase_quantity,
                    total_purchase_price,
                    created_datetime
                    FROM reservations 
                    WHERE no = ?
                    AND user_no = ?
                    AND status = 'waiting'
                    AND enabled = 1
                ) AS r
                JOIN (
                    SELECT
                    no,
                    name,
                    shop_no,
                    discounted_price,
                    return_price
                    FROM products
                ) as p
                ON r.product_no = p.no
                JOIN (
                    SELECT
                    no,
                    name,
                    tel,
                    road_address,
                    road_detail_address,
                    region_address,
                    region_detail_address,
                    latitude,
                    longitude,
                    shop_image,
                    opening_time,
                    closing_time
                    FROM shops
                    WHERE enabled = 1
                ) AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pickup'
                    AND enabled = 1
                ) AS po
                ON r.no = po.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'return'
                    AND enabled = 1
                ) AS ro
                ON r.no = ro.reservation_no
                `, [reservation_no, user_no]);

            next({
                ...result[0],
                reservation_created_datetime: dayjs(result[0].reservation_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                pickup_created_datetime: dayjs(result[0].pickup_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                order_created_datetime: dayjs(result[0].order_created_datetime).format(`M월 D일(ddd) a h시 m분`),
            });
        } catch (e) {
            next(e);
        }
    },
    async getPurchaseHistory({ user }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const page = Number(param(query, 'page', 0));
            const count = Number(param(query, 'count', PAGINATION_COUNT));
            const offset = count * page;

            const [results] = await pool.query(`
                SELECT
                COUNT (*) AS total_count
                FROM reservations
                WHERE user_no = ?
                AND (status = 'done' OR status = 'canceled')
                AND enabled = 1;
                
                SELECT
                r.no AS reservation_no,
                r.status AS reservation_status,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.created_datetime AS reservation_created_datetime,
                po.no AS pickup_no,
                po.purchase_quantity AS pickup_purchase_quantity,
                po.purchase_price AS pickiup_purchase_price,
                po.created_datetime AS pickup_created_datetime,
                ro.no AS return_purchase_quantity,
                ro.purchase_quantity AS return_purchase_quantity,
                ro.purchase_price AS return_purchase_price,
                ro.return_price AS return_price,
                ro.created_datetime AS order_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                s.no AS shop_no,
                s.name AS shop_name,
                i.path
                FROM (
                    SELECT
                    no,
                    product_no,
                    status,
                    total_purchase_quantity,
                    total_purchase_price,
                    created_datetime
                    FROM reservations 
                    WHERE user_no = ?
                    AND (status = 'done' OR status = 'canceled')
                    AND enabled = 1
                ) AS r
                JOIN (
                    SELECT
                    no,
                    name,
                    shop_no,
                    discounted_price,
                    return_price
                    FROM products
                ) as p
                ON r.product_no = p.no
                JOIN (
                    SELECT
                    no,
                    name
                    FROM shops
                    WHERE enabled = 1
                ) AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pickup'
                    AND enabled = 1
                ) AS po
                ON r.no = po.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'return'
                    AND enabled = 1
                ) AS ro
                ON r.no = ro.reservation_no
                LIMIT ? OFFSET ?;
                `, [user_no, user_no, count, offset]);

            next({
                total_count: results[0][0].total_count,
                histories: results[1].map((history) => ({
                    ...history,
                    reservation_created_datetime: dayjs(history.reservation_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    pickup_created_datetime: dayjs(history.pickup_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                    order_created_datetime: dayjs(history.order_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                }))
            });
        } catch (e) {
            next(e);
        }
    },
    async getPurchaseHistoryDetail({ user, query }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');
            const reservation_no = param(query, 'reservation_no');

            const [result] = await pool.query(`
                SELECT
                r.no AS reservation_no,
                r.status AS reservation_status,
                r.total_purchase_quantity,
                r.total_purchase_price,
                r.created_datetime AS reservation_created_datetime,
                po.no AS pickup_no,
                po.purchase_quantity AS pickup_purchase_quantity,
                po.purchase_price AS pickiup_purchase_price,
                po.created_datetime AS pickup_created_datetime,
                ro.no AS return_purchase_quantity,
                ro.purchase_quantity AS return_purchase_quantity,
                ro.purchase_price AS return_purchase_price,
                ro.return_price AS return_price,
                ro.created_datetime AS order_created_datetime,
                p.no AS product_no,
                p.name AS product_name,
                s.no AS shop_no,
                s.name AS shop_name,
                s.tel,
                s.road_address,
                s.road_detail_address,
                s.region_address,
                s.region_detail_address,
                s.latitude,
                s.longitude,
                s.shop_image,
                s.opening_time,
                s.closing_time,
                i.path
                FROM (
                    SELECT
                    no,
                    product_no,
                    status,
                    total_purchase_quantity,
                    total_purchase_price,
                    created_datetime
                    FROM reservations 
                    WHERE no = ?
                    AND user_no = ?
                    AND (status = 'done' OR status = 'canceled')
                    AND enabled = 1
                ) AS r
                JOIN (
                    SELECT
                    no,
                    name,
                    shop_no,
                    discounted_price,
                    return_price
                    FROM products
                ) as p
                ON r.product_no = p.no
                JOIN (
                    SELECT
                    no,
                    name,
                    tel,
                    road_address,
                    road_detail_address,
                    region_address,
                    region_detail_address,
                    latitude,
                    longitude,
                    shop_image,
                    opening_time,
                    closing_time
                    FROM shops
                    WHERE enabled = 1
                ) AS s
                ON p.shop_no = s.no
                LEFT JOIN (
                    SELECT
                    product_no,
                    path
                    FROM product_images
                    WHERE enabled = 1
                    AND sort = 1
                ) AS i
                ON p.no = i.product_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'pickup'
                    AND enabled = 1
                ) AS po
                ON r.no = po.reservation_no
                LEFT JOIN (
                    SELECT
                    no,
                    reservation_no,
                    purchase_quantity,
                    purchase_price,
                    return_price,
                    created_datetime
                    FROM orders
                    WHERE status = 'return'
                    AND enabled = 1
                ) AS ro
                ON r.no = ro.reservation_no;
                `, [reservation_no, user_no]);

            next({
                ...result[0],
                reservation_created_datetime: dayjs(result[0].reservation_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                pickup_created_datetime: dayjs(result[0].pickup_created_datetime).format(`M월 D일(ddd) a h시 m분`),
                order_created_datetime: dayjs(result[0].order_created_datetime).format(`M월 D일(ddd) a h시 m분`),
            });
        } catch (e) {
            next(e);
        }
    },
    async getUserInfo({ user }, { pool }, next) {
        try {
            const user_no = auth(user, 'user_no');

            const [result] = await pool.query(`
                SELECT
                u.name,
                u.phone,
                u.email,
                u.birthday,
                a.bank_name,
                a.account_number,
                p.point
                FROM users AS u
                JOIN accounts AS a
                ON u.no = a.user_no
                JOIN point_accounts AS p
                ON u.no = p.user_no
                WHERE u.no = ?
                AND u.enabled = 1
                AND a.enabled = 1
                AND p.enabled = 1
                `, [user_no]);
            next({
                ...result[0],
                birthday: dayjs(result[0].birthday).format(`YYYY년 MM월 DD일`)
            });
        } catch (e) {
            next(e);
        }
    },
    async reserveProductMVP({ body }, { pool }, next) {
        try {
            const shop_no = param(body, 'shop_no');
            const product_no = param(body, 'product_no');
            const depositor_name = param(body, 'depositor_name');
            const bank = param(body, 'bank');
            const account_number = param(body, 'account_number');
            const phone_number = param(body, 'phone_number');
            const total_purchase_quantity = param(body, 'total_purchase_quantity');
            const total_purchase_price = param(body, 'total_purchase_price');

            const connection = await pool.getConnection(async conn => await conn);
            try {
                await connection.beginTransaction();
                let user_mvp_no;

                const [result1] = await connection.query(`
                    SELECT *
                    FROM user_mvp
                    WHERE phone_number = ?
                    AND enabled = 1;

                    SELECT
                    name AS product_name,
                    discounted_price,
                    expected_quantity,
                    rest_quantity,
                    expiry_datetime,
                    expiry_datetime - NOW() AS is_expired
                    FROM products
                    WHERE no = ?
                    AND enabled = 1;
                `, [phone_number, product_no]);

                if (result1[1][0].discounted_price > total_purchase_price) throw err(400, `할인가 이상을 입력해야 합니다.`);
                if (result1[1][0].rest_quantity < total_purchase_quantity) throw err(400, `잔여 재고가 부족합니다.`);
                if (result1[1][0].is_expired < 0) throw err(400, `마감된 상품입니다.`);

                if (result1[0].length < 1) {
                    const [result] = await connection.query(`
                        INSERT INTO user_mvp (
                            phone_number
                        )
                        VALUES (?);
                    `, [phone_number]);
                    user_mvp_no = result.insertId;
                } else {
                    user_mvp_no = result1[0][0].no;
                    await connection.query(`
                        UPDATE user_mvp
                        SET deal_count = deal_count + 1
                        WHERE no = ?
                    `, [user_mvp_no]);
                }

                await connection.query(`
                        INSERT INTO reservations (
                            shop_no,
                            user_mvp_no,
                            product_no,
                            depositor_name,
                            bank,
                            account_number,
                            total_purchase_quantity,
                            total_purchase_price
                        )
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
                    `, [
                    shop_no,
                    user_mvp_no,
                    product_no,
                    depositor_name,
                    bank,
                    account_number,
                    total_purchase_quantity,
                    total_purchase_price
                ]);

                await connection.query(`
                    UPDATE
                    products
                    SET rest_quantity = rest_quantity - ?
                    WHERE no = ?
                    AND enabled = 1;
                `, [total_purchase_quantity, product_no]);

                const kakaoResult = await sendKakaoMessage({
                    to: `${phone_number}`,
                    from: `01043987759`,
                    text: template.completeReservationApplication({
                        depositor_name,
                        total_purchase_price,
                    }),
                    type: `CTA`,
                    kakaoOptions: {
                        "pfId": require('../config').solapi.pfId
                    }
                });

                if (kakaoResult === null) throw err(400, '친구톡 전송에 실패했습니다.');

                await mailer.sendMailToAdmins({
                    subject: '예약 알림',
                    text: template.completeReservationApplication({
                        depositor_name,
                        total_purchase_price,
                    })
                });

                await connection.commit();
                next({ message: '예약됐습니다' });
            } catch (e) {
                await connection.rollback();
                await mailer.sendMailToDevelopers({
                    subject: '에러 발생',
                    text: `${e}`
                });
                next(e);
            } finally {
                connection.release();
            }
        } catch (e) {
            next(e);
        }
    },
};

module.exports = controller;

