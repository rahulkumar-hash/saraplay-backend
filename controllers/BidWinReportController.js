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

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let d = new Date();
    if (date) {
      if (typeof date === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(date)) {
        const [day, month, year] = date.split('-');
        d = new Date(`${year}-${month}-${day}`);
      } else if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        d = new Date(date);
      } else {
        d = new Date(date);
      }
    }

    const dateStr = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const dateYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const dateLike = `${dateYMD}%`;

    /* =========================
       TOTAL BID AMOUNT
    ========================= */
    const bidResult = await dbQuery(`
      SELECT 
        COALESCE(SUM(points::numeric),0) AS total_bid
      FROM user_bid
      WHERE game_id::integer = $1
      AND (game_date = $2 OR game_date = $3 OR date::text LIKE $4)
    `, [game_id, dateStr, dateYMD, dateLike]);

    /* =========================
       TOTAL WIN AMOUNT
    ========================= */
    const winResult = await dbQuery(`
      SELECT 
        COALESCE(SUM(amount::numeric),0) AS total_win
      FROM win_history
      WHERE game_id::integer = $1
      AND (game_date = $2 OR game_date = $3 OR date::text LIKE $4)
    `, [game_id, dateStr, dateYMD, dateLike]);

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
