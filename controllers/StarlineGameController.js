// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* PAGE */
exports.index = async (req, res) => {
  res.render("starlineGames/index", {
    title: "Manage Starline Games",
    layout: "layouts/admin",
    csrfToken: req.csrfToken(),
    admin: req.session.admin
  });
};

/* LIST */
exports.getGames = async (req, res) => {
  const result = await dbQuery(
    "SELECT * FROM game ORDER BY id DESC"
  );
  res.json({ status: true, csrfToken: req.csrfToken(), data: result.rows });
};

/* ADD */




exports.addGame = async (req, res) => {
  try {
    const { name, hname, open_time } = req.body;

    if (!name || !hname || !open_time) {
      return res.json({ res: "error", csrfToken: req.csrfToken(),msg: "All fields required" });
    }

    const formattedTime = new Date(`1970-01-01 ${open_time}`)
      .toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });

    await dbQuery(
      `
      INSERT INTO starline_game
      (name, hname, open_time, status, market_status, date)
      VALUES ($1,$2,$3,'true','true',CURRENT_DATE)
      `,
      [name, hname, formattedTime]
    );

    res.json({ res: "success", csrfToken: req.csrfToken(), msg: "Game added successfully" });

  } catch (err) {
    console.error(err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};







/* UPDATE */
exports.updateGame = async (req, res) => {
  const { id, name, hname, open_time } = req.body;

  const time = new Date(`1970-01-01 ${open_time}`)
    .toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });

  await dbQuery(
    `UPDATE starline_game
     SET name=$1, hname=$2, open_time=$3
     WHERE id=$4`,
    [name, hname, time, id]
  );

  res.json({ res: "success", csrfToken: req.csrfToken(), msg: "Updated successfully" });
};

/* STATUS */
exports.updateStatus = async (req, res) => {
  const { id, field, value } = req.body;
  await dbQuery(`UPDATE starline_game SET ${field}=$1 WHERE id=$2`, [value, id]);
  res.json({ res: "success", csrfToken: req.csrfToken(),msg: "Status updated" });
};

/* DELETE */
// exports.deleteGame = async (req, res) => {
//   console.log(req.body.id);
//   await dbQuery(`DELETE FROM starline_game WHERE id=$1`, [req.body.id]);
//   res.json({ res: "success",csrfToken: req.csrfToken(), msg: "Deleted successfully" });
// };
exports.deleteGame = async (req, res) => {
  try {
    console.log("DELETE ID =>", req.body.id);

    if (!req.body.id) {
      return res.json({ res: "error",csrfToken: req.csrfToken(), msg: "ID missing" });
    }

    await dbQuery(
      `DELETE FROM starline_game WHERE id=$1`,
      [req.body.id]
    );

    res.json({ res: "success",csrfToken: req.csrfToken(), msg: "Deleted successfully" });

  } catch (err) {
    console.error("Delete error:", err);
    res.json({ res: "error", csrfToken: req.csrfToken(),msg: "Delete failed" });
  }
};
