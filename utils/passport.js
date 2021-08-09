const passport = require("passport");
require('dotenv').config();

const KakaoStrategy = require('passport-kakao').Strategy;
const KakaoConfig = {
  clientID: process.env.PASSPORT_KAKAO_REST_API_KEY,
  callbackURL: 'http://localhost:3000/kakao/oauth'
};
const KakaoVerify = async (accessToken, refreshToken, profile, done) => {
  done(null, { profile, accessToken, refreshToken }, { message: 'good' });
};

module.exports = () => {
  passport.use('kakao-login', new KakaoStrategy(KakaoConfig, KakaoVerify));
};
