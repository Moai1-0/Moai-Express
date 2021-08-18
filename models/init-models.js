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
