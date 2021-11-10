const authenticationLogApi = {

    postLogAuthentication: async function(phone,
                                          authenticationNum,
                                          connection) {
        try {
            const [result] = await connection.query(`
                INSERT INTO log_authentication (
                phone,
                authentication_num
                )
                VALUES(?,?)`,
                    [
                        phone,
                        authenticationNum
                    ]
            );
        } catch (e) {
            throw e;
        }
    }
};

module.exports = authenticationLogApi;