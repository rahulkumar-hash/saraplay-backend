// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {

    res.render("jackpotResultHistory/index", {
      title: "Jackpot Result History",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("JackpotResultHistory index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA (DATATABLE)
========================= */
exports.data = async (req, res) => {
  try {

    const result = await dbQuery(`
      SELECT
        r.id,
        r.result,
        r.result_date,
        r.declare_date,
        j.name AS game_name
      FROM jackpot_declear_result r
      JOIN jackpot j ON j.id = r.game_id
      ORDER BY r.id DESC
    `);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("JackpotResultHistory data error:", err);
    res.json({
      status: false,
      data: []
    });
  }
};
