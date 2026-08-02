const dbQuery = require("../utils/dbQuery");

const validateWithdraw = async (amount) => {

    const { rows } = await dbQuery(
        "SELECT * FROM main_setting WHERE id=1"
    );

    const config = rows[0];

    if (!config) {
        return {
            status: false,
            message: "Setting Not Found"
        };
    }

    // ✅ Min Withdrawal
    if (
        Number(amount) <
        Number(config.min_withdrawal)
    ) {

        return {
            status: false,
            message:
                `Minimum withdrawal ₹${config.min_withdrawal}`
        };

    }

    // ✅ Max Withdrawal
    if (
        Number(amount) >
        Number(config.max_withdrawal)
    ) {

        return {
            status: false,
            message:
                `Maximum withdrawal ₹${config.max_withdrawal}`
        };

    }

    // ✅ Closing Day
    const days = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday"
    ];

    const currentDay =
        days[new Date().getDay()];

    if (
        config.withdraw_closing_day &&
        currentDay ===
        config.withdraw_closing_day
            .toLowerCase()
    ) {

        return {
            status: false,
            message:
                `Withdraw closed on ${config.withdraw_closing_day}`
        };

    }

    // ✅ Time Check
    const nowTime =
        new Date()
            .toTimeString()
            .slice(0, 5);

    if (
        nowTime <
        config.withdraw_open_time
    ) {

        return {
            status: false,
            message:
                `Withdraw opens at ${config.withdraw_open_time}`
        };

    }

    if (
        nowTime >
        config.withdraw_close_time
    ) {

        return {
            status: false,
            message:
                `Withdraw closed at ${config.withdraw_close_time}`
        };

    }

    return {
        status: true
    };

};

module.exports = validateWithdraw;