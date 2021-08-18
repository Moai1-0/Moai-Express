const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    no: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "고유번호"
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "이메일"
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "비밀번호"
    },
    name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "",
      comment: "회원명"
    },
    phone: {
      type: DataTypes.STRING(11),
      allowNull: false,
      defaultValue: "",
      comment: "연락처"
    },
    gender: {
      type: DataTypes.ENUM('male','female'),
      allowNull: true,
      comment: "성별"
    },
    birthday: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: "생년월일(주민번호 앞 6자리)"
    },
    created_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: "생성일자"
    },
    modified_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "수정일자"
    },
    removed_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "삭제일자"
    },
    enabled: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "0: 삭제"
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "no" },
        ]
      },
    ]
  });
};
