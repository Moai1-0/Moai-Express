const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('log_order', {
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
    shop_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "shops테이블고유번호"
    },
    order_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "orders테이블고유번호"
    },
    product_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pre_bid','bid','pre_pickup','pre_refund','pickup','refund'),
      allowNull: false
    },
    created_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: "생성일자"
    }
  }, {
    sequelize,
    tableName: 'log_order',
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
