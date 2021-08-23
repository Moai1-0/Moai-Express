const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('orders', {
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
    product_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "products테이블고유번호",
      references: {
        model: 'products',
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
    reservation_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "reservations테이블고유번호",
      references: {
        model: 'reservations',
        key: 'no'
      }
    },
    purchase_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "구매수량"
    },
    purchase_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "주문금액"
    },
    return_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "환급금액"
    },
    status: {
      type: DataTypes.ENUM('pre_pickup','pre_return','pickup','return'),
      allowNull: true,
      comment: "주문상태"
    },
    created_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
      comment: "생성일자"
    },
    removed_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "삭제일자"
    },
    modified_datetime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "수정일자"
    },
    enabled: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "[1:사용,0:미사용]"
    }
  }, {
    sequelize,
    tableName: 'orders',
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
        name: "orders_users_no_fk",
        using: "BTREE",
        fields: [
          { name: "user_no" },
        ]
      },
      {
        name: "orders_products_no_fk",
        using: "BTREE",
        fields: [
          { name: "product_no" },
        ]
      },
      {
        name: "orders_shops_no_fk",
        using: "BTREE",
        fields: [
          { name: "shop_no" },
        ]
      },
      {
        name: "orders_reservations_no_fk",
        using: "BTREE",
        fields: [
          { name: "reservation_no" },
        ]
      },
    ]
  });
};
