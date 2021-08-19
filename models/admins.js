const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('admins', {
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
      comment: "이메일(아이디)"
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
      comment: "성함"
    },
    phone: {
      type: DataTypes.STRING(11),
      allowNull: false,
      defaultValue: "",
      comment: "연락처"
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
    },
    auth: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 3,
      comment: "권한코드[3:일반관리자,2:개발자,1:최고관리자]"
    }
  }, {
    sequelize,
    tableName: 'admins',
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
