require('dotenv').config();
const queryString = require('query-string');

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
        connectionLimit: Number(database.connectionlimit),
    },
    orm: {
        host: database.host,
        username: database.user,
        password: database.password,
        database: database.name,
        dialect: "mysql",
    },
    jwt: {
        secretKey: process.env.JWT_SECRET_KEY,
        algorithm: process.env.JWT_ALGORITHM,
        issuer: process.env.JWT_ISSUER,
    },
    s3: {
        accessKeyId: process.env.S3_ACCESSKEYID,
        secretAccessKey: process.env.S3_SECRETKEY,
        region: process.env.S3_REGION,
        bucket: process.env.S3_BUCKET,
        endPoint: process.env.S3_ENDPOINT
    },
    kakao: {
        client_id: process.env.KAKAO_API_KEY,
        redirect_uri: process.env.KAKAO_REDIRECT_URI,
    },
    firebase: {
        apiKey: process.env.FB_API_KEY,
        authDomain: process.env.FB_AUTH_DOMAIN,
        databaseURL: process.env.FB_REALTIME_DB_URL,
        projectId: process.env.FB_PROJECT_ID,
        storageBucket: process.env.FB_STOREAGE_BUCKET,
        messagingSenderId: process.env.FB_MESSAGING_SENDER_ID,
        appId: process.env.FB_APP_ID,
    }
};