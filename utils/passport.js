
const { genSaltSync, hashSync, compareSync } = require('bcrypt');

const passport = require("passport");
const { ExtractJwt, Strategy: JWTStrategy } = require('passport-jwt');
const LocalStrategy = require("passport-local").Strategy;

const db = require('../database');
require('dotenv').config();


const LocalConfig = {
  usernameField: 'email',
  passwordField: 'password'
};
const localVerify = async (email, password, done) => {
  try {
    const [user] = await db.query(`SELECT * FROM registeration WHERE email = ?`, [email]);

    if (!user[0]) {
      return done(null, false, { reason: '존재하지 않는 사용자입니다.' });
    }
    const isSamePassword = await compareSync(password, user[0].password.toString('utf8'));

    if (!isSamePassword)
      return done(null, false, { reason: '비밀번호가 맞지 않습니다.' });

    done(null, user[0], { reason: '인증완료' });
  } catch (e) {
    done(e);
  }
};

const AccessTokenConfig = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.ACCESS_SECRET_KEY,
};
const AccessTokenVerify = async (jwtPayload, done) => {
  try {
    // const [user] = await db.query(`SELECT * FROM registeration WHERE id = ? `, [jwtPayload.id]);
    if (jwtPayload.id) {
      return done(null, jwtPayload.id);
    }
    done(null, false, { reason: '올바르지 않은 인증정보 입니다.' });
  } catch (err) {
    done(err);
  }
};

const RefreshTokenConfig = {
  jwtFromRequest: (req, res, next) => req.headers.cookie['refreshToken'],
  secretOrKey: process.env.REFRESH_SECRET_KEY,
};
const RefreshTokenVerify = async (jwtPayload, done) => {
  try {
    console.log('anjdi');
    const [] = await db.query(`SELECT * FROM tokens WHERE refresh_token = ? `, [jwtPayload.refreshToken]);
    if (user[0]) {
      return done(null, user[0]);
    }
    done(null, false, { reason: '올바르지 않은 인증정보 입니다.' });
  } catch (err) {
    done(err);
  }
};

const GoogleConfig = {
  clientID: 'GOOGLE_CLIENT_ID',
  clientSecret: 'GOOGLE_CLIENT_SECRET',
  callbackURL: "http://www.example.com/auth/google/callback"
};
const GoggleVerify = async (accessToken, refreshToken, profile, done) => {

};

module.exports = () => {
  passport.use('local', new LocalStrategy(LocalConfig, localVerify));
  passport.use('access', new JWTStrategy(AccessTokenConfig, AccessTokenVerify));
  passport.use('refresh', new JWTStrategy(RefreshTokenConfig, RefreshTokenVerify));
};
