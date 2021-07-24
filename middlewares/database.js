require('dotenv').config();
const mysql = require('mysql2/promise');

module.exports = {
  sql() {
      let pool = null;      
      return (req, res, next) => {
        if (pool === null) {
          pool = mysql.createPool(
            {
              host: process.env.DB_HOST,
              user: process.env.DB_USER,
              password: process.env.DB_PASSWORD,
              database: process.env.DB_NAME,
              connectionLimit: 10,
              multipleStatements: true
            }
          );
        }
        res.pool = pool;
        next();
      }
    },
}

