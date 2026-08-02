// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        w.*,
        u.name,
        u.mobile
      FROM withdraw_request w
      JOIN "users" u ON u.id = w.user_id::integer
      ORDER BY w.id DESC limit 100
    `);

    res.render("withdraw/index", {
      layout: "layouts/admin",
      title: "Withdraw History Report",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("Withdraw index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   FILTER BY DATE (AJAX)
========================= */
exports.search = async (req, res) => {
  try {
    const { date } = req.body;

    let condition = '';
    let values = [];

    if (date) {
      condition = `WHERE to_date(w.date,'DD Mon YYYY') = $1::date`;
      values.push(date);
    }

    const result = await dbQuery(`
      SELECT 
        w.*,
        u.name,
        u.mobile
      FROM withdraw_request w
      JOIN "user" u ON u.id = w.user_id::integer
      ${condition}
      ORDER BY w.id DESC
    `, values);

    res.json({ status: true, data: result.rows });

  } catch (err) {
    console.error("Withdraw search error:", err);
    res.json({ status: false, data: [] });
  }
};

/* =========================
   APPROVE WITHDRAW
========================= */
exports.approve = async (req, res) => {
  try {
    const { id, user_id, amount } = req.body;

    await dbQuery("BEGIN");

    await dbQuery(`
      UPDATE withdraw_request
      SET status='Accepted'
      WHERE id=$1
    `, [id]);

    await dbQuery(`
      UPDATE wallet
      SET balance = balance::numeric - $1::numeric
      WHERE user_id=$2
    `, [amount, user_id]);

    await dbQuery("COMMIT");

    res.json({ res: "success", msg: "Withdraw approved successfully" });

  } catch (err) {
    await dbQuery("ROLLBACK");
    console.error("Withdraw approve error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};

/* =========================
   REJECT WITHDRAW
========================= */
// exports.reject = async (req, res) => {
//   try {
//     const { id, reason } = req.body;

//     await dbQuery(`
//       UPDATE withdraw_request
//       SET status='Rejected', reason=$1
//       WHERE id=$2
//     `, [reason, id]);

//     res.json({ res: "success", msg: "Withdraw rejected" });

//   } catch (err) {
//     console.error("Withdraw reject error:", err);
//     res.json({ res: "error", msg: "Something went wrong" });
//   }
// };

exports.reject = async (req, res) => {

  // const client = await pool.connect();

  try {

    const { id, reason } = req.body;

    // await client.query("BEGIN");

    // Withdraw Details
    const withdraw = await dbQuery(
      `SELECT *
       FROM withdraw_request
       WHERE id=$1
       FOR UPDATE`,
      [id]
    );

    if (!withdraw.rows.length) {

      // await client.query("ROLLBACK");

      return res.json({
        res: "error",
        msg: "Withdraw not found"
      });

    }

    const data = withdraw.rows[0];

    if (data.status === "Rejected") {

      // await client.query("ROLLBACK");

      return res.json({
        res: "error",
        msg: "Already rejected"
      });

    }

    // Last Wallet Balance
    const wallet = await dbQuery(
      `SELECT txn_clbal
       FROM wallet
       WHERE user_id=$1
       AND role IS NULL
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [data.user_id]
    );

    const currentBalance =
      wallet.rows.length
      ? Number(wallet.rows[0].txn_clbal)
      : 0;

    const newBalance =
      currentBalance +
      Number(data.amount);

    // Refund Entry
    await dbQuery(
      `INSERT INTO wallet
      (
        user_id,
        txn_opbal,
        txn_crdt,
        txn_dbdt,
        txn_clbal,
        txn_comment,
        txn_date,
        transfer_user_id,
        transaction_id,
        txn_type
      )
      VALUES(
        $1,$2,$3,$4,$5,
        $6,NOW(),$7,$8,$9
      )`,
      [
        data.user_id,
        currentBalance,
        data.amount,
        0,
        newBalance,
        "Withdraw Rejected Refund",
        "Admin",
        Date.now(),
        "Refund"
      ]
    );

    // Update Status
    await dbQuery(
      `UPDATE withdraw_request
       SET
       status='Rejected',
       reason=$1
       WHERE id=$2`,
      [reason, id]
    );

    // await dbQuery("COMMIT");

    res.json({
      res: "success",
      msg: "Withdraw rejected and refunded"
    });

  } catch (err) {

    // await client.query("ROLLBACK");

    console.error(
      "Withdraw reject error:",
      err
    );

    res.json({
      res: "error",
      msg: "Something went wrong"
    });

  } finally {

    // client.release();

  }

};
