const schedule = require('node-schedule');
module.exports = {
    scheduleJob(expiry_datetime, cb) {
        schedule.scheduleJob(expiry_datetime, cb);
    },
    // app_scheduler() {
    //     let on = false;
    //     return (req, { pool }, next) => {
    //         if (!on) {
    //             schedule.scheduleJob('* * * * * *', async (time) => {
    //                 console.log('hi!', time);
    //             });
    //             on = true;
    //         }
    //         next();
    //     };

    // }
};