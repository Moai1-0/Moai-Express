const express = require('express');
const router = express.Router();
const shop = require('../controllers/shop');
const { checkShop } = require('../middlewares/auth');
const { s3upload } = require('../utils/multer');

// router.get('/main', checkUser, board.mainPage);

router.post('/product'
    , checkShop
    , s3upload.array('product_images')
    , shop.uploadProduct
);
router.get('/products/prebid', checkShop, shop.getPrebidProducts);
router.get('/products/prebid/detail', checkShop, shop.getPrebidProduct);
router.get('/products/bid', checkShop, shop.getBidProducts);
router.get('/products/bid/detail', checkShop, shop.getBidProduct);
router.patch('/pickup');
router.patch('/quantity/actual', checkShop, shop.enterActualQuantity);
router.get('/products/complete');
router.get('/products/complete/detail');
router.post('/signin', shop.signin);
router.post('/signup', shop.signup);
router.get('/products/bookmark');
router.get('/product/bookmark');
router.delete('/product/bookmark');

module.exports = router;