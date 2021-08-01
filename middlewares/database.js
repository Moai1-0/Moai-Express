const mysql = require('mysql2/promise');

module.exports = {
    sql(config) {
        let pool = null;      
        return (req, res, next) => {
            if (pool === null) {
                console.log('디비 위에')
                pool = mysql.createPool({ ...config, multipleStatements: true });
            }
            console.log('디비아래')
            res.pool = pool;
            next();
        }
    },
}

