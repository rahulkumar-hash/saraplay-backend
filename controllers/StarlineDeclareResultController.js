// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    res.render("starlineDeclareResult/index", {
      title: "Declare Result",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("StarlineDeclareResult index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   DATATABLE DATA
========================= */
exports.data = async (req, res) => {
  try {
    const { result_date, game_id } = req.body;

    // ✅ Validate — both fields required and game_id must be a valid number
    if (!result_date || !game_id || isNaN(parseInt(game_id))) {
      return res.json({ status: false, data: [], msg: "Date and Game required" });
    }

    const result = await dbQuery(`
      SELECT
        r.id,
        r.pana,
        r.digit,
        r.result_date,
        r.declare_date,
        g.name AS game_name
      FROM starline_declear_result r
      JOIN starline_game g ON g.id = r.game_id::integer
      WHERE r.result_date = $1
        AND r.game_id = $2
      ORDER BY r.id DESC
    `, [result_date, parseInt(game_id)]);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("StarlineDeclareResult data error:", err);
    res.json({ status: false, data: [] });
  }
};


/* =========================
   GET DECLARE FORM
========================= */
exports.getDeclareGame = async (req, res) => {
  try {
    const { date, game_id } = req.body;

    // ✅ Validate
    if (!date || !game_id || isNaN(parseInt(game_id))) {
      return res.send("<div class='alert alert-warning'>Please select date &amp; game first.</div>");
    }

    const game = await dbQuery(
      `SELECT * FROM starline_game WHERE id=$1`,
      [parseInt(game_id)]
    );

    if (!game.rows.length) {
      return res.send("<div class='alert alert-danger'>Game not found.</div>");
    }

    res.render("starlineDeclareResult/declareForm", {
      game: game.rows[0],
      date
    });

  } catch (err) {
    console.error("getDeclareGame error:", err);
    res.send("<div class='alert alert-danger'>Error loading game</div>");
  }
};


/* =========================
   SHOW WINNER
========================= */
exports.showWinner = async (req, res) => {
  try {
    const { game_id, date, pana, digit } = req.body;

    const bids = await dbQuery(`
      SELECT b.*, u.mobile
      FROM starline_user_bid b
      JOIN "users" u ON u.id = b.user_id
      WHERE b.game_id=$1
        AND b.game_date=$2
        AND (
          (b.game_type='Single Digit' AND b.pana=$3)
          OR
          (b.game_type!='Single Digit' AND b.pana=$4)
        )
    `, [game_id, date, digit, pana]);

    res.render("starlineDeclareResult/winnerList", {
      bids: bids.rows
    });

  } catch (err) {
    console.error("showWinner error:", err);
    res.send("<div class='alert alert-danger'>Error loading winner</div>");
  }
};


/* =========================
   DELETE RESULT
========================= */
exports.deleteResult = async (req, res) => {
  try {
    const { id } = req.body;

    await dbQuery(
      `DELETE FROM starline_declear_result WHERE id=$1`,
      [id]
    );

    res.json({ res: "success", msg: "Result deleted" });

  } catch (err) {
    console.error("deleteResult error:", err);
    res.json({ res: "error", msg: "Delete failed" });
  }
};
