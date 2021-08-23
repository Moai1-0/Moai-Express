const schedule = require('node-schedule');
module.exports = {
    owner_actual_quantity: (expiry_datetime) => {
        schedule.scheduleJob(expiry_datetime, function () {
            console.log('The world is going to end today.');
        });
    },
    app_scheduler() {
        let on = false;
        return (req, { pool }, next) => {
            if (!on) {
                schedule.scheduleJob('* * * * * *', async (time) => {
                    console.log('hi!', time);
                });
                on = true;
            }
            next();
        };

    }
};