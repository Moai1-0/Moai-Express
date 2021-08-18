const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('reservations', {
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
    product_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "products테이블고유번호"
    },
    depositor_name: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "",
      comment: "예금주명"
    },
    total_purchase_quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "총구매수량"
    },
    total_purchase_price: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "총구매금액"
    },
    status: {
      type: DataTypes.ENUM('ongoing','agreed','wait','done','pre_canceled','canceled'),
      allowNull: false,
      defaultValue: "ongoing",
      comment: "예약상태[ongoing:이체전,agreed:이체후,wait:최종재고입력대기,done:거래완료,pre_canceled:예약취소,canceled:예약취소]"
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
    tableName: 'reservations',
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
