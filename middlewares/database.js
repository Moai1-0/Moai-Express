const mysql = require('mysql2/promise');

module.exports = {
    sql(config) {
        let pool = null;      
        return (req, res, next) => {
            if (pool === null) {
                pool = mysql.createPool({ ...config, multipleStatements: true });
            }
            res.pool = pool;
            next();
        }
    },
}

