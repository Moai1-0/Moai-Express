const multer = require('multer');

const productImgStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'media/product');
    },
    filename(req, file, cb) {
        cb(null, `${file.originalname}`);
    }
});
const productImgUpload = multer({ storage: productImgStorage });

const shopImgStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'media/shop');
    },
    filename(req, file, cb) {
        cb(null, `${file.originalname}`);
    }
});
const shopImgUpload = multer({ storage: shopImgStorage });

const testUpload = multer(
    {
        storage: multer.memoryStorage(),
        // limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 } 
    });



module.exports = { productImgUpload, shopImgUpload };