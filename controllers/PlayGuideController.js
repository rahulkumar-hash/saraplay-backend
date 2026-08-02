// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT *
      FROM how_to_play
      WHERE id = 1
      LIMIT 1
    `);

    res.render("playGuide/index", {
      title: "How To Play",
      layout: "layouts/admin",
      data: result.rows[0],
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("PlayGuide index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   UPDATE (AJAX)
========================= */
exports.update = async (req, res) => {
  try {
    const { des, video_link } = req.body;

    if (!des || !video_link) {
      return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(`
      UPDATE how_to_play
      SET des = $1,
          video_link = $2
      WHERE id = 1
    `, [des, video_link]);

    res.json({
      res: "success",
      msg: "Updated Successfully"
    });

  } catch (err) {
    console.error("PlayGuide update error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
