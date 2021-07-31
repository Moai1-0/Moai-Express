const schedule = require('node-schedule');
module.exports = {
    test: () => {
        schedule.scheduleJob('* * * * * *', async (time) => {
            console.log('hi!', time);
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