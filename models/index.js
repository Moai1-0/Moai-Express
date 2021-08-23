const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require('../config/config.json')[env];
const initModels = require('./init-models');

const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);
const models = initModels(sequelize);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Accounts = models.accounts;
db.Admins = models.admins;
db.Log_order = models.log_order;
db.Log_point = models.log_point;
db.Log_reservation = models.log_reservation;
db.Orders = models.orders;
db.Point_accounts = models.point_accounts;
db.Product_bookmark = models.product_bookmark;
db.Product_images = models.product_images;
db.Regions = models.regions;
db.Reservations = models.reservations;
db.Return_statuses = models.return_statuses;
db.Shops = models.shops;
db.User_sns_data = models.user_sns_data;
db.Users = models.users;

module.exports = db;
