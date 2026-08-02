// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   VIEW
========================= */
exports.index = async (req, res) => {
    const { rows } = await dbQuery(
        "SELECT * FROM main_setting WHERE id = 1"
    );

    // console.log(rows[0]);

    res.render("admin/main-setting", {
        title: "Main Setting",
        layout: "layouts/admin",
        admin: req.session.admin,
        csrfToken: req.csrfToken(),
        data: rows[0]
    });
};

/* =========================
   UPDATE BANK
========================= */
exports.updateBank = async (req, res) => {
    const { account_holder_name, account_no, ifsc_code } = req.body;

    if (!account_holder_name || !account_no || !ifsc_code) {
        return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(
        `UPDATE main_setting
         SET account_holder_name=$1, account_no=$2, ifsc_code=$3
         WHERE id=1`,
        [account_holder_name, account_no, ifsc_code]
    );

    res.json({ res: "success", msg: "Successfully Updated", url: "/admin/main-setting" });
};

/* =========================
   UPDATE UPI
========================= */
exports.updateUpi = async (req, res) => {
    const { google_upi, phonepe_upi, other_upi } = req.body;

    if (!google_upi) {
        return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(
        `UPDATE main_setting
         SET google_upi=$1, phonepe_upi=$2, other_upi=$3
         WHERE id=1`,
        [google_upi, phonepe_upi, other_upi]
    );

    res.json({ res: "success", msg: "Successfully Updated", url: "/admin/main-setting" });
};

/* =========================
   UPDATE MAINTENANCE MSG
========================= */
exports.updateMaintenance = async (req, res) => {
    const { maintainance_share_message } = req.body;

    if (!maintainance_share_message) {
        return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(
        `UPDATE main_setting
         SET maintainance_share_message=$1
         WHERE id=1`,
        [maintainance_share_message]
    );

    res.json({ res: "success", msg: "Successfully Updated", url: "/admin/main-setting" });
};

/* =========================
   UPDATE VALUES
========================= */















exports.updateValues = async (req, res) => {
  try {

    const {
      min_deposite, max_deposite,
      min_withdrawal, max_withdrawal,
      min_transfer, max_transfer,
      min_bid, max_bid,
      welcome_bonus,
      withdraw_open_time, withdraw_close_time,
      withdraw_closing_day,
      global_batting
    } = req.body;

    if (!min_deposite || !max_deposite) {
      return res.json({ res: "error", msg: "Data required" });
    }
    
    const globalBatting =
    req.body.global_batting === "true" ||
    req.body.global_batting === true;

    console.log("FINAL:", globalBatting);
   
    console.log(globalBatting);
    await dbQuery(
      `UPDATE main_setting SET
        min_deposite=$1,
        max_deposite=$2,
        min_withdrawal=$3,
        max_withdrawal=$4,
        min_transfer=$5,
        max_transfer=$6,
        min_bid=$7,
        max_bid=$8,
        welcome_bonus=$9,
        withdraw_open_time=$10,
        withdraw_close_time=$11,
        withdraw_closing_day=$12,
        global_batting=$13
      WHERE id=1`,
      [
        min_deposite, max_deposite,
        min_withdrawal, max_withdrawal,
        min_transfer, max_transfer,
        min_bid, max_bid,
        welcome_bonus,
        withdraw_open_time,
        withdraw_close_time,
        Array.isArray(withdraw_closing_day)
          ? withdraw_closing_day.join(",")
          : "",
        globalBatting
      ]
    );

    res.json({
      res: "success",
      msg: "All Values Updated",
      url: "/admin/main-setting"
    });

  } catch (err) {
    console.log(err);
    res.json({ res: "error", msg: "Update Failed" });
  }
};









// exports.updateValues = async (req, res) => {
//     const {
//         min_deposite, max_deposite,
//         min_withdrawal, max_withdrawal,
//         min_transfer, max_transfer,
//         min_bid, max_bid,
//         welcome_bonus,
//         withdraw_open_time, withdraw_close_time,
//         withdraw_closing_day
//     } = req.body;

//     if (!min_deposite || !max_deposite) {
//         return res.json({ res: "error", msg: "Data required" });
//     }

//     await dbQuery(
//         `UPDATE main_setting SET
//             min_deposite=$1,
//             max_deposite=$2,
//             min_withdrawal=$3,
//             max_withdrawal=$4,
//             min_transfer=$5,
//             max_transfer=$6,
//             min_bid=$7,
//             max_bid=$8,
//             welcome_bonus=$9,
//             withdraw_open_time=$10,
//             withdraw_close_time=$11,
//             withdraw_closing_day=$12
//         WHERE id=1`,
//         [
//             min_deposite, max_deposite,
//             min_withdrawal, max_withdrawal,
//             min_transfer, max_transfer,
//             min_bid, max_bid,
//             welcome_bonus,
//             withdraw_open_time,
//             withdraw_close_time,
//             Array.isArray(withdraw_closing_day)
//                 ? withdraw_closing_day.join(",")
//                 : ""
//         ]
//     );

//     res.json({ res: "success", msg: "Successfully Updated", url: "/admin/main-setting" });
// };

/* =========================
   UPDATE APP LINK
========================= */
exports.updateApplink = async (req, res) => {
    const { app_link, applink_share_message } = req.body;

    if (!app_link || !applink_share_message) {
        return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(
        `UPDATE main_setting
         SET app_link=$1, applink_share_message=$2
         WHERE id=1`,
        [app_link, applink_share_message]
    );

    res.json({ res: "success", msg: "Successfully Updated", url: "/admin/main-setting" });
};

/* =========================
   TOGGLES
========================= */
exports.toggleMaintenance = async (req, res) => {
    await dbQuery(
        `UPDATE main_setting
         SET maintainance_status = NOT maintainance_status
         WHERE id=1`
    );
    res.json({ res: "success" });
};

exports.toggleGlobalBetting = async (req, res) => {
    await dbQuery(
        `UPDATE main_setting
         SET global_batting = NOT global_batting
         WHERE id=1`
    );
    res.json({ res: "success" });
};







exports.updatePaymentSettings = async (req, res) => {
    try {
        let { upi_status, primexpay_status } = req.body;

        console.log("RAW BODY:", req.body);

        // 🔥 FIX: array handle
        const upi = Array.isArray(upi_status)
            ? upi_status.includes('1') ? 1 : 0
            : (upi_status == '1' ? 1 : 0);

        const prime = Array.isArray(primexpay_status)
            ? primexpay_status.includes('1') ? 1 : 0
            : (primexpay_status == '1' ? 1 : 0);

        console.log("FINAL:", { upi, prime });

        await dbQuery(
            `UPDATE main_setting 
             SET upi_status=$1, primexpay_status=$2 
             WHERE id=1`,
            [upi, prime]
        );

        return res.json({
            res: "success",
            msg: "Payment settings updated!",
            url: "/admin/main-setting"
        });

    } catch (err) {
        console.log(err);
        return res.json({
            res: "error",
            msg: "Something went wrong"
        });
    }
};