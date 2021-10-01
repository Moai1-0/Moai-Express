const productLogModels = {
    // 상품 상태 변화에 대한 로그 처리 함수
    postLogProductStatusModels: async function(productNo, status, connection) {
        try {
            const [result] = await connection.query(`
                INSERT INTO log_products_status(
                    product_no,
                    status
                    )
                VALUES(?,?)`,
                    [
                        productNo,
                        status
                    ]
            );
        } catch (e) {
            throw e;
        }
    },
};


module.exports = productLogModels;