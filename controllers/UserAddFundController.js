// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const { sendSingleNotification } = require("../utils/sendNotification");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  res.render("userAddFund/index", {
    title: "User Add Fund",
    layout: "layouts/admin",
    csrfToken: req.csrfToken(),
    admin: req.session.admin
  });
};

/* =========================
   LOAD USERS (AJAX)
========================= */
exports.getUsers = async (req, res) => {
  try {
    const users = await dbQuery(`
      SELECT id, name, mobile
      FROM "users"
      ORDER BY id DESC
    `);

    res.json({ status: true, data: users.rows });

  } catch (err) {
    console.error("User list error:", err);
    res.json({ status: false, data: [] });
  }
};

/* =========================
   ADD FUND
========================= */
exports.addFund = async (req, res) => {
  try {
    const { user_id, amount } = req.body;

    if (!user_id || !amount || amount <= 0) {
      return res.json({ res: "error", msg: "Invalid data" });
    }

    // 1️⃣ Wallet update
    await dbQuery(`
      UPDATE "user"
      SET wallet = COALESCE(wallet,0) + $1
      WHERE id = $2
    `, [amount, user_id]);

    // 2️⃣ Transaction log (recommended)
    await dbQuery(`
      INSERT INTO wallet_transaction
      (user_id, amount, type, remark)
      VALUES ($1,$2,'credit','Admin added fund')
    `, [user_id, amount]);

    // 🔔 Deposit notification (Firebase — only if notif_deposit = 1)
    try {
      console.log(`🔍 [UserAddFundController.addFund] Checking deposit notif for User ID: ${user_id}`);
      const userNotif = await dbQuery(
        `SELECT fcm_token, notif_deposit FROM users WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      console.log(`🔍 [UserAddFundController.addFund] DB Result:`, JSON.stringify(userNotif.rows[0] || null));
      if (
        userNotif.rows.length &&
        userNotif.rows[0].fcm_token &&
        Number(userNotif.rows[0].notif_deposit) === 1
      ) {
        await sendSingleNotification(
          userNotif.rows[0].fcm_token,
          "✅ Fund Added Successfully",
          `₹${amount} has been credited to your wallet by Admin.`
        );
        console.log(`📲 Deposit notification sent to User ID: ${user_id}`);
      } else if (userNotif.rows.length && Number(userNotif.rows[0].notif_deposit) === 0) {
        console.log(`🔕 Deposit notification OFF for User ID: ${user_id}, skipped`);
      } else if (!userNotif.rows.length) {
        console.log(`❌ User ID ${user_id} not found in users table`);
      } else if (!userNotif.rows[0].fcm_token) {
        console.log(`❌ FCM token missing for User ID: ${user_id}`);
      }
    } catch (notifErr) {
      console.error("❌ Deposit Notification Error:", notifErr);
    }

    res.json({ res: "success", msg: "Fund added successfully" });

  } catch (err) {
    console.error("Add fund error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
