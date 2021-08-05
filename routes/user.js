const express = require('express');
const router = express.Router();
const user = require('../controllers/user');
const { checkUser } = require('../middlewares/auth');

router.get('/products', user.getProducts); // 상품 리스트 조회
router.get('/product', user.getProduct); // 상품 상세 조회
router.post('/reserve', user.reserveProduct); // 상품 예약
router.patch('/reserve', checkUser, user.cancelReservation); // 상품 예약 취소
router.post('/history/confirm', user.confirmUser); // 구매내역 - 로그인
router.get('/history/ongoing', checkUser, user.getReservationHistory) // 구매내역 - 진행중
router.get('/history/done', checkUser, user.getPurchaseHistory) // 구매내역 - 수령/환급


module.exports = router;