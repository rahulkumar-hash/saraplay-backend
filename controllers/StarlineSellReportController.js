// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {

    const games = await dbQuery(`
      SELECT id, name
      FROM starline_game
      ORDER BY name ASC
    `);

    res.render("starlineSellReport/index", {
      title: "Starline Sell Report",
      layout: "layouts/admin",
      games: games.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("StarlineSellReport index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA
========================= */
exports.data = async (req, res) => {
  try {

    const { result_date, win_game_name, game_type } = req.body;

    const report = await dbQuery(`
      SELECT 
        b.game_id,
        g.name AS game_name,
        b.game_type,
        SUM(b.amount) AS total_amount
      FROM starline_bets b
      JOIN starline_game g ON g.id = b.game_id
      WHERE ($1::date IS NULL OR b.result_date = $1)
        AND ($2::int IS NULL OR b.game_id = $2)
        AND ($3::text = 'all' OR $3 IS NULL OR b.game_type = $3)
      GROUP BY b.game_id, g.name, b.game_type
      ORDER BY total_amount DESC
    `, [
      result_date || null,
      win_game_name || null,
      game_type || null
    ]);

    res.json({
      status: true,
      data: report.rows
    });

  } catch (err) {
    console.error("StarlineSellReport data error:", err);
    res.json({
      status: false,
      data: []
    });
  }
};
