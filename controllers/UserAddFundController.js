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

    if (!user_id || !amount || Number(amount) <= 0) {
      return res.json({ res: "error", msg: "Invalid data" });
    }

    const amt = Number(amount);

    // 1️⃣ Get current wallet balance
    const lastWallet = await dbQuery(
      `SELECT txn_clbal FROM wallet WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user_id]
    );
    const opening = lastWallet.rows.length ? Number(lastWallet.rows[0].txn_clbal) : 0;
    const closing = opening + amt;
    const txn_id  = Math.floor(10000000 + Math.random() * 90000000);

    // 2️⃣ Insert wallet transaction (same format as rest of app)
    await dbQuery(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date, transfer_user_id, transaction_id)
       VALUES ($1, $2, $3, 0, $4, 'Direct Credit By Admin', NOW(), 'Admin', $5)`,
      [user_id, opening, amt, closing, txn_id]
    );

    // 3️⃣ Push notification — only if notif_deposit = 1 and fcm_token exists
    try {
      const userNotif = await dbQuery(
        `SELECT fcm_token, notif_deposit, name FROM users WHERE id = $1 LIMIT 1`,
        [user_id]
      );

      const u = userNotif.rows[0];

      if (u && u.fcm_token && Number(u.notif_deposit) === 1) {
        await sendSingleNotification(
          u.fcm_token,
          "✅ Fund Added Successfully",
          `₹${amt} credited to your wallet. New Balance: ₹${closing}`
        );
        console.log(`📲 Add Fund notification sent → User ID: ${user_id}`);
      } else {
        console.log(`🔕 Notification skipped → User ID: ${user_id} | fcm: ${u?.fcm_token ? 'yes' : 'no'} | notif_deposit: ${u?.notif_deposit}`);
      }
    } catch (notifErr) {
      console.error("❌ Add Fund Notification Error:", notifErr.message);
    }

    return res.json({ res: "success", msg: "Fund added successfully" });

  } catch (err) {
    console.error("Add fund error:", err);
    return res.json({ res: "error", msg: "Something went wrong" });
  }
};
