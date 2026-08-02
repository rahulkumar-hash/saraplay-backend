// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
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