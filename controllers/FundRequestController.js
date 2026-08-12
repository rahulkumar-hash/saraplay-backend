// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const { sendSingleNotification } = require("../utils/sendNotification");
/* =========================
   FUND REQUEST PAGE
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT *
      FROM "users"
      ORDER BY id DESC limit 10
    `);

    res.render("fundRequest/index", {
      title: "Fund Request History",
      layout: "layouts/admin",   // ✅ aapka alag layout
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (error) {
    console.error("FundRequest index error:", error);
    res.status(500).send("Server Error");
  }
};



exports.getFundData = async (req, res) => {
  try {

    const draw = parseInt(req.body.draw) || 1;
    const start = parseInt(req.body.start) || 0;
    const length = parseInt(req.body.length) || 10;

    // 🔥 TOTAL COUNT
    const totalResult = await dbQuery(`
      SELECT COUNT(*) FROM fund_request
    `);

    const totalRecords = parseInt(totalResult.rows[0].count);

    // 🔥 DATA QUERY
    const dataResult = await dbQuery(`
      SELECT fr.*, u.name as username
      FROM fund_request fr
      LEFT JOIN "users" u ON u.id = fr.user_id
      ORDER BY fr.id DESC
      LIMIT $1 OFFSET $2
    `, [length, start]);

    const data = dataResult.rows.map((v, i) => {

      let statusClass =
        v.status === 'Approved' ? 'bg-success' :
        v.status === 'Rejected' ? 'bg-danger' : 'bg-warning';

      return {
        no: start + i + 1,
        username: v.username || '-',
        amount: `₹${v.amount}`,
        request_no: v.request_no || '-',
        receipt_image: v.receipt_image
          ? `<img src="/uploads/${v.receipt_image}" width="60">`
          : '-',
        date: new Date(v.created_at).toLocaleDateString(),
        status: `<span class="badge ${statusClass}">${v.status || 'Pending'}</span>`,
        action: `<button class="btn btn-sm btn-primary">View</button>`
      };
    });

    res.json({
      draw: draw,
      recordsTotal: totalRecords,
      recordsFiltered: totalRecords,
      data: data
    });

  } catch (err) {
    console.error("FundRequest data error:", err);

    res.json({
      draw: 1,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: []
    });
  }
};


/* =========================
   APPROVE FUND REQUEST
   POST /admin/fund-request/approve
   Body: { id }
========================= */
exports.approve = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ res: "error", msg: "Invalid request" });
    }

    // Get fund request details
    const reqData = await dbQuery(
      `SELECT * FROM fund_request WHERE id = $1 LIMIT 1`,
      [id]
    );

    if (!reqData.rows.length) {
      return res.json({ res: "error", msg: "Request not found" });
    }

    const request = reqData.rows[0];

    if (request.status === 'Approved') {
      return res.json({ res: "error", msg: "Already approved" });
    }

    const user_id = request.user_id;
    const amount  = Number(request.amount);

    // ✅ Mark as approved
    await dbQuery(
      `UPDATE fund_request SET status = 'Approved' WHERE id = $1`,
      [id]
    );

    // ✅ Credit wallet — get last balance first
    const lastWallet = await dbQuery(
      `SELECT txn_clbal FROM wallet WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user_id]
    );

    const opening = lastWallet.rows.length ? Number(lastWallet.rows[0].txn_clbal) : 0;
    const closing = opening + amount;
    const txn_id  = Math.floor(10000000 + Math.random() * 90000000);

    await dbQuery(
      `INSERT INTO wallet
       (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date, transfer_user_id, transaction_id)
       VALUES ($1, $2, $3, 0, $4, 'Direct Credit By Admin', NOW(), 'Admin', $5)`,
      [user_id, opening, amount, closing, txn_id]
    );

    // 🔔 Deposit notification (Firebase — only if notif_deposit = 1)
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
          "✅ Deposit Approved!",
          `Your deposit request of ₹${amount} has been approved. Amount credited to your wallet.`
        );
        console.log(`📲 Deposit approval notification sent to User ID: ${user_id}`);
      } else if (userNotif.rows.length && Number(userNotif.rows[0].notif_deposit) === 0) {
        console.log(`🔕 Deposit notification OFF for User ID: ${user_id}, skipped`);
      }
    } catch (notifErr) {
      console.error("❌ Deposit Notification Error:", notifErr);
    }

    return res.json({ res: "success", msg: "Fund request approved successfully" });

  } catch (err) {
    console.error("FundRequest approve error:", err);
    return res.json({ res: "error", msg: "Something went wrong" });
  }
};


/* =========================
   REJECT FUND REQUEST
   POST /admin/fund-request/reject
   Body: { id, reason }
========================= */
exports.reject = async (req, res) => {
  try {
    const { id, reason } = req.body;

    if (!id) {
      return res.json({ res: "error", msg: "Invalid request" });
    }

    await dbQuery(
      `UPDATE fund_request SET status = 'Rejected', reason = $1 WHERE id = $2`,
      [reason || '', id]
    );

    return res.json({ res: "success", msg: "Fund request rejected" });

  } catch (err) {
    console.error("FundRequest reject error:", err);
    return res.json({ res: "error", msg: "Something went wrong" });
  }
};
