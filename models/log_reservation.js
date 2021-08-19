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
      allowNull: false
    },
    shop_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    reservation_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
    },
    product_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false
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
    ]
  });
};
