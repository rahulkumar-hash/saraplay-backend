const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");
exports.starlineGetGames = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    // ── IST current time in HH:MM AM/PM ──────────────────────────────────
    const istNow      = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate     = new Date(istNow);
    const hh          = istDate.getHours();
    const mm          = String(istDate.getMinutes()).padStart(2, "0");
    const ampm        = hh >= 12 ? "pm" : "am";
    const hh12        = hh % 12 === 0 ? 12 : hh % 12;
    const currentTime = `${String(hh12).padStart(2, "0")}:${mm} ${ampm}`; // "11:30 am"

    // ── Today's date in IST → YYYY-MM-DD (matches DB result_date format) ──
    const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // ── Active games sorted by open_time ──────────────────────────────────
    const games = await dbQuery(`
      SELECT *
      FROM starline_game
      WHERE status='true'
      ORDER BY TO_TIMESTAMP(open_time, 'HH12:MI AM') ASC
    `);

    if (games.rows.length === 0) {
      return res.json({ status: false, message: "Data Not Found" });
    }

    // ── Today's declared results (result_date stored as YYYY-MM-DD) ───────
    const results = await dbQuery(
      `SELECT game_id, pana, digit
       FROM starline_declear_result
       WHERE result_date = $1
         AND declare_date IS NOT NULL
         AND declare_date != ''`,
      [todayISO],
    );

    // Fast lookup map: game_id → { pana, digit }
    const resultMap = {};
    results.rows.forEach((r) => {
      resultMap[r.game_id] = r;
    });

    // ── Merge: add pana, digit and market_status per game ─────────────────
    const finalData = games.rows.map((game) => {
      const declared = resultMap[game.id];

      // market_status: closed if admin disabled OR result declared OR time passed
      const isAdminDisabled = game.market_status === "false" || game.market_status === false;
      const isResultDeclared = !!declared;

      // Compare current IST time with game open_time (both "HH:MM am/pm" format)
      const toMins = (t) => {
        if (!t) return 9999;
        const [time, mod] = t.trim().toLowerCase().split(" ");
        let [h, m] = time.split(":").map(Number);
        if (mod === "pm" && h !== 12) h += 12;
        if (mod === "am" && h === 12) h = 0;
        return h * 60 + m;
      };
      const nowMins  = toMins(currentTime);
      const openMins = toMins(game.open_time);
      const timePassed = nowMins >= openMins;

      let market_status;
      if (isAdminDisabled || isResultDeclared || timePassed) {
        market_status = false;
      } else {
        market_status = true;
      }

      return {
        ...game,
        market_status,
        pana:  declared ? declared.pana  : "",
        digit: declared ? declared.digit : "",
      };
    });

    return res.json({
      status:  true,
      message: "Data Found",
      result:  finalData,
    });
  } catch (error) {
    console.error("Starline Get Games Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error",
    });
  }
};

