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

    if (result_date) {
      const d = new Date(result_date);
      const rdate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, " ");

      conditions.push(`b.game_date = $${i++}`);
      values.push(rdate);
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
