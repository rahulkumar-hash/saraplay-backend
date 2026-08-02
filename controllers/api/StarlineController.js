const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");
exports.starlineGetGames = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    // 📅 Today's date (same format as PHP)
    const now = new Date();
    const cdate = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // ✅ Get active games sorted by open_time (AM/PM safe sort)
    const games = await dbQuery(`
      SELECT *
      FROM starline_game
      WHERE status='true'
      ORDER BY TO_TIMESTAMP(open_time, 'HH12:MI AM') ASC
    `);

    if (games.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found"
      });
    }

    // ✅ Get today's declared results
    const results = await dbQuery(
      `SELECT game_id, pana, digit
       FROM starline_declear_result
       WHERE result_date=$1
       AND declare_date IS NOT NULL
       AND declare_date!=''`,
      [cdate]
    );

    // 🔥 Create map for fast lookup
    const resultMap = {};
    results.rows.forEach(r => {
      resultMap[r.game_id] = r;
    });

    // ✅ Merge data
    const finalData = games.rows.map(game => {
      const result = resultMap[game.id];

      return {
        ...game,
        pana: result ? result.pana : "",
        digit: result ? result.digit : ""
      };
    });

    return res.json({
      status: true,
      message: "Data Found",
      result: finalData
    });

  } catch (error) {
    console.error("Starline Get Games Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error"
    });
  }
};



exports.starlinePlacedBid = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const bulkData = req.body?.data;

    if (!bulkData || !Array.isArray(bulkData)) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    await client.query("BEGIN");

    // 🔹 Get game rates
    const rateRes = await client.query(
      "SELECT * FROM starline_game_rate WHERE id=1"
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
      [user_id]
    );

    if (walletRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ status: false, message: "Wallet not found" });
    }

    let currentBalance = Number(walletRes.rows[0].txn_clbal);
    const gameDate = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    for (const val of bulkData) {

      const {
        value,
        tv_pointsvalue: points,
        str_tool: game_type,
        str_gameid: game_id
      } = val;

      const bidTxnId = Math.floor(10000000 + Math.random() * 90000000);
      const txnId = Math.floor(10000000 + Math.random() * 90000000);

      let winAmount = 0;

      if (game_type === "Single Digit")
        winAmount = points * singleDigit;
      else if (game_type === "Single Pana")
        winAmount = points * singlePana;
      else if (game_type === "Double Pana")
        winAmount = points * doublePana;
      else if (game_type === "Tripple Pana")
        winAmount = points * tripplePana;

      if (currentBalance < points) {
        await client.query("ROLLBACK");
        return res.json({
          status: false,
          message: "Insufficient Balance"
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
          winAmount
        ]
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
          txnId
        ]
      );

      currentBalance = newBalance;
    }

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Bid Placed Success"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Starline Bid Error:", error);

    return res.status(500).json({
      status: false,
      message: "Network Problem"
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
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { from, to, page = 1, limit = 10 } = req.body || {};

    if (!from || !to) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    // 📅 Convert date to PHP format (d M Y)
    const fromDate = new Date(from).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const toDate = new Date(to).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);
    if (pageNum <= 0) pageNum = 1;
    if (limitNum <= 0 || limitNum > 100) limitNum = 10;

    const offset = (pageNum - 1) * limitNum;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // 📊 Total count
    const countRes = await dbQuery(
      `SELECT COUNT(*)
       FROM starline_win_history
       WHERE user_id=$1
       AND date BETWEEN $2 AND $3`,
      [user_id, fromDate, toDate]
    );

    const totalRecords = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limitNum);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
        data: []
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
      [user_id, fromDate, toDate, limitNum, offset]
    );

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_records: totalRecords,
        total_pages: totalPages
      },
      result: result.rows
    });

  } catch (error) {
    console.error("Starline Win History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error"
    });
  }
};






















