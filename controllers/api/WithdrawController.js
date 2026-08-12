const pool = require("../../config/db");
const validateWithdraw =
require("../../utils/withdrawValidation");
const dbQuery = require("../../utils/dbQuery");
const { sendSingleNotification } = require("../../utils/sendNotification");










exports.withdrawRequest = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;



    // console.log(user_id);
    const { amount, payment_mode = "" } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        status: false,
        message: "Valid amount required!"
      });
      
    }



    const check = await validateWithdraw(amount);
    // console.log(check);
    if (!check.status) {
      
      return res.status(400).json({
        status: false,
        message: check.message
      });

        // return res.json(check);

    }










    const now = new Date();
    const today = now.toDateString();
    const txnId = Math.floor(10000000 + Math.random() * 90000000);

    await client.query("BEGIN");

    // ✅ User check
    const userCheck = await client.query(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({ status: false, message: "User Not Found!" });
    }

    // ✅ Check active pending request
    const activeReq = await client.query(
      `SELECT id FROM withdraw_request
       WHERE user_id=$1 AND status='Pending'
       LIMIT 1`,
      [user_id]
    );

    if (activeReq.rows.length > 0) {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message:
          "You already have a pending withdraw request. Please wait until it is completed."
      });
    }

    // ✅ Wallet check
    const wallet = await client.query(
      `SELECT txn_clbal FROM wallet
       WHERE user_id=$1 AND role is NULL
       ORDER BY id DESC
       LIMIT 1`,
      [user_id]
    );

    // console.log(wallet);



    const currentBalance =
      wallet.rows.length > 0 ? Number(wallet.rows[0].txn_clbal) : 0;

    // console.log(currentBalance);


    if (currentBalance < Number(amount)) {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message: "Insufficient Fund!"
      });
    }

    // ✅ Bank details check
    const payment = await client.query(
      "SELECT id FROM payment_details WHERE user_id=$1",
      [user_id]
    );

    if (payment.rows.length === 0) {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message: "Please fill your bank details!"
      });
    }

    // ✅ Last withdraw check (same day rule)
    const lastReq = await client.query(
      `SELECT date, status FROM withdraw_request
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
      [user_id]
    );

    if (lastReq.rows.length > 0) {
      const lastDate = new Date(lastReq.rows[0].date).toDateString();

      if (
        lastDate === today &&
        lastReq.rows[0].status !== "Accepted"
      ) {
        // await client.query("ROLLBACK");
        try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
        return res.json({
          status: false,
          message: "You Can't Place Request Now"
        });
      }
    }

    // ✅ Insert Withdraw Request
    await client.query(
      `INSERT INTO withdraw_request
       (user_id, amount, payment_mode, txn_id, date, status)
       VALUES ($1,$2,$3,$4,$5,'Pending')`,
      [user_id, amount, payment_mode, txnId, now]
    );

    // ✅ Deduct from wallet
    const newBalance = currentBalance - Number(amount);
    const walletTxnId = Math.floor(
      10000000 + Math.random() * 90000000
    );

    await client.query(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt,
        txn_clbal, txn_comment, txn_date,
        transfer_user_id, transaction_id, txn_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        user_id,
        currentBalance,
        0,
        amount,
        newBalance,
        "Fund Withdraw",
        now,
        "Admin",
        walletTxnId,
        "Withdraw"
      ]
    );

    await client.query("COMMIT");

    // 🔔 Withdrawal notification (if user has notif_withdrawal = 1)
    try {
      const userNotif = await dbQuery(
        `SELECT fcm_token, notif_withdrawal FROM users WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      if (
        userNotif.rows.length &&
        userNotif.rows[0].fcm_token &&
        Number(userNotif.rows[0].notif_withdrawal) === 1
      ) {
        await sendSingleNotification(
          userNotif.rows[0].fcm_token,
          "💸 Withdrawal Request Submitted",
          `Your withdrawal request of ₹${amount} has been submitted successfully.`
        );
        console.log(`📲 Withdrawal notification sent to User ID: ${user_id}`);
      } else if (userNotif.rows.length && Number(userNotif.rows[0].notif_withdrawal) === 0) {
        console.log(`🔕 Withdrawal notification OFF for User ID: ${user_id}, skipped`);
      }
    } catch (notifErr) {
      console.error("❌ Withdrawal Notification Error:", notifErr);
    }

    return res.json({
      status: true,
      message: "Request Send Successfully",
      closing_balance: newBalance
    });

  } catch (error) {
    // await client.query("ROLLBACK");


      try {
          await client.query("ROLLBACK");
      } catch (e) {
          console.log("Rollback Error:", e);
      }

      




    console.error("Withdraw Request Error:", error);

    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  } finally {
    client.release();
  }
};




























