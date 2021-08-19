const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('products', {
    no: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "고유번호"
    },
    shop_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "shops테이블고유번호"
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "",
      comment: "상품명"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "상품설명"
    },
    expected_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "기대 재고 수량"
    },
    actual_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "실제 재고 수량"
    },
    rest_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "잔여 재고 수량"
    },
    regular_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "상품정가"
    },
    discounted_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "상품할인가"
    },
    return_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "개당 환급액"
    },
    discount_rate: {
      type: DataTypes.DECIMAL(7,2),
      allowNull: true,
      defaultValue: 0.00,
      comment: "할인률"
    },
    status: {
      type: DataTypes.ENUM('ongoing','done'),
      allowNull: false,
      defaultValue: "ongoing",
      comment: "거래완료상태"
    },
    expiry_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "예약마감시간"
    },
    pickup_datetime: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "픽업마감시간"
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
      comment: "0: 판매종료"
    }
  }, {
    sequelize,
    tableName: 'products',
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
        name: "ngram_idx",
        type: "FULLTEXT",
        fields: [
          { name: "name" },
        ]
      },
    ]
  });
};
