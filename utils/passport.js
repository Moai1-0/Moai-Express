const passport = require("passport");
require('dotenv').config();
const { Users, User_sns_data, Shops, sequelize, Point_accounts, Accounts } = require('../models');

const KakaoStrategy = require('passport-kakao').Strategy;
const KakaoConfig = {
  clientID: process.env.PASSPORT_KAKAO_REST_API_KEY,
  callbackURL: 'http://localhost:3000/kakao/oauth'
};
const KakaoVerify = async (accessToken, refreshToken, profile, done) => {
  console.log(profile);
  const user = await Users.findOne({
    include: [
      {
        model: User_sns_data,
        as: "user_sns_data",
        where: {
          id: profile.id,
          type: profile.provider
        }
      },

    ],
    where: {
      enabled: 1,
    },
    raw: true
  });

  console.log(user, 'asdjkbaskjdnakjsndjkasndnja');
  if (!user) {
    const new_user = await Users.create({
      name: profile.username
    });
    await User_sns_data.create({
      enabled: 1,
      id: profile._json.id,
      user_no: new_user.dataValues.no,
      type: "kakao"
    });
    await Point_accounts.create({
      user_no: new_user.dataValues.no
    });
    done(null,
      false,
      { message: 'good' });
  } else {
    const user_account = await Accounts.findOne({
      where: {
        user_no: user.no
      }
    });
    if (!user_account) {
      done(null,
        false,
        { message: 'good' });
    } else {
      done(null, true, { message: 'good' });
    }
  }



};

// if (user.dataValues.)
// const [user, created] = await Users.findOrCreate({
//   include: [
//     {
//       model: User_sns_data,
//       as: "user_sns_data",

//       where: {
//         id: profile.id,
//         type: profile.provider
//       }
//     },
//   ],
//   where: {
//     name: profile.username,
//     enabled: 1,
//   },
//   raw: true
// });
// if (created) {
//   
// }
// console.log(user);


// if (user) {
//   done(null, { profile, accessToken, refreshToken, is_existed: true }, { message: 'good' });
// } else if (!user || user === null) {
//   console.log('여기아님/');
//   done(null,
//     false,
//     // { profile, accessToken, refreshToken, is_existed: false },
//     { message: 'good' });
// }




module.exports = () => {
  passport.use('kakao-login', new KakaoStrategy(KakaoConfig, KakaoVerify));
};
