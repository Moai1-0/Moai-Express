const express = require('express');
const router = express.Router();
const user = require('../controllers/user');

router.get('/products', user.getProducts);

module.exports = router;