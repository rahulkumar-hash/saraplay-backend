// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD (EMPTY)
========================= */
exports.index = async (req, res) => {
  res.render("withdraw/user", {
    title: "Withdraw Request History",
    layout: "layouts/admin",
    csrfToken: req.csrfToken(),
    admin: req.session.admin
  });
};

/* =========================
   AJAX DATA LOAD
========================= */
exports.getData = async (req, res) => {
  try {
    const draw = parseInt(req.body.draw) || 1;
    const start = parseInt(req.body.start) || 0;
    const length = parseInt(req.body.length) || 10;

    // 🔥 TOTAL COUNT
    const totalResult = await dbQuery(`
      SELECT COUNT(*) FROM withdraw_request
      WHERE (role IS NULL OR role = 'User')
    `);
    const totalRecords = parseInt(totalResult.rows[0].count);

    // 🔥 DATA QUERY (with pagination)
    const dataResult = await dbQuery(`
      SELECT 
        wr.*,
        u.name,
        u.mobile
      FROM withdraw_request wr
      JOIN "users" u ON u.id = wr.user_id
      WHERE (wr.role IS NULL OR wr.role = 'User')
      ORDER BY wr.id DESC
      LIMIT $1 OFFSET $2
    `, [length, start]);

    const data = dataResult.rows.map((v, i) => {

      let statusClass =
        v.status === 'Pending' ? 'bg-warning' :
        v.status === 'Accepted' ? 'bg-success' : 'bg-danger';

      let disabled = v.status !== 'Pending' ? 'disabled' : '';

      return {
        no: start + i + 1,
        name: `${v.name}
          <a href="/admin/SingleUser/${v.user_id}" target="_blank">
            <i class="fa fa-external-link"></i>
          </a>`,
        mobile: v.mobile,
        amount: `₹${v.amount}`,
        txn_id: v.txn_id,
        payment_mode: v.payment_mode,
        reason: v.reason || '-',
        date: new Date(v.date).toLocaleDateString(),
        status: `<span class="badge ${statusClass}">${v.status}</span>`,
        action: `
          <button class="btn btn-success btn-sm" onclick="approveWithdraw(${v.id})" ${disabled}>Approve</button>
          <button class="btn btn-danger btn-sm" onclick="openRejectModal(${v.id})" ${disabled}>Reject</button>
        `
      };
    });

    // 🔥 FINAL RESPONSE (IMPORTANT)
    res.json({
      draw: draw,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: data
    });

  } catch (err) {
    console.error("WithdrawRequest data error:", err);
    res.json({
      draw: 1,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: []
    });
  }
};
/* =========================
   ACCEPT
========================= */
exports.accept = async (req, res) => {
  try {
    const { id } = req.body;

    await dbQuery(
      `UPDATE withdraw_request SET status='Accepted' WHERE id=$1`,
      [id]
    );

    res.json({ res: "success", msg: "Withdraw accepted successfully" });

  } catch (err) {
    console.error("Withdraw accept error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};

/* =========================
   REJECT
========================= */
exports.reject = async (req, res) => {
  try {
    const { id, reason } = req.body;

    await dbQuery(
      `UPDATE withdraw_request SET status='Rejected', reason=$1 WHERE id=$2`,
      [reason, id]
    );

    res.json({ res: "success", msg: "Withdraw rejected successfully" });

  } catch (err) {
    console.error("Withdraw reject error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
