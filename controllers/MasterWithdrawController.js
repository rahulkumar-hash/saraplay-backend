// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT 
        wr.*,
        m.name,
        m.mobile
      FROM withdraw_request wr
      JOIN master m ON m.id = wr.user_id
      WHERE wr.role = 'Master'
      ORDER BY wr.id DESC
    `);

    res.render("withdraw/master", {
      title: "Withdraw Request History",
      layout: "layouts/admin",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("MasterWithdraw index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   ACCEPT WITHDRAW
========================= */
exports.accept = async (req, res) => {
  try {
    const { id, user_id, amount } = req.body;

    await dbQuery(
      `UPDATE withdraw_request SET status='Accepted' WHERE id=$1`,
      [id]
    );

    // 👉 yahan wallet deduction / transaction bhi kar sakte ho

    res.json({ res: "success", msg: "Withdraw request accepted" });

  } catch (err) {
    console.error("Withdraw accept error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};

/* =========================
   REJECT WITHDRAW
========================= */
exports.reject = async (req, res) => {
  try {
    const { id, reason } = req.body;

    await dbQuery(
      `UPDATE withdraw_request 
       SET status='Rejected', reason=$1 
       WHERE id=$2`,
      [reason, id]
    );

    res.json({ res: "success", msg: "Withdraw request rejected" });

  } catch (err) {
    console.error("Withdraw reject error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
