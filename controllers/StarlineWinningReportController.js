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

    res.render("starlineWinningReport/index", {
      title: "Starline Winning Report",
      layout: "layouts/admin",
      games: games.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("StarlineWinningReport index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   DATATABLE SERVER SIDE DATA
========================= */
exports.data = async (req, res) => {
  try {

    const draw   = parseInt(req.body.draw);
    const start  = parseInt(req.body.start);
    const length = parseInt(req.body.length);

    const { result_date, game } = req.body;

    let where = ` WHERE 1=1 `;
    let params = [];
    let i = 1;

    // date filter
    if (result_date) {
      const formattedDate = new Date(result_date)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric"
        });
      where += ` AND w.date = $${i++}`;
      params.push(formattedDate);
    }

    // game filter
    if (game) {
      where += ` AND w.game_id = $${i++}`;
      params.push(game);
    }

    // total records
    const [[total]] = await dbQuery(
      `SELECT COUNT(*) FROM starline_win_history`
    );

    // filtered records
    const [[filtered]] = await dbQuery(
      `
      SELECT COUNT(*)
      FROM starline_win_history w
      JOIN users u ON u.id = w.user_id
      JOIN starline_game g ON g.id = w.game_id
      ${where}
      `,
      params
    );

    // paginated data
    const data = await dbQuery(
      `
      SELECT
        w.*,
        u.mobile,
        g.name AS game_name
      FROM starline_win_history w
      JOIN users u ON u.id = w.user_id
      JOIN starline_game g ON g.id = w.game_id
      ${where}
      ORDER BY w.id DESC
      LIMIT $${i++} OFFSET $${i++}
      `,
      [...params, length, start]
    );

    res.json({
      draw,
      recordsTotal: parseInt(total.count),
      recordsFiltered: parseInt(filtered.count),
      data: data.rows
    });

  } catch (err) {
    console.error("StarlineWinningReport data error:", err);
    res.json({
      draw: req.body.draw,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: []
    });
  }
};
