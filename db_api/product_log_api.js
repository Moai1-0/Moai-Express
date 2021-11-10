const productLogAPI = {
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

    // 상품 수량 변화에 대한 로그 처리 함수
    postLogProductQuantityModels: async function(productNo,
                                                 expectedQuantity,
                                                 actualQuantity,
                                                 restQuantity,
                                                 connection) {
        try {
            const [result] = await connection.query(`
                INSERT INTO log_products_quantity(
                    product_no,
                    expected_quantity,
                    actual_quantity,
                    rest_quantity
                )
                VALUES(?,?,?,?)`,
                    [
                        productNo,
                        expectedQuantity,
                        actualQuantity,
                        restQuantity,
                    ]
                );
        } catch (e) {
            throw e;
        }
    }
};


module.exports = productLogAPI;