// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   JACKPOT BID HISTORY
========================= */

exports.index = async (req, res) => {
  try {

    const games = await dbQuery(`
      SELECT id, name 
      FROM jackpot 
      ORDER BY name ASC
    `);

    res.render("jackpotBidHistory/index", {
      title: "Jackpot Bid History",
      layout: "layouts/admin",
      games: games.rows,
      filters: {},
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("JackpotBidHistory index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   AJAX DATA (DATATABLE)
========================= */

exports.data = async (req, res) => {
  try {
    
    const { result_date, game } = req.body || {};

    let where = ` WHERE 1=1 `;
    let params = [];
    let i = 1;

    if (result_date) {
      where += ` AND b.game_date = $${i++}`;
      params.push(result_date);
    }

    if (game) {
      where += ` AND b.game_id = $${i++}`;
      params.push(game);
    }

    const query = `
      SELECT 
        b.id,
        b.user_id,
        b.bid_on,
        b.bid_amount,
        b.win_amount,
        b.created_at,
        u.mobile,
        j.name AS game_name
      FROM jackpot_bid b
      JOIN users u ON u.id = b.user_id
      JOIN jackpot j ON j.id = b.game_id
      ${where}
      ORDER BY b.id DESC
    `;

    const result = await dbQuery(query, params);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("JackpotBidHistory data error:", err);
    res.json({
      status: false,
      data: [],
      msg: "Something went wrong"
    });
  }
};
