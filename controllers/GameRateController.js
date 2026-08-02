// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT * FROM game_rate WHERE id = 1`
    );

    res.render("gameRates/index", {
      title: "Update Game Rate",
      layout: "layouts/admin",
      data: result.rows[0],
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("GameRate index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   UPDATE GAME RATE (AJAX)
========================= */
exports.update = async (req, res) => {
  try {
    const {
      id,
      single_digit1, single_digit2,
      jodi_digit1, jodi_digit2,
      single_pana1, single_pana2,
      double_pana1, double_pana2,
      tripple_pana1, tripple_pana2,
      half_sangam1, half_sangam2,
      full_sangam1, full_sangam2
    } = req.body;

    if (!id || !single_digit1 || !single_digit2) {
      return res.json({ res: "error", msg: "Data required" });
    }

    const date = new Date().toLocaleString("en-IN");

    await dbQuery(`
      UPDATE game_rate SET
        single_digit1=$1, single_digit2=$2,
        jodi_digit1=$3, jodi_digit2=$4,
        single_pana1=$5, single_pana2=$6,
        double_pana1=$7, double_pana2=$8,
        tripple_pana1=$9, tripple_pana2=$10,
        half_sangam1=$11, half_sangam2=$12,
        full_sangam1=$13, full_sangam2=$14,
        date=$15
      WHERE id=$16
    `, [
      single_digit1, single_digit2,
      jodi_digit1, jodi_digit2,
      single_pana1, single_pana2,
      double_pana1, double_pana2,
      tripple_pana1, tripple_pana2,
      half_sangam1, half_sangam2,
      full_sangam1, full_sangam2,
      date,
      id
    ]);

    res.json({
      res: "success",
      msg: "Updated Successfully",
      url: "/admin/game-rates"
    });

  } catch (err) {
    console.error("GameRate update error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
