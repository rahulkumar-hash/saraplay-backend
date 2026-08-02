// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const users = await dbQuery(`
      SELECT * FROM "users"
      ORDER BY id DESC limit 100
    `);

    res.render("customerSell/index", {
      layout: "layouts/admin",
      title: "Customer Sell Report",
      users: users.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("CustomerSell index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   AJAX FILTER REPORT
========================= */
exports.search = async (req, res) => {
  try {
    const { date, game_id, game_type, session } = req.body;

    let where = [];
    let values = [];
    let i = 1;

    if (date) {
      where.push(`to_date(ub.game_date,'DD Mon YYYY') = $${i++}::date`);
      values.push(date);
    }

    if (game_id) {
      where.push(`ub.game_id::integer = $${i++}`);
      values.push(game_id);
    }

    if (game_type && game_type !== 'all') {
      where.push(`ub.game_type = $${i++}`);
      values.push(game_type);
    }

    if (session) {
      where.push(`ub.session = $${i++}`);
      values.push(session === '1' ? 'Open' : 'Close');
    }

    const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await dbQuery(`
      SELECT 
        u.id,
        u.mobile,
        SUM(ub.points) AS total_points
      FROM user_bid ub
      JOIN "users" u ON u.id = ub.user_id::integer
      ${condition}
      GROUP BY u.id, u.mobile
      ORDER BY total_points DESC
    `, values);

    res.json({ status: true, data: result.rows });

  } catch (err) {
    console.error("CustomerSell search error:", err);
    res.json({ status: false, data: [] });
  }
};
