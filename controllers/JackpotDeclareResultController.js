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

    res.render("jackpotDeclareResult/index", {
      title: "Declare Result",
      layout: "layouts/admin",
      games: games.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("DeclareResult index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   DATATABLE AJAX DATA
========================= */
exports.getDeclareGame = async (req, res) => {
  try {

    const { date, game_id } = req.body;

    let where = ` WHERE 1=1 `;
    let params = [];
    let i = 1;

    if (date) {
      where += ` AND r.result_date = $${i++}`;
      params.push(date);
    }

    if (game_id) {
      where += ` AND r.game_id = $${i++}`;
      params.push(game_id);
    }

    const result = await dbQuery(`
      SELECT
        r.id,
        r.result,
        r.result_date,
        r.declare_date,
        j.name AS game_name
      FROM jackpot_declear_result r
      JOIN jackpot j ON j.id = r.game_id
      ${where}
      ORDER BY r.id DESC
    `, params);

    res.json({
      status: true,
      csrfToken: req.csrfToken(),
      data: result.rows
    });

  } catch (err) {
    console.error("getDeclareGame error:", err);
    res.json({
      status: false,
      csrfToken: req.csrfToken(),
      data: []
    });
  }
};


/* =========================
   SHOW WINNER (UNCHANGED)
========================= */
exports.showWinner = async (req, res) => {
  try {
    // aapka existing winner logic yahin rahega
    res.send("Winner logic here");
  } catch (err) {
    res.status(500).send("Error");
  }
};

exports.delete = async (req, res) => {
  try {

    const { id } = req.body;

    if (!id) {
      return res.json({
        status: false,
        msg: 'Invalid request'
      });
    }

    await dbQuery(
      `DELETE FROM jackpot_declear_result WHERE id = $1`,
      [id]
    );

    res.json({
      status: true,
      csrfToken: req.csrfToken(),
      msg: 'Result deleted successfully'
    });

  } catch (err) {
    console.error("Delete declare result error:", err);
    res.json({
      status: false,
      csrfToken: req.csrfToken(),
      msg: 'Something went wrong'
    });
  }
};
