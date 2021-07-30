const express = require('express');
const router = express.Router();
const shop = require('../controllers/shop');
const { productImgUpload } = require('../utils/multer');

// router.get('/main', checkUser, board.mainPage);

router.post('/product'
    , productImgUpload.array('productImages')
    , shop.uploadProduct

);
router.get('/products/prebid');
router.get('/products/prebid/detail');
router.get('/products/bid');
router.get('/products/bid/detail');
router.patch('/pickup');
router.patch('/quantity/actual');
router.get('/products/complete');
router.get('/products/complete/detail');
router.post('/signin', shop.signin);
router.post('/signup', shop.signup);
router.get('/products/bookmark');
router.get('/product/bookmark');
router.delete('/product/bookmark');


module.exports = router;