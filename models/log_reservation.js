const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('log_reservation', {
    no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    user_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'users',
        key: 'no'
      }
    },
    shop_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'shops',
        key: 'no'
      }
    },
    reservation_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'reservations',
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
    created_datetime: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'log_reservation',
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
        name: "log_reservation_users_no_fk",
        using: "BTREE",
        fields: [
          { name: "user_no" },
        ]
      },
      {
        name: "log_reservation_shops_no_fk",
        using: "BTREE",
        fields: [
          { name: "shop_no" },
        ]
      },
      {
        name: "log_reservation_reservations_no_fk",
        using: "BTREE",
        fields: [
          { name: "reservation_no" },
        ]
      },
      {
        name: "log_reservation_products_no_fk",
        using: "BTREE",
        fields: [
          { name: "product_no" },
        ]
      },
    ]
  });
};
