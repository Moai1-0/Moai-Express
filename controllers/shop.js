const err = require('http-errors');
const dayjs = require('dayjs');
const { param } = require('../utils/params');
const { genSaltSync, hashSync, compareSync } = require('bcrypt');
const { encodeToken } = require('../utils/token');
const { S3 } = require('../utils/multer');
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
            const shop_no = param(shop, "shop_no");
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
                const [result] = await pool.query(`
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
                    const file_name = `product/${name}-${dayjs().format("YYYYMMDDHHmmss")}-${shop_no}-${index + 1}`;
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
                    `, [result.insertId, name, file_name]);
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
            `, [id, password]);
            const accountValid = compareSync(password.toString(), results[0].password);
            if (results.length < 1 || !accountValid) throw err.Unauthorized(`아이디 또는 비밀번호가 일치하지 않습니다.`);

            const token = encodeToken({ type: `shop_owner`, shop_no: results[0].no, id: results[0].id }, { expiresIn: '7d' });

            next({ token });
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
                WHERER enabled = 1
                AND id = ?
            `, [id]);
            if (idCheck.length > 0) throw err.BadRequest('이미 존재하는 아이디');

            const [result] = await pool.query(
                `INSERT INTO shops (
                    id,
                    password,
                    name,
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
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
                [
                    id,
                    hashedPassword,
                    name,
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
    }
};

module.exports = controller;



