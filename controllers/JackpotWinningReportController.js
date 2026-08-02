// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {

    const games = await dbQuery(`
      SELECT id, name
      FROM jackpot
      ORDER BY name ASC
    `);

    res.render("jackpotWinningReport/index", {
      title: "Jackpot Winning Report",
      layout: "layouts/admin",
      games: games.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("JackpotWinningReport index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA (DATATABLE)
========================= */
exports.data = async (req, res) => {
  try {

    const { result_date, game } = req.body;

    let where = ` WHERE 1=1 `;
    let params = [];
    let i = 1;

    if (result_date) {
      where += ` AND w.date = $${i++}`;
      params.push(result_date);
    }

    if (game) {
      where += ` AND w.game_id = $${i++}`;
      params.push(game);
    }

    const result = await dbQuery(`
      SELECT
        w.id,
        w.user_id,
        w.txn_id,
        w.bid_on,
        w.bid_amount,
        w.amount,
        w.date,
        u.mobile,
        j.name AS game_name
      FROM jackpot_win_history w
      JOIN users u ON u.id = w.user_id
      JOIN jackpot j ON j.id = w.game_id
      ${where}
      ORDER BY w.id DESC
    `, params);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("JackpotWinningReport data error:", err);
    res.json({
      status: false,
      data: []
    });
  }
};
