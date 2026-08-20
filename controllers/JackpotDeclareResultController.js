const dbQuery = require("../utils/dbQuery");
const moment  = require("moment");
const {
  sendAll,
  sendSingleNotification,
  sendResultBroadcastNotification
} = require("../utils/sendNotification");

/* =========================
   PAGE LOAD
   GET /admin/jackpot-declare-result
========================= */
exports.index = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dateMoment = moment(today);
    const dateISO = dateMoment.format("YYYY-MM-DD");
    const dateFmt = dateMoment.format("DD MMM YYYY");

    // Filter jackpot games not declared today
    const games = await dbQuery(`
      SELECT DISTINCT ON (g.id) g.id, g.name, g.close_time
      FROM jackpot g
      LEFT JOIN jackpot_declear_result r
        ON g.id = r.game_id::integer
       AND (
         r.result_date = $1
         OR r.result_date = $2
         OR (
           r.result_date ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4}$'
           AND to_date(r.result_date, 'DD Mon YYYY') = $1::date
         )
       )
      WHERE g.status = 'true'
        AND (
          r.id IS NULL
          OR r.declare_date IS NULL
          OR r.declare_date = ''
        )
      ORDER BY g.id ASC
    `, [dateISO, dateFmt]);

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr || typeof timeStr !== "string") return 0;
      const cleaned = timeStr.trim().toUpperCase();
      const m = moment(cleaned, ["hh:mm A", "h:mm A", "hh:mmA", "h:mmA", "HH:mm", "H:mm"]);
      if (m.isValid()) {
        return m.hours() * 60 + m.minutes();
      }
      const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : "";
        if (meridiem === "PM" && hours < 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      return 0;
    };

    const sortedGames = (games.rows || []).sort((a, b) => {
      return parseTimeToMinutes(a.close_time) - parseTimeToMinutes(b.close_time);
    });

    res.render("jackpotDeclareResult/index", {
      title: "Jackpot Declare Result",
      layout: "layouts/admin",
      games: sortedGames,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("JackpotDeclareResult index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   GET GAMES FOR DECLARE (Filter out declared games)
========================= */
exports.getGamesForDeclare = async (req, res) => {
  try {
    const rawDate = req.query.date || req.body.date || new Date();
    const dateMoment = moment(rawDate, ["YYYY-MM-DD", "DD MMM YYYY", "YYYY/MM/DD", moment.ISO_8601]);
    const dateISO = dateMoment.isValid() ? dateMoment.format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
    const dateFmt = dateMoment.isValid() ? dateMoment.format("DD MMM YYYY") : moment().format("DD MMM YYYY");

    const result = await dbQuery(`
      SELECT DISTINCT ON (g.id) g.id, g.name, g.close_time, g.status
      FROM jackpot g
      LEFT JOIN jackpot_declear_result r
        ON g.id = r.game_id::integer
       AND (
         r.result_date = $1
         OR r.result_date = $2
         OR (
           r.result_date ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4}$'
           AND to_date(r.result_date, 'DD Mon YYYY') = $1::date
         )
       )
      WHERE g.status = 'true'
        AND (
          r.id IS NULL
          OR r.declare_date IS NULL
          OR r.declare_date = ''
        )
      ORDER BY g.id ASC
    `, [dateISO, dateFmt]);

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr || typeof timeStr !== "string") return 0;
      const cleaned = timeStr.trim().toUpperCase();
      const m = moment(cleaned, ["hh:mm A", "h:mm A", "hh:mmA", "h:mmA", "HH:mm", "H:mm"]);
      if (m.isValid()) {
        return m.hours() * 60 + m.minutes();
      }
      const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : "";
        if (meridiem === "PM" && hours < 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      return 0;
    };

    const sortedGames = (result.rows || []).sort((a, b) => {
      return parseTimeToMinutes(a.close_time) - parseTimeToMinutes(b.close_time);
    });

    res.json({ status: true, data: sortedGames });
  } catch (err) {
    console.error("Jackpot getGamesForDeclare error:", err);
    res.json({ status: false, data: [] });
  }
};


/* =========================
   GET DECLARE FORM (AJAX)
   POST /admin/get-jackpot-declare-game
   Body: { date, game_id }
========================= */
exports.getDeclareGame = async (req, res) => {
  try {
    const { date, game_id } = req.body;

    if (!date || !game_id) {
      return res.json({ html: null, status: false, msg: "Date and Game required" });
    }

    // Get game name
    const gameRes = await dbQuery(
      `SELECT id, name FROM jackpot WHERE id = $1`,
      [game_id]
    );

    if (!gameRes.rows.length) {
      return res.json({ html: null, status: false, msg: "Game not found" });
    }

    const game = gameRes.rows[0];

    // Check if result already declared for this date+game
    const existing = await dbQuery(
      `SELECT * FROM jackpot_declear_result WHERE game_id = $1 AND result_date = $2 LIMIT 1`,
      [game_id, date]
    );

    const row = existing.rows[0] || null;

    const currentDigit = row ? (row.result || '') : '';
    const isDeclared   = row ? !!row.declare_date : false;

    // Build buttons
    let saveBtn    = '';
    let declareBtn = '';

    if (!isDeclared) {
      saveBtn    = `<button type="button" class="btn btn-primary me-2" id="jackpotSaveBtn" onclick="saveJackpotResult()"><i class="fa fa-save"></i> Save</button>`;
      declareBtn = `<button type="button" class="btn btn-success" id="jackpotDeclareBtn" onclick="declareJackpotResult()"><i class="fa fa-check"></i> Declare Result</button>`;
    } else {
      saveBtn    = `<span class="badge bg-success fs-6 me-2">✅ Already Declared</span>`;
    }

    const html = `
      <div class="card mb-3">
        <div class="card-header"><h5>Declare Result — ${game.name}</h5></div>
        <div class="card-body">
          <div class="row align-items-end">
            <div class="form-group col-md-4">
              <label><b>Result Digit (00–99)</b></label>
              <input
                type="text"
                id="jackpotDigit"
                class="form-control form-control-lg"
                maxlength="2"
                placeholder="Enter result (00-99)"
                value="${currentDigit}"
                ${isDeclared ? 'readonly' : ''}
              >
            </div>
            <div class="col-md-6 mt-3">
              ${saveBtn}
              ${declareBtn}
            </div>
          </div>
        </div>
      </div>
    `;

    return res.json({ html, status: true });

  } catch (err) {
    console.error("getDeclareGame error:", err);
    return res.json({ html: null, status: false, msg: "Server error" });
  }
};


/* =========================
   GET TABLE DATA (AJAX)
   POST /admin/get-jackpot-declare-results
   Body: { date, game_id }
========================= */
exports.getDeclareResults = async (req, res) => {
  try {
    const { date, game_id } = req.body;

    let where = " WHERE 1=1 ";
    let params = [];
    let i = 1;

    if (date && date !== '') {
      const d1 = moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("YYYY-MM-DD");
      const d2 = moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("DD MMM YYYY");
      where += ` AND (r.result_date = $${i} OR r.result_date = $${i+1})`;
      params.push(d1, d2);
      i += 2;
    }

    if (game_id && !isNaN(parseInt(game_id))) {
      where += ` AND r.game_id = $${i++}`;
      params.push(parseInt(game_id));
    }

    const result = await dbQuery(`
      SELECT
        r.id,
        r.result,
        r.result_date,
        r.declare_date,
        COALESCE(j.name, 'Game #' || r.game_id::text) AS game_name
      FROM jackpot_declear_result r
      LEFT JOIN jackpot j ON j.id = r.game_id
      ${where}
      ORDER BY r.id DESC
      LIMIT 500
    `, params);

    return res.json({
      status: true,
      csrfToken: req.csrfToken(),
      data: result.rows
    });

  } catch (err) {
    console.error("getDeclareResults error:", err);
    return res.json({ status: false, data: [] });
  }
};


/* =========================
   SAVE RESULT (AJAX)
   POST /admin/jackpot-save-result
   Body: { date, game_id, result }
========================= */
exports.saveResult = async (req, res) => {
  try {
    const { date, game_id, result } = req.body;

    if (!date || !game_id || result === undefined || result === '') {
      return res.json({ res: "error", msg: "All fields required" });
    }

    // Disallow future dates
    if (moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).isAfter(moment(), "day")) {
      return res.json({ res: "error", msg: "Future dates are not allowed for result declaration" });
    }

    const digit = String(result).trim();

    // Validate digit 00-99
    if (!/^[0-9]{1,2}$/.test(digit)) {
      return res.json({ res: "error", msg: "Result must be a number between 00 and 99" });
    }

    // Check existing
    const existing = await dbQuery(
      `SELECT id FROM jackpot_declear_result WHERE game_id = $1 AND (result_date = $2 OR result_date = $3)`,
      [game_id, moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("YYYY-MM-DD"), moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("DD MMM YYYY")]
    );

    if (existing.rows.length) {
      // Update
      await dbQuery(
        `UPDATE jackpot_declear_result SET result = $1 WHERE id = $2`,
        [digit, existing.rows[0].id]
      );
    } else {
      // Insert
      await dbQuery(
        `INSERT INTO jackpot_declear_result (game_id, result_date, result, declare_date, created_at) VALUES ($1, $2, $3, $4, NOW())`,
        [game_id, date, digit, '']
      );
    }

    return res.json({ res: "success", msg: "Result saved successfully" });

  } catch (err) {
    console.error("saveResult error:", err);
    return res.json({ res: "error", msg: "Server error" });
  }
};


/* =========================
   DECLARE RESULT (AJAX) — credit winners
   POST /admin/jackpot-declare-result
   Body: { date, game_id, result }
========================= */
exports.declareResult = async (req, res) => {
  try {
    const { date, game_id, result } = req.body;

    console.log(`\n🎰 [JACKPOT DECLARE] Date: ${date} | Game: ${game_id} | Digit: ${result}`);

    if (!date || !game_id || result === undefined || result === '') {
      return res.json({ res: "error", msg: "All fields required" });
    }

    // Disallow future dates
    if (moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).isAfter(moment(), "day")) {
      return res.json({ res: "error", msg: "Future dates are not allowed for result declaration" });
    }

    const digit = String(result).trim();

    if (!/^[0-9]{1,2}$/.test(digit)) {
      return res.json({ res: "error", msg: "Result must be a number between 00 and 99" });
    }

    // Check if already declared
    const existing = await dbQuery(
      `SELECT * FROM jackpot_declear_result WHERE game_id = $1 AND result_date = $2 LIMIT 1`,
      [game_id, date]
    );

    if (existing.rows.length && existing.rows[0].declare_date) {
      return res.json({ res: "error", msg: "Result already declared for this game and date" });
    }

    const now = moment().format("DD MMM YYYY hh:mm:ss A");

    // Save + mark declared
    if (existing.rows.length) {
      await dbQuery(
        `UPDATE jackpot_declear_result
         SET result = $1, declare_date = $2
         WHERE game_id = $3 AND result_date = $4`,
        [digit, now, game_id, date]
      );
    } else {
      await dbQuery(
        `INSERT INTO jackpot_declear_result (game_id, result_date, result, declare_date, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [game_id, date, digit, now]
      );
    }

    // =====================
    // CREDIT WINNERS
    // =====================
    const bids = await dbQuery(
      `SELECT * FROM jackpot_bid
       WHERE game_id = $1 AND game_date = $2`,
      [game_id, date]
    );

    console.log(`📋 Total Jackpot Bids Found: ${bids.rows.length}`);

    let winnerCount = 0;

    for (const bid of bids.rows) {
      const bidDigit = String(bid.bid_on || '').trim();

      if (bidDigit === digit) {
        winnerCount++;
        console.log(`🎉 Winner! User ID: ${bid.user_id} | Bid On: ${bidDigit} | Amount: ${bid.win_amount}`);
        await creditJackpotWallet(bid, game_id, date, digit);
      }
    }

    console.log(`✅ Jackpot Declare Done. Winners: ${winnerCount}`);

    // FCM Notification
    try {
      const gameRes = await dbQuery(`SELECT name FROM jackpot WHERE id = $1`, [game_id]);
      const gameName = gameRes.rows[0]?.name || 'Jackpot';
      await sendResultBroadcastNotification(`Jackpot Result: ${digit}`, `${gameName} Result Declared!`);
    } catch (fcmErr) {
      console.error("FCM Error:", fcmErr);
    }

    return res.json({ res: "success", msg: `Result Declared! ${winnerCount} winner(s) credited.` });

  } catch (err) {
    console.error("declareResult error:", err);
    return res.json({ res: "error", msg: "Server error" });
  }
};


/* =========================
   SHOW WINNER (AJAX)
   POST /admin/show-jackpot-winner
========================= */
exports.showWinner = async (req, res) => {
  try {
    const { game_id, date } = req.body;

    const result = await dbQuery(
      `SELECT * FROM jackpot_declear_result WHERE game_id = $1 AND result_date = $2 LIMIT 1`,
      [game_id, date]
    );

    if (!result.rows.length) {
      return res.send('<div class="alert alert-warning">No result declared yet.</div>');
    }

    const digit = result.rows[0].result;

    const bids = await dbQuery(`
      SELECT b.*, u.mobile
      FROM jackpot_bid b
      JOIN "users" u ON u.id = b.user_id
      WHERE b.game_id = $1 AND b.game_date = $2 AND b.bid_on = $3
    `, [game_id, date, digit]);

    let html = `
      <table class="table table-bordered">
        <thead>
          <tr><th>#</th><th>Mobile</th><th>Bid On</th><th>Bid Amount</th><th>Win Amount</th></tr>
        </thead>
        <tbody>
    `;

    if (bids.rows.length) {
      bids.rows.forEach((w, i) => {
        html += `
          <tr>
            <td>${i + 1}</td>
            <td>${w.mobile}</td>
            <td>${w.bid_on}</td>
            <td>₹${w.bid_amount}</td>
            <td>₹${w.win_amount}</td>
          </tr>`;
      });
    } else {
      html += `<tr><td colspan="5" class="text-center text-danger">No winners found</td></tr>`;
    }

    html += `</tbody></table>`;
    return res.send(html);

  } catch (err) {
    console.error("showWinner error:", err);
    return res.send('<div class="alert alert-danger">Error loading winners.</div>');
  }
};


/* =========================
   DELETE RESULT
   POST /admin/delete-jackpot-declare-result
========================= */
exports.delete = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ status: false, msg: "Invalid request" });
    }

    await dbQuery(
      `DELETE FROM jackpot_declear_result WHERE id = $1`,
      [id]
    );

    return res.json({
      status: true,
      csrfToken: req.csrfToken(),
      msg: "Result deleted successfully"
    });

  } catch (err) {
    console.error("Delete jackpot result error:", err);
    return res.json({ status: false, msg: "Something went wrong" });
  }
};


/* =========================
   HELPER — Credit Jackpot Winner Wallet
========================= */
async function creditJackpotWallet(bid, game_id, date, digit) {
  try {
    const user_id  = bid.user_id;
    const amount   = Math.round(Number(bid.win_amount) || 0);
    const txn_id   = Math.floor(10000000 + Math.random() * 90000000);
    const now      = moment().format("DD MMM YYYY hh:mm:ss A");

    if (amount <= 0) {
      console.log(`⚠️ Skip credit — win_amount is 0 for user ${user_id}`);
      return;
    }

    // Get last wallet balance
    const last = await dbQuery(
      `SELECT txn_clbal FROM wallet WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
      [user_id]
    );

    const opening = last.rows.length ? Number(last.rows[0].txn_clbal) : 0;
    const closing = opening + amount;

    // Insert wallet transaction
    await dbQuery(`
      INSERT INTO wallet
        (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date, transfer_user_id, transaction_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [user_id, opening, amount, 0, closing, "Jackpot Winning Amount", now, "Admin", txn_id]);

    // Update users wallet column
    try {
      await dbQuery(
        `UPDATE "users" SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2`,
        [amount, user_id]
      );
    } catch (e) { /* ignore if column missing */ }

    // Insert win history
    await dbQuery(`
      INSERT INTO jackpot_win_history
        (user_id, game_id, game_date, txn_id, bid_on, bid_amount, win_amount, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [user_id, game_id, date, txn_id, digit, bid.bid_amount, amount, moment().format("DD MMM YYYY")]);

    // Send FCM to winner only if notif_win = 1
    try {
      const userRes = await dbQuery(
        `SELECT fcm_token, notif_win FROM "users" WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      if (
        userRes.rows[0]?.fcm_token &&
        Number(userRes.rows[0].notif_win) === 1
      ) {
        await sendSingleNotification(
          userRes.rows[0].fcm_token,
          "🎉 Jackpot Jeet Gaye!",
          `Aapko ₹${amount} mila! Jackpot Result: ${digit}`
        );
      } else if (userRes.rows.length && Number(userRes.rows[0].notif_win) === 0) {
        console.log(`🔕 Win notification OFF for User ID: ${user_id}, skipped`);
      }
    } catch (fcmErr) {
      console.error("FCM to winner error:", fcmErr);
    }

  } catch (err) {
    console.error("creditJackpotWallet error:", err);
  }
}
