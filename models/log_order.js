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
      comment: "users테이블고유번호",
      references: {
        model: 'users',
        key: 'no'
      }
    },
    shop_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "shops테이블고유번호",
      references: {
        model: 'shops',
        key: 'no'
      }
    },
    order_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "orders테이블고유번호",
      references: {
        model: 'orders',
        key: 'no'
      }
    },
    product_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'products',
        key: 'no'
      }
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
      {
        name: "log_order_users_no_fk",
        using: "BTREE",
        fields: [
          { name: "user_no" },
        ]
      },
      {
        name: "log_order_shops_no_fk",
        using: "BTREE",
        fields: [
          { name: "shop_no" },
        ]
      },
      {
        name: "log_order_orders_no_fk",
        using: "BTREE",
        fields: [
          { name: "order_no" },
        ]
      },
      {
        name: "log_order_products_no_fk",
        using: "BTREE",
        fields: [
          { name: "product_no" },
        ]
      },
    ]
  });
};
