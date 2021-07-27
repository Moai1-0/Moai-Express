require('dotenv').config();
const queryString = require('querystring');

let database;
if (process.env.NODE_ENV === 'production') {
    database = queryString.parse(process.env.DATABASE);
} else if (process.env.NODE_ENV === 'test') {
    database = queryString.parse(process.env.DATABASE_TEST);
} else {
    database = queryString.parse(process.env.DATABASE_LOCAL);
}

module.exports = {
    env: process.env.NODE_ENV,
    port: process.env.PORT,
    mysql: {
        host: database.host,
        user: database.user,
        password: database.password,
        database: database.name,
        port: Number(database.port),
        connectionLimit:Number(database.connectionlimit),
    },
    jwt: {
        secretKey: process.env.JWT_SECRET_KEY,
        algorithm: process.env.JWT_ALGORITHM,
        issuer: process.env.JWT_ISSUER,
    }
}