exports.withdrawFundHistory = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;

    const body = req.body || {};
    let page = parseInt(body.page) || 1;
    let limit = parseInt(body.limit) || 10;

    if (page <= 0) page = 1;
    if (limit <= 0 || limit > 100) limit = 10;

    const offset = (page - 1) * limit;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Invalid User"
      });
    }

    // 📊 Total count
    const countResult = await dbQuery(
      "SELECT COUNT(*) FROM withdraw_request WHERE user_id=$1",
      [user_id]
    );

    const totalRecords = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "Data Not Found",
        data: []
      });
    }

    // 📄 Data query with pagination
    const result = await dbQuery(
      `SELECT * FROM withdraw_request
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: page,
        per_page: limit,
        total_records: totalRecords,
        total_pages: totalPages
      },
      result: result.rows
    });

  } catch (error) {
    console.error("Withdraw Fund History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};





















































exports.processWithdraw = async (req, res) => {
  const client = await pool.connect();

  try {
    const { request_id, action } = req.body;
    // action = "approved" OR "rejected"

    await client.query("BEGIN");

    const withdraw = await client.query(
      "SELECT * FROM withdraw_requests WHERE id=$1 FOR UPDATE",
      [request_id]
    );

    if (!withdraw.rows.length) {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message: "Request Not Found"
      });
    }

    if (withdraw.rows[0].status !== "pending") {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message: "Already Processed"
      });
    }

    const userId = withdraw.rows[0].user_id;
    const amount = parseFloat(withdraw.rows[0].amount);

    if (action === "approved") {

      await client.query(
        "UPDATE withdraw_requests SET status='approved', processed_at=NOW() WHERE id=$1",
        [request_id]
      );

    } else if (action === "rejected") {

      // 🔒 Lock user wallet
      const user = await client.query(
        "SELECT wallet FROM user WHERE id=$1 FOR UPDATE",
        [userId]
      );

      const beforeBalance = parseFloat(user.rows[0].wallet);
      const afterBalance = beforeBalance + amount;

      // Refund wallet
      await client.query(
        "UPDATE user SET wallet=$1 WHERE id=$2",
        [afterBalance, userId]
      );

      // Wallet transaction credit
      await client.query(
        `INSERT INTO wallet_transaction
         (user_id,type,amount,before_balance,after_balance,remark)
         VALUES($1,'credit',$2,$3,$4,$5)`,
        [userId, amount, beforeBalance, afterBalance, "Withdraw Rejected Refund"]
      );

      await client.query(
        "UPDATE withdraw_requests SET status='rejected', processed_at=NOW() WHERE id=$1",
        [request_id]
      );

    } else {
      // await client.query("ROLLBACK");
      try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
      return res.json({
        status: false,
        message: "Invalid Action"
      });
    }

    await client.query("COMMIT");

    res.json({
      status: true,
      message: `Withdraw ${action} Successfully`
    });

  } catch (err) {
    // await client.query("ROLLBACK");
    try {
        await client.query("ROLLBACK");
    } catch (e) {
        console.log("Rollback Error:", e);
    }

    
    console.log(err);
    res.json({
      status: false,
      message: "Processing Failed"
    });
  } finally {
    client.release();
  }
}; 