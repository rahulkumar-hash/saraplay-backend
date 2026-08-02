// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD (ALL TRANSFER)
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        w.*,
        u1.name  AS sender_name,
        u1.mobile AS sender_mobile,
        u2.name  AS receiver_name,
        u2.mobile AS receiver_mobile
      FROM wallet w
      JOIN "users" u1 ON u1.id = w.user_id::integer
      JOIN "users" u2 ON u2.id = w.transfer_user_id::integer
      WHERE w.txn_type = 'Transfer'
      ORDER BY w.id DESC
    `);

    // 🔥 FIX: CAST txn_dbdt to NUMERIC
    const total = await dbQuery(`
      SELECT COALESCE(SUM(w.txn_dbdt::numeric), 0) AS total_amount
      FROM wallet w
      WHERE w.txn_type = 'Transfer'
    `);

    res.render("transferPoint/index", {
      layout: "layouts/admin",
      title: "Transfer Point Report",
      data: result.rows,
      totalAmount: total.rows[0].total_amount,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("TransferPoint index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX FILTER BY DATE
========================= */
exports.search = async (req, res) => {
  try {
    const { date } = req.body;

    let condition = `WHERE w.txn_type='Transfer'`;
    let values = [];

    if (date) {
      condition += ` AND to_date(w.txn_date,'DD Mon YYYY') = $1::date`;
      values.push(date);
    }

    const result = await dbQuery(`
      SELECT 
        w.*,
        u1.name  AS sender_name,
        u1.mobile AS sender_mobile,
        u2.name  AS receiver_name,
        u2.mobile AS receiver_mobile
      FROM wallet w
      JOIN "users" u1 ON u1.id = w.user_id::integer
      JOIN "users" u2 ON u2.id = w.transfer_user_id::integer
      ${condition}
      ORDER BY w.id DESC
    `, values);

    // 🔥 FIX: CAST txn_dbdt
    const total = await dbQuery(`
      SELECT COALESCE(SUM(w.txn_dbdt::numeric), 0) AS total_amount
      FROM wallet w
      ${condition}
    `, values);

    res.json({
      status: true,
      data: result.rows,
      totalAmount: total.rows[0].total_amount
    });

  } catch (err) {
    console.error("TransferPoint search error:", err);
    res.json({ status: false, data: [], totalAmount: 0 });
  }
};
