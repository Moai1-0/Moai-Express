const express = require('express');
const router = express.Router();
const user = require('../controllers/user');

router.get('/products', user.getProducts); // 상품 리스트 조회
router.get('/product', user.getProduct); // 상품 상세 조회
router.post('/confirm', user.confirmUser); // 구매내역 - 로그인


module.exports = router;