// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");





function processBid(v) {
  let pana = v.pana ? v.pana.toString() : "";

  let open_paana = "N/A";
  let open_digit = "N/A";
  let close_paana = "N/A";
  let close_digit = "N/A";
  let jodi_digit = "N/A";

  /* ======================
     OPEN PAANA
  ====================== */
  if (
    (v.game_type === "Half Sangam" && v.session === "Close") ||
    v.game_type === "Full Sangam"
  ) {
    open_paana = pana.substring(0, 3);
  } else if (
    ["Single Pana", "Double Pana", "Tripple Pana"].includes(v.game_type) &&
    v.session === "Open"
  ) {
    open_paana = pana;
  }

  /* ======================
     OPEN DIGIT
  ====================== */
  if (
    ["Single Digit", "Half Sangam"].includes(v.game_type) &&
    v.session === "Open"
  ) {
    open_digit = pana.charAt(0);
  }

  /* ======================
     CLOSE PAANA
  ====================== */
  if (
    (v.game_type === "Half Sangam" && v.session === "Open") ||
    v.game_type === "Full Sangam"
  ) {
    close_paana = pana.slice(-3);
  } else if (
    ["Single Pana", "Double Pana", "Tripple Pana"].includes(v.game_type) &&
    v.session === "Close"
  ) {
    close_paana = pana;
  }

  /* ======================
     CLOSE DIGIT
  ====================== */
  if (
    ["Single Digit", "Half Sangam"].includes(v.game_type) &&
    v.session === "Close"
  ) {
    close_digit = pana.slice(-1);
  }

  /* ======================
     JODI DIGIT
  ====================== */
  if (v.game_type === "Jodi Digit") {
    jodi_digit = pana;
  }

  return {
    ...v,
    open_paana,
    open_digit,
    close_paana,
    close_digit,
    jodi_digit
  };
}
/* =========================
   PAGE LOAD (TODAY DATA)
========================= */
exports.index = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const result = await dbQuery(`
      SELECT 
        w.*,
        u.mobile,
        g.name AS game_name
      FROM win_history w
      JOIN "users" u ON u.id = w.user_id::integer
      JOIN game g ON g.id = w.game_id::integer
      WHERE to_date(w.date,'DD Mon YYYY') = $1::date
      ORDER BY w.id DESC
      LIMIT 200
    `, [today]);


     const data = result.rows.map(processBid);
    res.render("winning/index", {
      layout: "layouts/admin",
      title: "Winning History Report",
      data: data,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("WinningReport index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   AJAX SEARCH
========================= */
exports.search = async (req, res) => {
  try {
    const { date, game_id, session } = req.body;

    let where = [];
    let values = [];
    let i = 1;

    if (date) {
      where.push(`to_date(w.date,'DD Mon YYYY') = $${i++}::date`);
      values.push(date);
    }

    if (game_id) {
      where.push(`w.game_id::integer = $${i++}`);
      values.push(game_id);
    }

    if (session) {
      where.push(`w.session = $${i++}`);
      values.push(session);
    }

    const condition = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await dbQuery(`
      SELECT 
        w.*,
        u.mobile,
        g.name AS game_name
      FROM win_history w
      JOIN "users" u ON u.id = w.user_id::integer
      JOIN game g ON g.id = w.game_id::integer
      ${condition}
      ORDER BY w.id DESC
      LIMIT 500
    `, values);

    const data = result.rows.map(processBid);

    res.json({ status: true, data:data });

  } catch (err) {
    console.error("WinningReport search error:", err);
    res.json({ status: false, data: [] });
  }
};
