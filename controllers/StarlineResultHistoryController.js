// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    res.render("starlineResultHistory/index", {
      title: "Starline Result History",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("StarlineResultHistory index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA
========================= */
exports.data = async (req, res) => {
  try {

    const result = await dbQuery(`
      SELECT
        r.id,
        r.pana,
        r.digit,
        r.result_date,
        r.declare_date,
        g.name AS game_name
      FROM starline_declear_result r
      JOIN starline_game g
        ON g.id = r.game_id::integer
      ORDER BY r.id DESC
    `);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("StarlineResultHistory data error:", err);
    res.json({
      status: false,
      data: []
    });
  }
};
