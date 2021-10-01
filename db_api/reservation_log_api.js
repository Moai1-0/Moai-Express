const reservationLogApi = {
    postLogReservationStatusModels: async function(reservationNo, status, connection) {
        try {
            const [result] = await connection.query(`
                INSERT INTO log_reservations_status(
                    reservation_no,
                    status
                    )
                VALUES(?,?)`,
                    [
                        reservationNo,
                        status
                    ]
            );
        } catch (e) {
            throw e;
        }
    },
}

module.exports = reservationLogApi;