// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  res.render("games/index", {
    title: "Manage Games",
    layout: "layouts/admin",
    csrfToken: req.csrfToken(),
    admin: req.session.admin
  });
};

/* =========================
   LIST GAMES (AJAX)
========================= */
exports.getGames = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT *
      FROM game
      ORDER BY open_time ASC
    `);

    res.json({
      res: "success",
      csrfToken: req.csrfToken(),
      data: result.rows
    });

  } catch (err) {
    console.error("Get games error:", err);
    res.json({
      res: "error",
      csrfToken: req.csrfToken(),
      data: []
    });
  }
};


/* =========================
   ADD GAME
========================= */

exports.addGame = async (req, res) => {
  try {

    // console.log("REQ BODY =>", req.body); // 👈 debug

    const {
      name,
      hname,
      open_time,
      close_time,
      closing_day,
      commission
    } = req.body || {};

    if (!name) {
      return res.json({ res: "error",csrfToken: req.csrfToken(), msg: "Name missing in request" });
    }

     const openTime12 = convertTo12Hour(open_time);
    const closeTime12 = convertTo12Hour(close_time);

    await dbQuery(
      `
      INSERT INTO game
      (name, hname, open_time, close_time, closing_day, commission, status, market_status,date)
      VALUES ($1,$2,$3,$4,$5,$6,'true','true',CURRENT_DATE)
      `,
      [
        name,
        hname,
        openTime12,
        closeTime12,
        Array.isArray(closing_day) ? closing_day.join(',') : closing_day,
        commission
      ]
    );

    res.json({ res: "success",csrfToken: req.csrfToken(), msg: "Game added successfully" });

  } catch (err) {
    console.error("Add game error:", err);
    res.json({ res: "error", csrfToken: req.csrfToken(),msg: "Failed to add game" });
  }
};


function convertTo12Hour(time) {
  if (!time) return null;

  let [hours, minutes] = time.split(':');
  hours = parseInt(hours);

  let ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes} ${ampm}`;
}

/* =========================
   STATUS / MARKET STATUS
========================= */
exports.updateStatus = async (req, res) => {
  try {
    const { id, field, value } = req.body;

    await dbQuery(
      `UPDATE game SET ${field}=$1 WHERE id=$2`,
      [value, id]
    );

    res.json({ res: "success", csrfToken: req.csrfToken(),msg: "Status updated" });

  } catch (err) {
    console.error("Status update error:", err);
    res.json({ res: "error",csrfToken: req.csrfToken(), msg: "Update failed" });
  }
};

/* =========================
   DELETE GAME
========================= */
exports.deleteGame = async (req, res) => {
  try {
    const { id } = req.body;

    await dbQuery(`DELETE FROM game WHERE id=$1`, [id]);

    res.json({ res: "success",csrfToken: req.csrfToken(), msg: "Game deleted successfully" });

  } catch (err) {
    console.error("Delete game error:", err);
    res.json({ res: "error", csrfToken: req.csrfToken(),msg: "Delete failed" });
  }
};


exports.getGame = async (req, res) => {
  const result = await dbQuery(
    "SELECT * FROM game WHERE id=$1",
    [req.body.id]
  );

  res.json({
    res: "success",
    csrfToken: req.csrfToken(),
    data: result.rows[0]
  });
};



exports.updateGame = async (req, res) => {
  const {
    id, name, hname,
    open_time, close_time,
    closing_day, commission
  } = req.body;



 const openTime12 = convertTo12Hour(open_time);
    const closeTime12 = convertTo12Hour(close_time);






  await dbQuery(
    `
    UPDATE game SET
      name=$1,
      hname=$2,
      open_time=$3,
      close_time=$4,
      closing_day=$5,
      commission=$6
    WHERE id=$7
    `,
    [
      name,
      hname,
      openTime12,
      closeTime12,
      Array.isArray(closing_day) ? closing_day.join(',') : closing_day,
      commission,
      id
    ]
  );

  res.json({ res: "success",csrfToken: req.csrfToken(), msg: "Game updated successfully" });
};
