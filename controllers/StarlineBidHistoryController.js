// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    res.render("starlineBidHistory/index", {
      title: "Starline Bid History",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("StarlineBidHistory index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA (DATATABLE)
========================= */
exports.data = async (req, res) => {
  try {

    const { result_date, game, game_type } = req.body;

    let conditions = [];
    let values = [];
    let i = 1;

    // Date filter — sirf tab lagao jab user ne date select ki ho
    if (result_date && result_date.trim() !== "") {
      const parts = result_date.trim().split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

      if (!isNaN(d)) {
        const rdate = d.toLocaleDateString('en-GB', {
          day:   '2-digit',
          month: 'short',
          year:  'numeric'
        });
        console.log(`[StarlineBidHistory] Date filter: "${rdate}"`);
        conditions.push(`b.game_date = $${i++}`);
        values.push(rdate);
      }
    }

    if (game) {
      conditions.push(`b.game_id = $${i++}`);
      values.push(game);
    }

    if (game_type && game_type !== "all") {
      conditions.push(`b.game_type = $${i++}`);
      values.push(game_type);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const bids = await dbQuery(`
      SELECT
        b.*,
        u.mobile,
        g.name AS game_name
      FROM starline_user_bid b
      JOIN "users" u ON u.id = b.user_id
      JOIN starline_game g ON g.id = b.game_id
      ${where}
      ORDER BY b.id DESC
    `, values);

    res.json({
      status: true,
      csrfToken: req.csrfToken(),
      data: bids.rows
    });

  } catch (err) {
    console.error("StarlineBidHistory data error:", err);
    res.json({
      status: false,
      csrfToken: req.csrfToken(),
      data: []
    });
  }
};


/* =========================
   GAMES DROPDOWN
========================= */
exports.games = async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT id, name FROM starline_game WHERE status='true' ORDER BY name ASC`
    );
    res.json({ status: true, data: result.rows });
  } catch (err) {
    console.error("StarlineBidHistory games error:", err);
    res.json({ status: false, data: [] });
  }
};
