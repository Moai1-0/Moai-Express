const firebase = require('firebase');
const config = require('../config').firebase;

firebase.initializeApp(config);
const fb = firebase.database();

module.exports = fb;