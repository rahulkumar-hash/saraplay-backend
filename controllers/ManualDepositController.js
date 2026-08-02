// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   MANUAL DEPOSIT HISTORY
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        w.id,
        w.user_id,
        w.txn_crdt,
        w.transaction_id,
        w.txn_date,
        u.name,
        u.mobile
      FROM wallet w
      LEFT JOIN "users" u ON u.id = w.user_id::integer
      WHERE w.txn_comment = 'Direct Credit By Admin'
      ORDER BY w.id DESC
      LIMIT 1000
    `);

    res.render("manualDeposit/index", {
      layout: "layouts/admin",
      title: "Manual Deposit History",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("ManualDeposit index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   SEARCH BY DATE (AJAX)
========================= */
exports.search = async (req, res) => {
  try {
    const { date } = req.body;

    const result = await dbQuery(`
      SELECT 
        w.id,
        w.user_id,
        w.txn_crdt,
        w.transaction_id,
        w.txn_date,
        u.name,
        u.mobile
      FROM wallet w
      LEFT JOIN "users" u ON u.id = w.user_id::integer
      WHERE w.txn_comment = 'Direct Credit By Admin'
        AND to_date(w.txn_date,'DD Mon YYYY') = $1::date
      ORDER BY w.id DESC
    `, [date]);

    res.json({ status: true, data: result.rows });

  } catch (err) {
    console.error("ManualDeposit search error:", err);
    res.json({ status: false, data: [] });
  }
};
