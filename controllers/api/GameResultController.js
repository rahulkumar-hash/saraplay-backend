const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");




exports.declareResult = async (req, res) => {
  const client = await pool.connect();

  try {
    const { game_id, open_number, close_number } = req.body;

    await client.query("BEGIN");

    // 1️⃣ Insert result
    await client.query(
      `INSERT INTO game_results 
       (game_id, open_number, close_number)
       VALUES ($1,$2,$3)`,
      [game_id, open_number, close_number]
    );

    // 2️⃣ Get today's pending bids
    const bids = await client.query(
      `SELECT * FROM bids 
       WHERE game_id=$1 
       AND status='pending'`,
      [game_id]
    );

    for (let bid of bids.rows) {

      let isWin = false;

      // 🎯 SIMPLE MATCH LOGIC (Customize as per your PHP logic)

      if (bid.bid_type === "single" && bid.bid_number == open_number) {
        isWin = true;
      }

      if (bid.bid_type === "jodi" && bid.bid_number == open_number + close_number) {
        isWin = true;
      }

      if (isWin) {

        // Get rate
        const rateRow = await client.query(
          "SELECT payout_multiplier FROM game_rates WHERE bid_type=$1",
          [bid.bid_type]
        );

        const multiplier = parseFloat(rateRow.rows[0].payout_multiplier);
        const winAmount = bid.amount * multiplier;

        // 🔒 Lock user wallet
        const user = await client.query(
          "SELECT wallet FROM user WHERE id=$1 FOR UPDATE",
          [bid.user_id]
        );

        const before = parseFloat(user.rows[0].wallet);
        const after = before + winAmount;

        // Update wallet
        await client.query(
          "UPDATE user SET wallet=$1 WHERE id=$2",
          [after, bid.user_id]
        );

        // Wallet transaction
        await client.query(
          `INSERT INTO wallet_transaction
           (user_id,type,amount,before_balance,after_balance,remark)
           VALUES($1,'credit',$2,$3,$4,$5)`,
          [bid.user_id, winAmount, before, after, "Game Win"]
        );

        // Update bid status
        await client.query(
          "UPDATE bids SET status='win', win_amount=$1 WHERE id=$2",
          [winAmount, bid.id]
        );

      } else {

        await client.query(
          "UPDATE bids SET status='lose' WHERE id=$1",
          [bid.id]
        );
      }
    }

    await client.query("COMMIT");

    res.json({
      status: true,
      message: "Result Declared & Settlement Completed"
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







exports.getGamesAdvanced = async (req, res) => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS

    const games = await dbQuery(
      `SELECT *,
       CASE 
         WHEN open_time::time > $1::time THEN 'upcoming'
         WHEN close_time::time < $1::time THEN 'closed'
         ELSE 'running'
       END AS market_status
       FROM game
       WHERE status = true
       ORDER BY open_time ASC`,
      [currentTime]
    );

    res.json({
      status: true,
      message: "Games fetched successfully",
      data: games.rows
    });

  } catch (err) {
    console.error(err);
    res.json({ status: false, message: "Server Error" });
  }
};


exports.getGames = async (req, res) => {
  const games = await dbQuery(
    "SELECT * FROM game WHERE status=true ORDER BY id ASC"
  );

  res.json({
    status: true,
    message: "Games Found",
    data: games.rows
  });
};



exports.getGameRates = async (req, res) => {
  const rates = await dbQuery(
    "SELECT * FROM game_rates ORDER BY id ASC"
  );

  res.json({
    status: true,
    message: "Game Rates Found",
    data: rates.rows
  });
};



exports.getGameChart = async (req, res) => {
  const { game_id } = req.body;

  const results = await dbQuery(
    `SELECT * FROM game_results
     WHERE game_id=$1
     ORDER BY result_date DESC`,
    [game_id]
  );

  if (results.rows.length) {
    res.json({
      status: true,
      message: "Chart Data Found",
      data: results.rows
    });
  } else {
    res.json({
      status: false,
      message: "No Data Found",
      data: []
    });
  }
};


exports.getGameChartList = async (req, res) => {
  const games = await dbQuery(
    "SELECT id,name FROM game WHERE status=true ORDER BY name ASC"
  );

  res.json({
    status: true,
    message: "Game Chart List",
    data: games.rows
  });
};


exports.getBidHistory = async (req, res) => {
  const userId = req.user.id;
  const { from_date, to_date } = req.body;

  const result = await dbQuery(
    `SELECT * FROM bids
     WHERE user_id=$1
     AND DATE(created_at) BETWEEN $2 AND $3
     ORDER BY id DESC`,
    [userId, from_date, to_date]
  );

  res.json({
    status: true,
    message: "Bid History Found",
    data: result.rows
  });
};


exports.getWinHistory = async (req, res) => {
  const userId = req.user.id;

  const result = await dbQuery(
    `SELECT * FROM bids
     WHERE user_id=$1 AND status='win'
     ORDER BY id DESC`,
    [userId]
  );

  res.json({
    status: true,
    message: "Win History Found",
    data: result.rows
  });
};

exports.getNewWinHistory = async (req, res) => {
  const result = await dbQuery(
    `SELECT user_id, bid_number, win_amount, created_at
     FROM bids
     WHERE status='win'
     ORDER BY id DESC
     LIMIT 20`
  );

  res.json({
    status: true,
    message: "Latest Win History",
    data: result.rows
  });
};