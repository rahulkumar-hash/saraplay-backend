const pool = require("../../config/db");
const dbQuery = require("../../utils/dbQuery");
const { sendSingleNotification } = require("../../utils/sendNotification");


exports.walletRecharge = async (req, res) => {
  const client = await pool.connect(); // transaction ke liye

  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { amount } = req.body || {};

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        status: false,
        message: "Valid amount is required"
      });
    }

    const txntype = "Online UPI Credit From App";
    const txn_id = Math.floor(10000000 + Math.random() * 90000000);
    const date = new Date();

    await client.query("BEGIN");

    // ✅ Get last wallet record (excluding Master role)
    const lastTxn = await client.query(
      `SELECT txn_clbal FROM wallet
       WHERE user_id=$1 AND role!='Master'
       ORDER BY id DESC
       LIMIT 1`,
      [user_id]
    );

    let openingBalance = 0;
    let closingBalance = 0;

    if (lastTxn.rows.length > 0) {
      openingBalance = Number(lastTxn.rows[0].txn_clbal);
      closingBalance = openingBalance + Number(amount);
    } else {
      openingBalance = 0;
      closingBalance = Number(amount);
    }

    // ✅ Insert new transaction
    const insertTxn = await client.query(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
        txn_comment, txn_date, transfer_user_id, transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        user_id,
        openingBalance,
        amount,
        0,
        closingBalance,
        txntype,
        date,
        "Online",
        txn_id
      ]
    );

    await client.query("COMMIT");

    // 🔔 Deposit notification (if user has notif_deposit = 1)
    try {
      const userNotif = await dbQuery(
        `SELECT fcm_token, notif_deposit FROM users WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      if (
        userNotif.rows.length &&
        userNotif.rows[0].fcm_token &&
        Number(userNotif.rows[0].notif_deposit) === 1
      ) {
        await sendSingleNotification(
          userNotif.rows[0].fcm_token,
          "✅ Deposit Successful",
          `₹${amount} has been added to your wallet. New balance: ₹${closingBalance}`
        );
        console.log(`📲 Deposit notification sent to User ID: ${user_id}`);
      } else if (userNotif.rows.length && Number(userNotif.rows[0].notif_deposit) === 0) {
        console.log(`🔕 Deposit notification OFF for User ID: ${user_id}, skipped`);
      }
    } catch (notifErr) {
      console.error("❌ Deposit Notification Error:", notifErr);
    }

    return res.json({
      status: true,
      message: "Success",
      transaction_id: txn_id,
      closing_balance: closingBalance
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Wallet Recharge Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed"
    });
  } finally {
    client.release();
  }
};



exports.fundTransfer = async (req, res) => {
  const client = await pool.connect();

  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { amount, mobile } = req.body || {};

    if (!amount || !mobile || Number(amount) <= 0) {
      return res.status(400).json({
        status: false,
        message: "All Fields Required!"
      });
    }

    await client.query("BEGIN");

    // ✅ Receiver check
    const receiver = await client.query(
      "SELECT id, mobile FROM users WHERE mobile=$1",
      [mobile]
    );

    if (receiver.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({
        status: false,
        message: "User Not Found!"
      });
    }

    const receiver_id = receiver.rows[0].id;

    if (receiver_id === user_id) {
      await client.query("ROLLBACK");
      return res.json({
        status: false,
        message: "Cannot transfer to yourself!"
      });
    }

    // ✅ Sender last balance
    const senderWallet = await client.query(
      `SELECT txn_clbal FROM wallet
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
      [user_id]
    );

    let senderBalance = senderWallet.rows.length > 0
      ? Number(senderWallet.rows[0].txn_clbal)
      : 0;

    if (senderBalance < Number(amount)) {
      await client.query("ROLLBACK");
      return res.json({
        status: false,
        message: "Insufficient Balance!"
      });
    }

    const newSenderBalance = senderBalance - Number(amount);
    const txn_id1 = Math.floor(10000000 + Math.random() * 90000000);
    const txn_id2 = Math.floor(10000000 + Math.random() * 90000000);
    const date = new Date();

    // ✅ Sender Debit Entry
    await client.query(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
        txn_comment, txn_date, transfer_user_id,
        transaction_id, txn_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        user_id,
        senderBalance,
        0,
        amount,
        newSenderBalance,
        `Fund Transfer to ${mobile}`,
        date,
        receiver_id,
        txn_id1,
        "Transfer"
      ]
    );

    // ✅ Receiver last balance
    const receiverWallet = await client.query(
      `SELECT txn_clbal FROM wallet
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1`,
      [receiver_id]
    );

    let receiverBalance = receiverWallet.rows.length > 0
      ? Number(receiverWallet.rows[0].txn_clbal)
      : 0;

    const newReceiverBalance = receiverBalance + Number(amount);

    // ✅ Receiver Credit Entry
    await client.query(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
        txn_comment, txn_date, transfer_user_id,
        transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        receiver_id,
        receiverBalance,
        amount,
        0,
        newReceiverBalance,
        `Fund Received from ${req.user.mobile || user_id}`,
        date,
        user_id,
        txn_id2
      ]
    );

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Success",
      transaction_id: txn_id1,
      closing_balance: newSenderBalance
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Fund Transfer Error:", error);

    return res.status(500).json({
      status: false,
      message: "Something Went Wrong!"
    });
  } finally {
    client.release();
  }
};





















































































exports.getWalletBalance = async (req, res) => {
  const userId = req.user.id;

  const user = await dbQuery(
    "SELECT wallet FROM user WHERE id=$1",
    [userId]
  );

  res.json({
    status: true,
    wallet: user.rows[0].wallet
  });
};



exports.get

















WalletTransactions = async (req, res) => {
  const userId = req.user.id;

  const transactions = await dbQuery(
    "SELECT * FROM wallet_transaction WHERE user_id=$1 ORDER BY id DESC",
    [userId]
  );

  res.json({
    status: true,
    data: transactions.rows
  });
};



















