exports.starlineBidHistory = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { from, to, page = 1, limit = 10 } = req.body || {};

    if (!from || !to) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    // 📅 Convert to JS Date
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.json({
        status: false,
        message: "Invalid Date Format"
      });
    }

    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    if (pageNum <= 0) pageNum = 1;
    if (limitNum <= 0 || limitNum > 100) limitNum = 10;

    const offset = (pageNum - 1) * limitNum;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // 📊 Total count (convert game_date string to date)
    const countRes = await dbQuery(
      `SELECT COUNT(*)
       FROM starline_user_bid
       WHERE user_id=$1
       AND TO_DATE(game_date, 'DD Mon YYYY')
       BETWEEN $2::date AND $3::date`,
      [user_id, fromDate, toDate]
    );

    const totalRecords = parseInt(countRes.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limitNum);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
        data: []
      });
    }

    // 🔥 JOIN instead of loop query
    const result = await dbQuery(
      `SELECT b.*, g.name AS game_name, g.open_time
       FROM starline_user_bid b
       LEFT JOIN starline_game g ON g.id = b.game_id
       WHERE b.user_id=$1
       AND TO_DATE(b.game_date, 'DD Mon YYYY')
       BETWEEN $2::date AND $3::date
       ORDER BY b.id DESC
       LIMIT $4 OFFSET $5`,
      [user_id, fromDate, toDate, limitNum, offset]
    );

    const formatted = result.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      game_id: `${row.game_name || ""} (${row.open_time || ""})`,
      game_date: row.game_date,
      game_type: row.game_type,
      pana: row.pana,
      points: row.points,
      win_amount: row.win_amount,
      bid_txn_id: row.bid_txn_id,
      date: row.date,
      game_name: row.game_name
    }));

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total_records: totalRecords,
        total_pages: totalPages
      },
      result: formatted
    });

  } catch (error) {
    console.error("Starline Bid History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error"
    });
  }
};










exports.starlineGameRates = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // ✅ Fetch game rates
    const rateRes = await dbQuery(
      "SELECT * FROM starline_game_rate WHERE id=$1",
      [1]
    );

    if (rateRes.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found"
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: rateRes.rows
    });

  } catch (error) {
    console.error("Starline Game Rates Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error"
    });
  }
};











exports.starlineGameChart = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { date } = req.body || {};

    // 📅 Date format (default today)
    let filterDate;

    if (date) {
      const d = new Date(date);
      if (isNaN(d)) {
        return res.json({
          status: false,
          message: "Invalid Date Format"
        });
      }

      filterDate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    } else {
      const d = new Date();
      filterDate = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // 🔥 JOIN instead of loop query
    const result = await dbQuery(
      `SELECT r.*, g.name AS game_name
       FROM starline_declear_result r
       LEFT JOIN starline_game g ON g.id = r.game_id
       WHERE r.result_date=$1
       ORDER BY r.id DESC`,
      [filterDate]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found",
        result: []
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: result.rows
    });

  } catch (error) {
    console.error("Starline Game Chart Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error"
    });
  }
};























exports.starlineGameStatus = async (req, res) => {
  try {

    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { game_id } = req.body || {};

    if (!game_id) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // ✅ Update game status
    const update = await dbQuery(
      "UPDATE starline_game SET market_status=$1 WHERE id=$2",
      ['false', game_id]   // ⚠️ if varchar column
    );

    if (update.rowCount > 0) {
      return res.json({
        status: true,
        message: "Updated Successfully"
      });
    } else {
      return res.json({
        status: false,
        message: "Game Not Found"
      });
    }

  } catch (error) {
    console.error("Starline Game Status Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Problem"
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
      [game_id, result_number]
    );

    // Get today's bids
    const bids = await client.query(
      `SELECT * FROM starline_bids
       WHERE game_id=$1 AND status='pending'`,
      [game_id]
    );

    for (let bid of bids.rows) {

      if (bid.bid_number == result_number) {

        const rate = await client.query(
          "SELECT payout_multiplier FROM starline_rates WHERE bid_type=$1",
          [bid.bid_type]
        );

        const multiplier = parseFloat(rate.rows[0].payout_multiplier);
        const winAmount = bid.amount * multiplier;

        // Lock user wallet
        const user = await client.query(
          "SELECT wallet FROM user WHERE id=$1 FOR UPDATE",
          [bid.user_id]
        );

        const before = parseFloat(user.rows[0].wallet);
        const after = before + winAmount;

        await client.query(
          "UPDATE user SET wallet=$1 WHERE id=$2",
          [after, bid.user_id]
        );

        await client.query(
          `INSERT INTO wallet_transaction
           (user_id,type,amount,before_balance,after_balance,remark)
           VALUES($1,'credit',$2,$3,$4,$5)`,
          [bid.user_id, winAmount, before, after, "Starline Win"]
        );

        await client.query(
          "UPDATE starline_bids SET status='win', win_amount=$1 WHERE id=$2",
          [winAmount, bid.id]
        );

      } else {

        await client.query(
          "UPDATE starline_bids SET status='lose' WHERE id=$1",
          [bid.id]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      status: true,
      message: "Result Declared & Settlement Done"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.log(err);
    res.json({
      status: false,
      message: "Settlement Failed"
    });
  } finally {
    client.release();
  }
};