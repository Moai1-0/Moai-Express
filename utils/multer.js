const multer = require('multer');
const multerS3 = require('multer-s3');
const aws = require('aws-sdk');
const { s3 } = require('../config/index');
require('dotenv').config();

const s3_instance = new aws.S3({ ...s3 });
const params = {
    Bucket: s3.bucket,
    Key: '',
    Body: null
};
const S3 = {
    instance: s3_instance,
    params: params,

};
const s3upload = multer({ storage: multer.memoryStorage() });



module.exports = { s3upload, S3 };