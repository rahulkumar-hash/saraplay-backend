// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD (TODAY)
========================= */


/* =========================
   HELPER FUNCTION
========================= */
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
  if ( (v.game_type === "Half Sangam"  && v.session === "Close") ||   v.game_type === "Full Sangam" || (v.game_type === "SP Pana"  && v.session === "Close") || (v.game_type === "DP Pana"  && v.session === "Close") || (v.game_type === "TP Pana"  && v.session === "Close")   ) 
  {
    close_paana = pana.substring(0, 3);
  } else if (
    ["Single Pana", "Double Pana", "Tripple Pana","DP Pana","SP Pana","TP Pana"].includes(v.game_type) &&
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
   PAGE LOAD (TODAY)
========================= */
exports.index = async (req, res) => {
  try {
   const today = new Date().toISOString().slice(0, 10);

const bids = await dbQuery(
  `
  SELECT 
    ub.*,
    u.mobile,
    g.name AS game_name
  FROM user_bid ub
  JOIN users u ON u.id = ub.user_id
  JOIN game g ON g.id = ub.game_id
  WHERE ub.game_date = $1
  ORDER BY ub.id DESC
  `,
  [today]
);

    // 🔥 PROCESS DATA (IMPORTANT)
    const data = bids.rows.map(processBid);

    // 🔥 RENDER WITH PROCESSED DATA
    res.render("userBid/index", {
      layout: "layouts/admin",
      title: "User Bid History",
      data: data,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("UserBid index error:", err);
    res.status(500).send("Server Error");
  }
};


exports.indexOld = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const bids = await dbQuery(`
      SELECT 
        ub.*,
        u.mobile,
        g.name AS game_name
      FROM user_bid ub
      JOIN "users" u ON u.id = ub.user_id::integer
      JOIN game g ON g.id = ub.game_id::integer
      WHERE to_date(ub.game_date, 'DD Mon YYYY') = $1::date
      ORDER BY ub.id DESC
    `, [today]);

    res.render("userBid/index", {
      layout: "layouts/admin",
      title: "User Bid History",
      data: bids.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("UserBid index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   AJAX FILTER
========================= */



exports.search = async (req, res) => {
  try {
    const { date, game_id, game_type } = req.body;

    let conditions = [];
    let values = [];
    let i = 1;

    if (date) {
      conditions.push(`to_date(ub.game_date,'DD Mon YYYY') = $${i++}::date`);
      values.push(date);
    }

    if (game_id) {
      conditions.push(`ub.game_id::integer = $${i++}`);
      values.push(game_id);
    }

    if (game_type && game_type !== 'all') {
      conditions.push(`ub.game_type = $${i++}`);
      values.push(game_type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const bids = await dbQuery(`
      SELECT 
        ub.*,
        u.mobile,
        g.name AS game_name
      FROM user_bid ub
      JOIN "users" u ON u.id = ub.user_id::integer
      JOIN game g ON g.id = ub.game_id::integer
      ${where}
      ORDER BY ub.id DESC
    `, values);

    // 🔥 IMPORTANT: yaha processing add karo
    const data = bids.rows.map(v => {
      let pana = v.pana ? v.pana.toString() : "";

      let open_paana = "N/A";
      let open_digit = "N/A";
      let close_paana = "N/A";
      let close_digit = "N/A";
      let jodi_digit = "N/A";

      // OPEN PAANA
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

      // OPEN DIGIT
      if (
        ["Single Digit", "Half Sangam"].includes(v.game_type) &&
        v.session === "Open"
      ) {
        open_digit = pana.charAt(0);
      }

      // CLOSE PAANA
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

      // CLOSE DIGIT
      if (
        ["Single Digit", "Half Sangam"].includes(v.game_type) &&
        v.session === "Close"
      ) {
        close_digit = pana.slice(-1);
      }

      // JODI
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
    });

    res.json({ status: true, data });

  } catch (err) {
    console.error("UserBid search error:", err);
    res.json({ status: false, data: [] });
  }
};



exports.searchOld = async (req, res) => {
  try {
    const { date, game_id, game_type } = req.body;

    let conditions = [];
    let values = [];
    let i = 1;

    if (date) {
      conditions.push(`to_date(ub.game_date,'DD Mon YYYY') = $${i++}::date`);
      values.push(date);
    }

    if (game_id) {
      conditions.push(`ub.game_id::integer = $${i++}`);
      values.push(game_id);
    }

    if (game_type && game_type !== 'all') {
      conditions.push(`ub.game_type = $${i++}`);
      values.push(game_type);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const bids = await dbQuery(`
      SELECT 
        ub.*,
        u.mobile,
        g.name AS game_name
      FROM user_bid ub
      JOIN "users" u ON u.id = ub.user_id::integer
      JOIN game g ON g.id = ub.game_id::integer
      ${where}
      ORDER BY ub.id DESC
    `, values);

    res.json({ status: true, data: bids.rows });

  } catch (err) {
    console.error("UserBid search error:", err);
    res.json({ status: false, data: [] });
  }
};
