const dbQuery = require("../utils/dbQuery");

/* =========================
   AUTO DEPOSIT HISTORY PAGE
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
        u.name
      FROM wallet w
      LEFT JOIN "users" u 
        ON u.id = w.user_id::integer
      WHERE w.txn_comment = 'Online UPI Credit From App'
      ORDER BY w.id DESC
      LIMIT 1000
    `);


    // console.log(result.rows);

    res.render("autoDeposit/index", {
      layout: "layouts/admin",
      title: "Auto Deposit History",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {

    console.error("AutoDeposit index error:", err);

    res.status(500).send("Server Error");
  }
};













exports.search = async (req, res) => {

  try {

    const { date } = req.body;

    console.log("SEARCH DATE =>", date);

    const result = await dbQuery(`
      SELECT 
        w.id,
        w.user_id,
        w.txn_crdt,
        w.transaction_id,
        w.txn_date,
        u.name
      FROM wallet w
      LEFT JOIN "users" u 
        ON u.id = w.user_id::integer
      WHERE w.txn_comment = 'Online UPI Credit From App'
      AND DATE(w.txn_date::timestamp) = $1::date
      ORDER BY w.id DESC
    `,[date]);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {

    console.log(err);

    res.json({
      status:false,
      data:[]
    });

  }

};