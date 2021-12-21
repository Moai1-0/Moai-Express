const express = require('express');
const router = express.Router();
const shop = require('../controllers/shop');
const { checkShop } = require('../middlewares/auth');
const { s3upload } = require('../utils/multer');

// router.get('/main', checkUser, board.mainPage);
router.get('/owner/info', checkShop, shop.getShopInfo);
router.post('/product'
    , checkShop
    , s3upload.array('product_images')
    , shop.uploadProduct
);
router.get('/products/bookmark', checkShop, shop.getBookmarkProducts);
router.delete('/product/bookmark', checkShop, shop.deleteBookmarkProduct);
router.get('/products/prebid', checkShop, shop.getPrebidProducts);
// router.get('/products/prebid/detail', checkShop, shop.getPrebidProduct);
router.get('/products/prebid/detail', checkShop, shop.getPrebidProductMVP); // mvp
// router.get('/products/bid', checkShop, shop.getBidProducts);
// router.get('/products/bid/detail', checkShop, shop.getBidProduct);
router.get('/products/bid', checkShop, shop.getBidProductsMVP); // mvp
router.get('/products/bid/detail', checkShop, shop.getBidProductMVP); //mvp
// router.patch('/pickup', checkShop, shop.setPickup);
router.patch('/pickup', checkShop, shop.mvpPatchOrderPreStatus);
// router.patch('/quantity/actual', checkShop, shop.enterActualQuantity);
router.patch('/quantity/actual', checkShop, shop.mvpPatchActualQuantityProduct);
router.get('/products/complete', checkShop, shop.getCompleteProducts);
router.get('/products/complete/detail', checkShop, shop.getCompleteProduct);
router.post('/signin', shop.signin);
router.post('/signup', shop.signup);


module.exports = router;