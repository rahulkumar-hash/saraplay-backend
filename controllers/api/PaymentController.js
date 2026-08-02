// const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");

exports.addBank = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;

    const {
      bank_name,
      branch,
      account_holder_name,
      account_no,
      ifsc_code
    } = req.body || {};

    // 🛑 Basic validation
    if (!bank_name || !branch || !account_holder_name || !account_no || !ifsc_code) {
      return res.status(400).json({
        status: false,
        message: "All Fields Required!"
      });
    }

    const date = new Date();

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User Not Found!"
      });
    }

    // ✅ Check if bank details already exist
    const check = await dbQuery(
      "SELECT id FROM payment_details WHERE user_id=$1",
      [user_id]
    );

    if (check.rows.length > 0) {
      // 🔄 Update
      await dbQuery(
        `UPDATE payment_details
         SET bank_name=$1,
             branch=$2,
             account_holder_name=$3,
             account_no=$4,
             ifsc_code=$5
         WHERE user_id=$6`,
        [
          bank_name,
          branch,
          account_holder_name,
          account_no,
          ifsc_code,
          user_id
        ]
      );

      return res.json({
        status: true,
        message: "Updated Successfully",
        data:{
          bank_name:bank_name,
          branch:branch,
          account_holder_name:account_holder_name,
          account_no:account_no,
          ifsc_code:ifsc_code
        }
      });

    } else {
      // ➕ Insert
      await dbQuery(
        `INSERT INTO payment_details
         (user_id, bank_name, branch,
          account_holder_name, account_no,
          ifsc_code, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [
          user_id,
          bank_name,
          branch,
          account_holder_name,
          account_no,
          ifsc_code,
          date
        ]
      );

      return res.json({
        status: true,
        message: "Added Successfully",
        data:{
          bank_name:bank_name,
          branch:branch,
          account_holder_name:account_holder_name,
          account_no:account_no,
          ifsc_code:ifsc_code
        }
      });
    }

  } catch (error) {
    console.error("Add Bank Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};




exports.addPhonepe = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { phonepe } = req.body || {};

    if (!phonepe) {
      return res.status(400).json({
        status: false,
        message: "PhonePe ID Required!"
      });
    }

    const date = new Date();

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User Not Found!"
      });
    }

    // ✅ Check if record exists
    const check = await dbQuery(
      "SELECT id FROM payment_details WHERE user_id=$1",
      [user_id]
    );

    if (check.rows.length > 0) {

      // 🔄 Update existing record
      await dbQuery(
        `UPDATE payment_details
         SET phonepe=$1
         WHERE user_id=$2`,
        [phonepe, user_id]
      );

      return res.json({
        status: true,
        message: "Updated Successfully"
      });

    } else {

      // ⚠️ IMPORTANT:
      // Agar table me NOT NULL columns hain (bank_name, branch, etc.)
      // to unko empty string bhejna padega

      await dbQuery(
        `INSERT INTO payment_details
         (user_id, phonepe, bank_name, branch,
          account_holder_name, account_no,
          ifsc_code, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          user_id,
          phonepe,
          "",   // bank_name
          "",   // branch
          "",   // account_holder_name
          "",   // account_no
          "",   // ifsc_code
          date
        ]
      );

      return res.json({
        status: true,
        message: "Added Successfully"
      });
    }

  } catch (error) {
    console.error("Add PhonePe Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};


exports.addGooglePay = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { google_pay } = req.body || {};

    if (!google_pay) {
      return res.status(400).json({
        status: false,
        message: "Google Pay ID Required!"
      });
    }

    const date = new Date();

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User Not Found!"
      });
    }

    // ✅ Check if payment record exists
    const check = await dbQuery(
      "SELECT id FROM payment_details WHERE user_id=$1",
      [user_id]
    );

    if (check.rows.length > 0) {

      // 🔄 Update existing record
      await dbQuery(
        `UPDATE payment_details
         SET google_pay=$1
         WHERE user_id=$2`,
        [google_pay, user_id]
      );

      return res.json({
        status: true,
        message: "Updated Successfully"
      });

    } else {

      // ⚠️ If table has NOT NULL columns, send default values
      await dbQuery(
        `INSERT INTO payment_details
         (user_id, google_pay,
          bank_name, branch,
          account_holder_name, account_no,
          ifsc_code, phonepe, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          user_id,
          google_pay,
          "",  // bank_name
          "",  // branch
          "",  // account_holder_name
          "",  // account_no
          "",  // ifsc_code
          "",  // phonepe
          date
        ]
      );

      return res.json({
        status: true,
        message: "Added Successfully"
      });
    }

  } catch (error) {
    console.error("Add GooglePay Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};










exports.addPaytm = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { paytm } = req.body || {};

    if (!paytm) {
      return res.status(400).json({
        status: false,
        message: "Paytm ID Required!"
      });
    }

    const date = new Date();

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "User Not Found!"
      });
    }

    // ✅ Check if payment record exists
    const check = await dbQuery(
      "SELECT id FROM payment_details WHERE user_id=$1",
      [user_id]
    );

    if (check.rows.length > 0) {

      // 🔄 Update existing record
      await dbQuery(
        `UPDATE payment_details
         SET paytm=$1
         WHERE user_id=$2`,
        [paytm, user_id]
      );

      return res.json({
        status: true,
        message: "Updated Successfully"
      });

    } else {

      // ⚠️ Insert with default values for NOT NULL columns
      await dbQuery(
        `INSERT INTO payment_details
         (user_id, paytm,
          bank_name, branch,
          account_holder_name, account_no,
          ifsc_code, phonepe, google_pay, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          user_id,
          paytm,
          "",  // bank_name
          "",  // branch
          "",  // account_holder_name
          "",  // account_no
          "",  // ifsc_code
          "",  // phonepe
          "",  // google_pay
          date
        ]
      );

      return res.json({
        status: true,
        message: "Added Successfully"
      });
    }

  } catch (error) {
    console.error("Add Paytm Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};















exports.getPaymentDetails = async (req, res) => {
  const userId = req.user.id;
  
  const result = await dbQuery(
    `SELECT * FROM payment_details 
     WHERE user_id=$1`,
    [userId]
  );

  if (result.rows.length) {
    res.json({
      status: true,
      message: "Payment Details Found",
      data: result.rows
    });
  } else {
    res.json({
      status: false,
      message: "No Payment Details Found",
      data: []
    });
  }
};




exports.getBankDetails = async (req, res) => {
  const userId = req.user.id;
  // const userId=28;
  const result = await dbQuery(
    `SELECT * FROM payment_details 
     WHERE user_id=$1`,
    [userId]
  );

  if (result.rows.length) {
    res.json({
      status: true,
      message: "Payment Details Found",
      data: result.rows
    });
  } else {
    res.json({
      status: false,
      message: "No Payment Details Found",
      data: []
    });
  }
};





