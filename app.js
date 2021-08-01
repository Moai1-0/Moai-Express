const express = require('express');
const dayjs = require('dayjs');
require('dayjs/locale/ko');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const err = require('http-errors');
const { sql } = require('./middlewares/database');
const PORT = 5000;
const app = express();

dayjs.locale('ko');
morgan.token('date', () => dayjs().format("YYYY-MM-DD HH:mm:ss"));
app.use(morgan(`:date[iso][:status][:method] :url :response-time ms :res[content-length] bytes`));
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));

// Custom Middlewares
app.use(sql(config.mysql), );

// Rest API
app.use('/', require('./routes/common'));
app.use('/shop', require('./routes/shop'));
app.use('/user', require('./routes/user'));


app.use((req, res, next) => {
    next(err(404, '요청하신 페이지를 찾을 수 없습니다.'));
});

app.use((data, req, res, next) => {
    if (data instanceof Error) {
        console.log(data);
        return res.status(data.status || 500).json({
            code: data.status,
            message: data.message
        });
    }
    res.status(200).json(data);
});

app.listen(config.port || PORT, () => {
    console.log(`Server is running on ${config.port}`);
});