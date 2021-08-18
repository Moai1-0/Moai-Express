const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('log_point', {
    no: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "고유번호"
    },
    user_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "고유번호"
    },
    point_no: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "",
      comment: "회원명"
    },
    type: {
      type: DataTypes.ENUM('add','use'),
      allowNull: true
    },
    created_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: "생성일자"
    },
    enabled: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "0: 삭제"
    }
  }, {
    sequelize,
    tableName: 'log_point',
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
