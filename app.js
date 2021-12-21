const express = require('express');
const dayjs = require('dayjs');
require('dayjs/locale/ko');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const config = require('./config');
const err = require('http-errors');
const helmet = require('helmet');
const { sql } = require('./middlewares/database');
const PORT = 5000;
const app = express();

dayjs.locale('ko');
morgan.token('date', () => dayjs().format("YYYY-MM-DD HH:mm:ss"));
app.use(morgan(`:date[iso][:status][:method] :url :response-time ms :res[content-length] bytes`));
app.use(bodyParser.urlencoded({ extended: false })); // parse application/x-www-form-urlencoded
app.use(bodyParser.json()); // parse application/json
app.use(cookieParser());
app.use(helmet());
app.use(cors({ credentials: true, origin: true }));

// Custom Middlewares
app.use(sql(config.mysql));

// Passport
const passport = require('passport');
const passportConfig = require('./utils/passport');
app.use(passport.initialize());
passportConfig();
passport.serializeUser((user, done) => { // Strategy 성공 시 호출됨
    done(null, user); // 여기의 user가 deserializeUser의 첫 번째 매개변수로 이동
});

passport.deserializeUser((user, done) => { // 매개변수 user는 serializeUser의 done의 인자 user를 받은 것
    done(null, user); // 여기의 user가 req.user가 됨
});


// Rest API
app.use('/', require('./routes/common'));
app.use('/shop', require('./routes/shop'));
app.use('/user', require('./routes/user'));
app.use('/admin', require('./routes/admin'));


app.use((req, res, next) => {
    next(err(404, '요청하신 페이지를 찾을 수 없습니다.'));
});

const { sendSlack } = require('./utils/slack');

app.use((data, req, res, next) => {
    if (data instanceof Error) {
        console.log(data);
        if (data.status == 400 || data.status == 500) {
            
            sendSlack(data, 'dev-에러');
        }
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