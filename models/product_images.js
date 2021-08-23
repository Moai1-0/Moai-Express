const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('product_images', {
    no: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "고유번호"
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
      comment: "이미지경로"
    },
    path: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: "",
      comment: "이미지경로"
    },
    sort: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "정렬순서(임시)"
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
    enabled: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "0: 삭제"
    }
  }, {
    sequelize,
    tableName: 'product_images',
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
        name: "product_images_products_no_fk",
        using: "BTREE",
        fields: [
          { name: "product_no" },
        ]
      },
    ]
  });
};
