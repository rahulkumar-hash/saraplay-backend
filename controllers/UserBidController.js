const dbQuery = require("../utils/dbQuery");
const moment = require("moment");

/* =========================
   HELPER FUNCTION
========================= */
function processBid(v) {
  let pana = (v.pana !== null && v.pana !== undefined) ? String(v.pana) : "";

  let open_paana = "N/A";
  let open_digit = "N/A";
  let close_paana = "N/A";
  let close_digit = "N/A";
  let jodi_digit = "N/A";

  if (v.game_type === "Half Sangam") {
    if (pana.includes("-")) {
      const parts = pana.split("-");
      if (parts[0].length === 3 && parts[1].length === 1) {
        // Half Sangam A: Open Pana (3) + Close Digit (1)
        open_paana = parts[0];
        close_digit = parts[1];
      } else if (parts[0].length === 1 && parts[1].length === 3) {
        // Half Sangam B: Open Digit (1) + Close Pana (3)
        open_digit = parts[0];
        close_paana = parts[1];
      } else {
        open_paana = parts[0];
        close_digit = parts[1];
      }
    } else if (pana.length === 4) {
      if (v.session === "Open") {
        open_paana = pana.substring(0, 3);
        close_digit = pana.slice(-1);
      } else {
        open_digit = pana.charAt(0);
        close_paana = pana.slice(-3);
      }
    } else {
      open_paana = pana;
    }
  } else if (v.game_type === "Full Sangam") {
    if (pana.includes("-")) {
      const parts = pana.split("-");
      open_paana = parts[0];
      close_paana = parts[1];
    } else if (pana.length === 6) {
      open_paana = pana.substring(0, 3);
      close_paana = pana.slice(-3);
    } else {
      open_paana = pana;
    }
  } else {
    const panaTypes = ["Single Pana", "Double Pana", "Tripple Pana", "DP Pana", "SP Pana", "TP Pana", "SP Motor", "DP Motor", "SP", "DP", "TP"];

    /* ======================
       PAANA (OPEN / CLOSE)
    ====================== */
    if (panaTypes.includes(v.game_type)) {
      if (v.session === "Open") {
        open_paana = pana;
      } else {
        close_paana = pana;
      }
    }

    const digitTypes = ["Single Digit", "Odd Even", "Single"];

    /* ======================
       OPEN DIGIT
    ====================== */
    if (
      digitTypes.includes(v.game_type) &&
      v.session === "Open"
    ) {
      open_digit = pana.charAt(0);
    }

    /* ======================
       CLOSE DIGIT
    ====================== */
    if (
      digitTypes.includes(v.game_type) &&
      v.session === "Close"
    ) {
      close_digit = pana.slice(-1);
    }

    /* ======================
       JODI DIGIT
    ====================== */
    const jodiTypes = ["Jodi Digit", "Jodi", "Red Brackets", "Red Jodi", "Group Jodi", "Two Digits Panel"];
    if (jodiTypes.includes(v.game_type)) {
      jodi_digit = pana;
    }
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
    const today = moment().format("YYYY-MM-DD");

    const bids = await dbQuery(
      `
      SELECT 
        ub.*,
        u.mobile,
        g.name AS game_name
      FROM user_bid ub
      JOIN users u ON u.id = ub.user_id
      JOIN game g ON g.id = ub.game_id
      WHERE (ub.game_date = $1 OR ub.game_date = to_char($1::date, 'DD Mon YYYY'))
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
      today: today,
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
      WHERE (ub.game_date = $1 OR ub.game_date = to_char($1::date, 'DD Mon YYYY'))
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
      conditions.push(`(ub.game_date = $${i} OR ub.game_date = to_char($${i}::date, 'DD Mon YYYY'))`);
      values.push(date);
      i++;
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
    const data = bids.rows.map(processBid);

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