exports.starlinePlacedBid = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;
    const bulkData = req.body?.data;

    if (!bulkData || !Array.isArray(bulkData)) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    await client.query("BEGIN");

    // 🔹 Get game rates
    const rateRes = await client.query(
      "SELECT * FROM starline_game_rate WHERE id=1",
    );

    if (rateRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ status: false, message: "Game rate not found" });
    }

    const rate = rateRes.rows[0];

    const singleDigit = rate.single_digit2 / rate.single_digit1;
    const singlePana = rate.single_pana2 / rate.single_pana1;
    const doublePana = rate.double_pana2 / rate.double_pana1;
    const tripplePana = rate.tripple_pana2 / rate.tripple_pana1;

    // 🔹 Get latest wallet (FOR UPDATE lock)
    const walletRes = await client.query(
      `SELECT * FROM wallet
       WHERE user_id=$1
       ORDER BY id DESC
       LIMIT 1
       FOR UPDATE`,
      [user_id],
    );

    if (walletRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ status: false, message: "Wallet not found" });
    }

    let currentBalance = Number(walletRes.rows[0].txn_clbal);
    const gameDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const settingRes = await client.query(
      "SELECT min_bid, max_bid FROM main_setting WHERE id = 1"
    );
    const minBid = (settingRes.rows.length && settingRes.rows[0].min_bid)
      ? Number(settingRes.rows[0].min_bid)
      : 10;
    const maxBid = (settingRes.rows.length && settingRes.rows[0].max_bid)
      ? Number(settingRes.rows[0].max_bid)
      : 100000;

    for (const val of bulkData) {
      const {
        value,
        tv_pointsvalue: pointsRaw,
        str_tool: game_type,
        str_gameid: game_id,
      } = val;

      const points = Number(pointsRaw);

      if (isNaN(points) || points < minBid) {
        await client.query("ROLLBACK");
        return res.json({
          status: false,
          message: `Minimum bid amount is ₹${minBid}`,
        });
      }

      if (maxBid && points > maxBid) {
        await client.query("ROLLBACK");
        return res.json({
          status: false,
          message: `Maximum bid amount is ₹${maxBid}`,
        });
      }

      const bidTxnId = Math.floor(10000000 + Math.random() * 90000000);
      const txnId = Math.floor(10000000 + Math.random() * 90000000);

      let winAmount = 0;

      if (game_type === "Single Digit" || game_type === "Single") winAmount = points * singleDigit;
      else if (game_type === "Single Pana" || game_type === "SP Pana" || game_type === "SP Motor") winAmount = points * singlePana;
      else if (game_type === "Double Pana" || game_type === "DP Pana" || game_type === "DP Motor") winAmount = points * doublePana;
      else if (game_type === "Tripple Pana" || game_type === "TP Pana" || game_type === "Triple Panna" || game_type === "Triple Pana") winAmount = points * tripplePana;

      if (currentBalance < points) {
        await client.query("ROLLBACK");
        return res.json({
          status: false,
          message: "Insufficient Balance",
        });
      }

      // 🔹 Insert bid
      await client.query(
        `INSERT INTO starline_user_bid
         (user_id, bid_txn_id, game_date, pana,
          game_type, game_id, points,
          win_amount, date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [
          user_id,
          bidTxnId,
          gameDate,
          value,
          game_type,
          game_id,
          points,
          winAmount,
        ],
      );

      // 🔹 Deduct wallet
      const newBalance = currentBalance - points;

      await client.query(
        `INSERT INTO wallet
         (user_id, txn_opbal, txn_crdt,
          txn_dbdt, txn_clbal, txn_comment,
          txn_date, transfer_user_id, transaction_id)
         VALUES ($1,$2,0,$3,$4,$5,NOW(),$6,$7)`,
        [
          user_id,
          currentBalance,
          points,
          newBalance,
          `Bid Place for Starline (${game_type})`,
          user_id,
          txnId,
        ],
      );

      currentBalance = newBalance;
    }

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Bid Placed Success",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Starline Bid Error:", error);

    return res.status(500).json({
      status: false,
      message: "Network Problem",
    });
  } finally {
    client.release();
  }
};

exports.starlineWinHistory = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;
    const { from, to, page = 1, limit = 10 } = req.body || {};

    if (!from || !to) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // 📅 Convert date to PHP format (d M Y)
    const fromDate = new Date(from).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const toDate = new Date(to).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    if (pageNum <= 0) pageNum = 1;
    if (limitNum <= 0 || limitNum > 100) limitNum = 10;

    const offset = (pageNum - 1) * limitNum;

    // ✅ Check user exists
    const userCheck = await dbQuery("SELECT id FROM users WHERE id=$1", [
      user_id,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // 📊 Total count
    const countRes = await dbQuery(
      `SELECT COUNT(*)
       FROM starline_win_history
       WHERE user_id=$1
       AND date BETWEEN $2 AND $3`,
      [user_id, fromDate, toDate],
    );

    const totalRecords = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limitNum);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
        data: [],
      });
    }

    // 🔥 JOIN instead of loop query
    const result = await dbQuery(
      `SELECT w.*, g.name AS game_name
       FROM starline_win_history w
       LEFT JOIN starline_game g ON g.id = w.game_id
       WHERE w.user_id=$1
       AND w.date BETWEEN $2 AND $3
       ORDER BY w.id DESC
       LIMIT $4 OFFSET $5`,
      [user_id, fromDate, toDate, limitNum, offset],
    );

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_records: totalRecords,
        total_pages: totalPages,
      },
      result: result.rows,
    });
  } catch (error) {
    console.error("Starline Win History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error",
    });
  }
};

exports.starlineBidHistory = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;
    const { from, to, page = 1, limit = 10 } = req.body || {};

    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    if (pageNum <= 0) pageNum = 1;
    if (limitNum <= 0 || limitNum > 100) limitNum = 10;

    const offset = (pageNum - 1) * limitNum;

    // ✅ Check user exists
    const userCheck = await dbQuery("SELECT id FROM users WHERE id=$1", [
      user_id,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // 📅 Date filter is optional — only applied when both from & to are passed
    const hasDateFilter = !!(from && to);
    let fromDate, toDate;

    if (hasDateFilter) {
      fromDate = new Date(from);
      toDate = new Date(to);

      if (isNaN(fromDate) || isNaN(toDate)) {
        return res.json({
          status: false,
          message: "Invalid Date Format",
        });
      }
    }

    const dateFilterClause = hasDateFilter
      ? `AND TO_DATE(game_date, 'DD Mon YYYY') BETWEEN $2::date AND $3::date`
      : "";

    const dateFilterClauseJoin = hasDateFilter
      ? `AND TO_DATE(b.game_date, 'DD Mon YYYY') BETWEEN $2::date AND $3::date`
      : "";

    // 📊 Total count
    const countParams = hasDateFilter ? [user_id, fromDate, toDate] : [user_id];

    const countRes = await dbQuery(
      `SELECT COUNT(*)
       FROM starline_user_bid
       WHERE user_id=$1
       ${dateFilterClause}`,
      countParams,
    );

    const totalRecords = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limitNum);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
        data: [],
      });
    }

    // 🔥 JOIN instead of loop query
    const bidParams = hasDateFilter
      ? [user_id, fromDate, toDate, limitNum, offset]
      : [user_id, limitNum, offset];

    const limitOffsetPlaceholders = hasDateFilter
      ? `$4 OFFSET $5`
      : `$2 OFFSET $3`;

    const result = await dbQuery(
      `SELECT b.*, g.name AS game_name, g.open_time
       FROM starline_user_bid b
       LEFT JOIN starline_game g ON g.id = b.game_id
       WHERE b.user_id=$1
       ${dateFilterClauseJoin}
       ORDER BY b.id DESC
       LIMIT ${limitOffsetPlaceholders}`,
      bidParams,
    );

    const formatted = result.rows.map((row) => {
      // game_type ke basis pe number aur digit derive karo
      // Single Digit → pana = digit (0-9)
      // Single/Double/Tripple Pana → pana = pana number (3 digits)
      const gameType = String(row.game_type || "").toLowerCase();
      const isSingleDigit = gameType.includes("single digit");

      return {
        id: row.id,
        user_id: row.user_id,
        game_id: `${row.game_name || ""} (${row.open_time || ""})`,
        game_date: row.game_date,
        game_type: row.game_type,
        pana: isSingleDigit ? "N/A" : (row.pana || "N/A"),
        number: row.pana || "N/A",
        digit: isSingleDigit ? (row.pana || "N/A") : "N/A",
        points: row.points,
        win_amount: row.win_amount,
        bid_txn_id: row.bid_txn_id,
        date: row.date,
        game_name: row.game_name,
      };
    });

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_records: totalRecords,
        total_pages: totalPages,
      },
      result: formatted,
    });
  } catch (error) {
    console.error("Starline Bid History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error",
    });
  }
};

exports.starlineGameRates = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;

    // ✅ Check user exists
    const userCheck = await dbQuery("SELECT id FROM users WHERE id=$1", [
      user_id,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // ✅ Fetch game rates
    const rateRes = await dbQuery(
      "SELECT * FROM starline_game_rate WHERE id=$1",
      [1],
    );

    if (rateRes.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found",
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: rateRes.rows,
    });
  } catch (error) {
    console.error("Starline Game Rates Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error",
    });
  }
};

exports.starlineGameChart = async (req, res) => {
  try {
    const { date } = req.body || {};

    // 📅 Date format (default today)
    let filterDate;

    if (date) {
      const d = new Date(date);
      if (isNaN(d)) {
        return res.json({
          status: false,
          message: "Invalid Date Format",
        });
      }

      filterDate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } else {
      const d = new Date();
      filterDate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    // 🔥 JOIN instead of loop query
    const result = await dbQuery(
      `SELECT r.*, g.name AS game_name
       FROM starline_declear_result r
       LEFT JOIN starline_game g ON g.id = r.game_id
       WHERE r.result_date=$1
       ORDER BY r.id DESC`,
      [filterDate],
    );

    if (result.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found",
        result: [],
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: result.rows,
    });
  } catch (error) {
    console.error("Starline Game Chart Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error",
    });
  }
};

exports.starlineGameStatus = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;
    const { game_id } = req.body || {};

    if (!game_id) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery("SELECT id FROM users WHERE id=$1", [
      user_id,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // ✅ Update game status
    const update = await dbQuery(
      "UPDATE starline_game SET market_status=$1 WHERE id=$2",
      ["false", game_id], // ⚠️ if varchar column
    );

    if (update.rowCount > 0) {
      return res.json({
        status: true,
        message: "Updated Successfully",
      });
    } else {
      return res.json({
        status: false,
        message: "Game Not Found",
      });
    }
  } catch (error) {
    console.error("Starline Game Status Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Problem",
    });
  }
};

exports.declareStarlineResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { game_id, result_number } = req.body;

    await client.query("BEGIN");

    // Insert result
    await client.query(
      "INSERT INTO starline_results (game_id,result_number) VALUES($1,$2)",
      [game_id, result_number],
    );

    // Get today's bids
    const bids = await client.query(
      `SELECT * FROM starline_bids
       WHERE game_id=$1 AND status='pending'`,
      [game_id],
    );

    for (let bid of bids.rows) {
      if (bid.bid_number == result_number) {
        const rate = await client.query(
          "SELECT payout_multiplier FROM starline_rates WHERE bid_type=$1",
          [bid.bid_type],
        );

        const multiplier = parseFloat(rate.rows[0].payout_multiplier);
        const winAmount = bid.amount * multiplier;

        // Lock user wallet
        const user = await client.query(
          "SELECT wallet FROM user WHERE id=$1 FOR UPDATE",
          [bid.user_id],
        );

        const before = parseFloat(user.rows[0].wallet);
        const after = before + winAmount;

        await client.query("UPDATE user SET wallet=$1 WHERE id=$2", [
          after,
          bid.user_id,
        ]);

        await client.query(
          `INSERT INTO wallet_transaction
           (user_id,type,amount,before_balance,after_balance,remark)
           VALUES($1,'credit',$2,$3,$4,$5)`,
          [bid.user_id, winAmount, before, after, "Starline Win"],
        );

        await client.query(
          "UPDATE starline_bids SET status='win', win_amount=$1 WHERE id=$2",
          [winAmount, bid.id],
        );
      } else {
        await client.query(
          "UPDATE starline_bids SET status='lose' WHERE id=$1",
          [bid.id],
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      status: true,
      message: "Result Declared & Settlement Done",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);
    res.json({
      status: false,
      message: "Settlement Failed",
    });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/starline/result-chart
// Chart: rows = dates (last N days), columns = starline games (sorted by open_time)
// Cell value = declared result ("123-6") or null if not declared yet
// ─────────────────────────────────────────────────────────────────────────────
exports.starlineResultChart = async (req, res) => {
  try {
    const days = parseInt(req.query.days || req.body?.days) || 365;
    const fromParam = req.query.from || req.body?.from || null;
    const toParam   = req.query.to   || req.body?.to   || null;

    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    const endDate   = toParam   || todayIST;
    const startDate = fromParam
      ? fromParam
      : (() => {
          const d = new Date(endDate);
          d.setDate(d.getDate() - (days - 1));
          return d.toISOString().slice(0, 10);
        })();

    const gamesRes = await dbQuery(
      `SELECT id, name, open_time
       FROM starline_game
       ORDER BY id ASC`
    );
    let games = gamesRes.rows;

    function timeToMinutes(timeStr) {
      if (!timeStr) return 0;
      const str = String(timeStr).trim().toUpperCase();
      const isPM = str.includes("PM");
      const isAM = str.includes("AM");
      const clean = str.replace(/[APM\s]/g, "");
      const [h, m] = clean.split(":").map(Number);
      let hours = isNaN(h) ? 0 : h;
      const minutes = isNaN(m) ? 0 : m;
      if (isPM && hours < 12) hours += 12;
      if (isAM && hours === 12) hours = 0;
      return hours * 60 + minutes;
    }

    function formatTime12(timeStr) {
      if (!timeStr) return "";
      const str = String(timeStr).trim().toUpperCase();
      if (str.includes("AM") || str.includes("PM")) return str;
      const [h, m] = str.split(":").map(Number);
      if (isNaN(h)) return timeStr;
      const period = h >= 12 ? "PM" : "AM";
      const hours = h % 12 === 0 ? 12 : h % 12;
      const mins = String(isNaN(m) ? 0 : m).padStart(2, "0");
      return `${hours}:${mins} ${period}`;
    }

    games.sort((a, b) => timeToMinutes(a.open_time) - timeToMinutes(b.open_time));

    if (games.length === 0) {
      return res.json({
        status:  false,
        message: "No starline games found",
        games:   [],
        dates:   [],
        chart:   [],
      });
    }

    const resultsRes = await dbQuery(
      `SELECT game_id, result_date, pana, digit, declare_date
       FROM starline_declear_result
       ORDER BY id DESC`
    );

    const moment = require("moment");
    const resultMap = {};
    resultsRes.rows.forEach((row) => {
      let dateKey = "";
      if (row.result_date) {
        const m = moment(row.result_date, ["YYYY-MM-DD", "DD MMM YYYY", "DD-MM-YYYY", moment.ISO_8601]);
        if (m.isValid()) {
          dateKey = m.format("YYYY-MM-DD");
        } else {
          dateKey = String(row.result_date).slice(0, 10);
        }
      }
      const key = `${dateKey}_${row.game_id}`;
      if (row.declare_date && String(row.declare_date).trim() !== "") {
        const p = String(row.pana || "").trim();
        const d = String(row.digit || "").trim();
        if (p || d) {
          resultMap[key] = { pana: p, digit: d, full: `${p || '***'}-${d || '*'}` };
        }
      }
    });

    const dateList = [];
    const cursor   = new Date(endDate);
    const stop     = new Date(startDate);
    while (cursor >= stop) {
      dateList.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() - 1);
    }

    const chart = dateList.map((dateStr) => {
      const [y, m, d] = dateStr.split("-");
      const displayDate = `${d}-${m}-${y}`;

      const results = {};
      games.forEach((game) => {
        const key = `${dateStr}_${game.id}`;
        results[game.id] = resultMap[key] || null;
      });

      return {
        date:         displayDate,
        date_iso:     dateStr,
        results,
      };
    });

    const gameHeaders = games.map((g) => ({
      id:         g.id,
      name:       g.name,
      open_time:  formatTime12(g.open_time),
    }));

    return res.json({
      status:  true,
      message: "Starline Result Chart Loaded",
      from:    startDate,
      to:      endDate,
      games:   gameHeaders,
      chart,
    });

  } catch (error) {
    console.error("Starline Result Chart Error:", error);
    return res.status(500).json({
      status:  false,
      message: "Server Error",
      error:   error.message,
    });
  }
};

