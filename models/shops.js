const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('shops', {
    no: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "고유번호"
    },
    region_no: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "regions테이블고유번호",
      references: {
        model: 'regions',
        key: 'no'
      }
    },
    id: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: ""
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
      comment: "매장명"
    },
    tel: {
      type: DataTypes.STRING(13),
      allowNull: false,
      defaultValue: "",
      comment: "전화번호"
    },
    shop_image: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "매장대표이미지"
    },
    representative_name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "",
      comment: "대표자명"
    },
    zone_code: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: "",
      comment: "우편번호"
    },
    road_address: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
      comment: "도로명주소"
    },
    road_detail_address: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
      comment: "상세주소"
    },
    region_address: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
      comment: "지번주소"
    },
    region_detail_address: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: "",
      comment: "지번 상세주소"
    },
    latitude: {
      type: DataTypes.DECIMAL(13,10),
      allowNull: true,
      comment: "위도 "
    },
    longitude: {
      type: DataTypes.DECIMAL(13,10),
      allowNull: true,
      comment: "경도 "
    },
    opening_time: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: "영업시작시간"
    },
    closing_time: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: "영업마감시간"
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
    tableName: 'shops',
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
        name: "shops_regions_no_fk",
        using: "BTREE",
        fields: [
          { name: "region_no" },
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
