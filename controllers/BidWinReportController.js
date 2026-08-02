// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    res.render("bidWin/index", {
      layout: "layouts/admin",
      title: "Win Bid Report",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("BidWin index error:", err);
    res.status(500).send("Server Error");
  }
};

/* =========================
   AJAX WIN REPORT
========================= */
exports.getWinReport = async (req, res) => {
  try {
    const { date, game_id } = req.body;

    if (!date || !game_id) {
      return res.send(`<div class="alert alert-danger">Invalid Data</div>`);
    }

    /* =========================
       TOTAL BID AMOUNT
    ========================= */
    const bidResult = await dbQuery(`
      SELECT 
        COALESCE(SUM(points::numeric),0) AS total_bid
      FROM user_bid
      WHERE game_id::integer = $1
      AND to_date(game_date,'DD Mon YYYY') = $2::date
    `, [game_id, date]);

    /* =========================
       TOTAL WIN AMOUNT
    ========================= */
    const winResult = await dbQuery(`
      SELECT 
        COALESCE(SUM(amount::numeric),0) AS total_win
      FROM win_history
      WHERE game_id::integer = $1
      AND to_date(date,'DD Mon YYYY') = $2::date
    `, [game_id, date]);

    const totalBid = bidResult.rows[0].total_bid;
    const totalWin = winResult.rows[0].total_win;
    const profit = totalBid - totalWin;

    res.render("bidWin/partials/report", {
      totalBid,
      totalWin,
      profit
    });

  } catch (err) {
    console.error("BidWin getWinReport error:", err);
    res.send(`<div class="alert alert-danger">Server Error</div>`);
  }
};
