// const pool = require("../../config/db");
const dbQuery = require("../../utils/dbQuery");


exports.getAppLimitations = async (req, res) => {
  try {

    // ✅ Get main_setting
    const mainSetting = await dbQuery(
      "SELECT * FROM main_setting WHERE id=$1",
      [1]
    );

    if (mainSetting.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found!"
      });
    }

    // ✅ Get contact_settings
    const contactSetting = await dbQuery(
      "SELECT * FROM contact_settings WHERE id=$1",
      [1]
    );

    const main = mainSetting.rows[0];
    const contact = contactSetting.rows[0] || {};
    

    const response = [
      {
        min_deposite: main.min_deposite,
        max_deposite: main.max_deposite,
        min_withdrawal: main.min_withdrawal,
        max_withdrawal: main.max_withdrawal,
        min_transfer: main.min_transfer,
        max_transfer: main.max_transfer,
        min_bid: main.min_bid,
        max_bid: main.max_bid,
        withdraw_open_time: main.withdraw_open_time,
        withdraw_close_time: main.withdraw_close_time,
        withdraw_closing_days: main.withdraw_closing_day,
        global_batting_status: main.global_batting,
        google_upi: main.google_upi,
        phonepe_upi: main.phonepe_upi,
        other_upi: main.other_upi,
        bank_added: 'yes',
        whatsapp_number: contact.whatsapp || null,
        calling_number: contact.mobile || null
      }
    ];

    // console.log(response);

    return res.json({
      status: true,
      message: "Data Found",
      result: response
    });

  } catch (error) {
    console.error("App Limitations Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};




exports.getAppMaintenance = async (req, res) => {
  try {

    const check = await dbQuery(
      `SELECT maintainance_share_message
       FROM main_setting
       WHERE id=$1 AND maintainance_status=$2`,
      [1, 'true']   // ⚠️ agar column varchar hai
    );

    if (check.rows.length > 0) {

      const response = [
        {
          message: check.rows[0].maintainance_share_message
        }
      ];

      return res.json({
        status: true,
        message: "Data Found",
        result: response
      });

    } else {
      return res.json({
        status: false,
        message: "Data Not Found!"
      });
    }

  } catch (error) {
    console.error("App Maintainence Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};






exports.getBanner = async (req, res) => {
  try {
    const result = await dbQuery(
      "SELECT * FROM banner ORDER BY id DESC"
    );

    // 🛑 Agar data empty ho
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No Banner Found",
        data: []
      });
    }

    // ✅ Agar data mil gaya
    return res.json({
      status: true,
      message: "Banner Data Found",
      data: result.rows
    });

  } catch (error) {
    console.error("Get Banner Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};





exports.getReferalCode = async (req, res) => {
  const userId = req.user.id;

  const result = await dbQuery(
    "SELECT referal_code FROM user WHERE id=$1",
    [userId]
  );

  if (result.rows.length) {
    res.json({
      status: true,
      message: "Referal Code Found",
      referal_code: result.rows[0].referal_code
    });
  } else {
    res.json({
      status: false,
      message: "User Not Found"
    });
  }
};