const multer = require('multer');

const productImgStorage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'media/img');
    },
    filename(req, file, cb) {
        cb(null, `${file.originalname}`);
    }
});
const productImgUpload = multer({ storage: productImgStorage });

const testUpload = multer(
    {
        storage: multer.memoryStorage(),
        // limits: { fields: 1, fileSize: 6000000, files: 1, parts: 2 } 
    });



module.exports = { productImgUpload, testUpload };