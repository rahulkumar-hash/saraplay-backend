// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT * FROM starline_game_rate WHERE id = 1`
    );

    res.render("starlineGameRates/index", {
      title: "Update Starline Game Rate",
      layout: "layouts/admin",
      data: result.rows[0],
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("StarlineGameRate index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   UPDATE STARLINE GAME RATE (AJAX) 
========================= */
exports.update = async (req, res) => {
  try {
    const {
      id,
      single_digit1, single_digit2,
      single_pana1, single_pana2,
      double_pana1, double_pana2,
      tripple_pana1, tripple_pana2
    } = req.body;

    if (!id || !single_digit1 || !single_digit2) {
      return res.json({ res: "error", msg: "Data required" });
    }

    const date = new Date().toLocaleString("en-IN");

    await dbQuery(`
      UPDATE starline_game_rate SET
        single_digit1=$1,
        single_digit2=$2,
        single_pana1=$3,
        single_pana2=$4,
        double_pana1=$5,
        double_pana2=$6,
        tripple_pana1=$7,
        tripple_pana2=$8,
        date=$9
      WHERE id=$10
    `, [
      single_digit1,
      single_digit2,
      single_pana1,
      single_pana2,
      double_pana1,
      double_pana2,
      tripple_pana1,
      tripple_pana2,
      date,
      id
    ]);

    res.json({
      res: "success",
      msg: "Updated Successfully",
      url: "/admin/starline-game-rates"
    });

  } catch (err) {
    console.error("StarlineGameRate update error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
