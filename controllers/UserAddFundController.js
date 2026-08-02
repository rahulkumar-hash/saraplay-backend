// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
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

    res.json({ res: "success", msg: "Fund added successfully" });

  } catch (err) {
    console.error("Add fund error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
