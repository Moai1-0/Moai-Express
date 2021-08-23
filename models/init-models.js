var DataTypes = require("sequelize").DataTypes;
var _accounts = require("./accounts");
var _admins = require("./admins");
var _log_order = require("./log_order");
var _log_point = require("./log_point");
var _log_reservation = require("./log_reservation");
var _orders = require("./orders");
var _point_accounts = require("./point_accounts");
var _product_bookmark = require("./product_bookmark");
var _product_images = require("./product_images");
var _products = require("./products");
var _regions = require("./regions");
var _reservations = require("./reservations");
var _return_statuses = require("./return_statuses");
var _shops = require("./shops");
var _user_sns_data = require("./user_sns_data");
var _users = require("./users");

function initModels(sequelize) {
  var accounts = _accounts(sequelize, DataTypes);
  var admins = _admins(sequelize, DataTypes);
  var log_order = _log_order(sequelize, DataTypes);
  var log_point = _log_point(sequelize, DataTypes);
  var log_reservation = _log_reservation(sequelize, DataTypes);
  var orders = _orders(sequelize, DataTypes);
  var point_accounts = _point_accounts(sequelize, DataTypes);
  var product_bookmark = _product_bookmark(sequelize, DataTypes);
  var product_images = _product_images(sequelize, DataTypes);
  var products = _products(sequelize, DataTypes);
  var regions = _regions(sequelize, DataTypes);
  var reservations = _reservations(sequelize, DataTypes);
  var return_statuses = _return_statuses(sequelize, DataTypes);
  var shops = _shops(sequelize, DataTypes);
  var user_sns_data = _user_sns_data(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);

  log_order.belongsTo(orders, { as: "order_no_order", foreignKey: "order_no"});
  orders.hasMany(log_order, { as: "log_orders", foreignKey: "order_no"});
  log_point.belongsTo(point_accounts, { as: "point_account_no_point_account", foreignKey: "point_account_no"});
  point_accounts.hasMany(log_point, { as: "log_points", foreignKey: "point_account_no"});
  log_order.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(log_order, { as: "log_orders", foreignKey: "product_no"});
  log_reservation.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(log_reservation, { as: "log_reservations", foreignKey: "product_no"});
  orders.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(orders, { as: "orders", foreignKey: "product_no"});
  product_bookmark.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(product_bookmark, { as: "product_bookmarks", foreignKey: "product_no"});
  product_images.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(product_images, { as: "product_images", foreignKey: "product_no"});
  reservations.belongsTo(products, { as: "product_no_product", foreignKey: "product_no"});
  products.hasMany(reservations, { as: "reservations", foreignKey: "product_no"});
  shops.belongsTo(regions, { as: "region_no_region", foreignKey: "region_no"});
  regions.hasMany(shops, { as: "shops", foreignKey: "region_no"});
  log_reservation.belongsTo(reservations, { as: "reservation_no_reservation", foreignKey: "reservation_no"});
  reservations.hasMany(log_reservation, { as: "log_reservations", foreignKey: "reservation_no"});
  orders.belongsTo(reservations, { as: "reservation_no_reservation", foreignKey: "reservation_no"});
  reservations.hasMany(orders, { as: "orders", foreignKey: "reservation_no"});
  log_order.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(log_order, { as: "log_orders", foreignKey: "shop_no"});
  log_reservation.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(log_reservation, { as: "log_reservations", foreignKey: "shop_no"});
  orders.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(orders, { as: "orders", foreignKey: "shop_no"});
  product_bookmark.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(product_bookmark, { as: "product_bookmarks", foreignKey: "shop_no"});
  products.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(products, { as: "products", foreignKey: "shop_no"});
  reservations.belongsTo(shops, { as: "shop_no_shop", foreignKey: "shop_no"});
  shops.hasMany(reservations, { as: "reservations", foreignKey: "shop_no"});
  accounts.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(accounts, { as: "accounts", foreignKey: "user_no"});
  log_order.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(log_order, { as: "log_orders", foreignKey: "user_no"});
  log_point.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(log_point, { as: "log_points", foreignKey: "user_no"});
  log_reservation.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(log_reservation, { as: "log_reservations", foreignKey: "user_no"});
  orders.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(orders, { as: "orders", foreignKey: "user_no"});
  point_accounts.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(point_accounts, { as: "point_accounts", foreignKey: "user_no"});
  reservations.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(reservations, { as: "reservations", foreignKey: "user_no"});
  return_statuses.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(return_statuses, { as: "return_statuses", foreignKey: "user_no"});
  user_sns_data.belongsTo(users, { as: "user_no_user", foreignKey: "user_no"});
  users.hasMany(user_sns_data, { as: "user_sns_data", foreignKey: "user_no"});

  return {
    accounts,
    admins,
    log_order,
    log_point,
    log_reservation,
    orders,
    point_accounts,
    product_bookmark,
    product_images,
    products,
    regions,
    reservations,
    return_statuses,
    shops,
    user_sns_data,
    users,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
