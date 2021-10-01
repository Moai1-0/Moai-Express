const pointLogAPI = {
    postLogPointModels: async function(pointAccountNo,
                                             depositedPoint,
                                             remainingPoint,
                                             connection) {
        try {
            const [result] = await connection.query(`
                INSERT INTO log_return_point(
                    point_account_no,
                    deposited_point,
                    remaining_point
                )
                VALUES(?,?,?)`,
                    [
                        pointAccountNo,
                        depositedPoint,
                        remainingPoint,
                    ]
            );
        } catch (e) {
            throw e;
        }
    }
};

module.exports = pointLogAPI;