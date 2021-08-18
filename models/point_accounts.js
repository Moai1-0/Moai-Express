const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('point_accounts', {
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
      comment: "users테이블고유번호"
    },
    point: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "포인트잔액"
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
    tableName: 'point_accounts',
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
