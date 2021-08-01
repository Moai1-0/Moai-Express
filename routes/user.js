const express = require('express');
const router = express.Router();
const user = require('../controllers/user');

router.get('/products', user.getProducts);
router.get('/product', user.getProduct);

module.exports = router;