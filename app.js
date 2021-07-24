const express = require('express');
const dayjs = require('dayjs');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const err = require('http-errors');

const { sql } = require('./middlewares/database');
const { sequelize } = require('./models/index');

const PORT = 5000;

const app = express();

dayjs.locale('ko');
morgan.token('date', () => dayjs().format("YYYY-MM-DD HH:mm:ss"));
sequelize.sync({ force: false });

app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
app.use(cors({ credentials: true, origin: true }));

// Custom Middlewares
app.use(sql());

// Router
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

app.listen(process.env.PORT || PORT, () => {
    console.log(`Server is running on ${process.env.PORT}`);
});