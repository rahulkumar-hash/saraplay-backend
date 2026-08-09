// const pool = require("../../config/db");
const dbQuery = require("../../utils/dbQuery");

// controller/gameController.js

exports.checkGameSession = async (req, res) => {
  try {
    const game_id = req.body?.game_id || req.query?.game_id || "";
    let game_type = req.body?.game_type || req.query?.game_type || "open";

    if (!game_id) {
      return res.json({
        status: false,
        message: "Game ID missing",
      });
    }

    // ✅ PostgreSQL query
    const result = await dbQuery("SELECT * FROM game WHERE id = $1", [game_id]);

    if (result.rows.length === 0) {
      return res.json({
        status: false,
        message: "Game not found",
      });
    }

    const game = result.rows[0];

    // India timezone
    const now = new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date(now);

    const currentTimeStr = currentDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const current_time_sec = new Date(`1970-01-01 ${currentTimeStr}`).getTime();

    let match_time;
    let message_text;

    if (game_type === "close") {
      match_time = game.close_time;
      message_text = "Game Closed";
      game_type = "close";
    } else {
      match_time = game.open_time;
      message_text = "Game Not Open Yet";
      game_type = "open";
    }

    const match_time_sec = new Date(`1970-01-01 ${match_time}`).getTime();

    if (current_time_sec > match_time_sec) {
      return res.json({
        status: false,
        expired: true,
        game_type,
        message: message_text,
        match_time,
        current_time: currentTimeStr,
      });
    } else {
      return res.json({
        status: true,
        expired: false,
        game_type,
        message: "Game is valid",
        match_time,
        current_time: currentTimeStr,
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getGames = async (req, res) => {
  try {
    // console.log("Step1");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // ✅ Same as PHP: date("d M Y")
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = today.toLocaleString("en-US", { month: "short" });
    const year = today.getFullYear();
    const todayFormatted = `${day} ${month} ${year}`;

    // ✅ Same as PHP: date('l')
    const currentDay = today
      .toLocaleString("en-US", { weekday: "long" })
      .toLowerCase();

    // ✅ Total count
    const totalResult = await dbQuery(
      `SELECT COUNT(*) FROM game WHERE status = 'true'`,
    );
    const total = parseInt(totalResult.rows[0].count);

    // ✅ Fetch games
    const gamesResult = await dbQuery(
      `SELECT id, name, hname, open_time, close_time, 
              market_status, closing_day
       FROM game
       WHERE status = 'true'
       ORDER BY TO_TIMESTAMP(open_time, 'HH12:MI PM') ASC
       `,
    );

    const games = gamesResult.rows;

    for (let game of games) {
      // ✅ Same as PHP default
      game.open_market_status = true;
      // game.market_status = Boolean(game.market_status);

      game.open_pana = "";
      game.open_digit = "";
      game.close_pana = "";
      game.close_digit = "";

      // ✅ SAME as PHP: open_declare_date != ''
      const resultRes = await dbQuery(
        `SELECT * FROM declear_result
         WHERE result_date = $1
         AND game_id = $2
         AND open_declare_date != ''`,
        [todayFormatted, game.id],
      );

      const result = resultRes.rows[0];

      if (result) {
        game.open_market_status = false;
        game.open_pana = result.open_pana;
        game.open_digit = result.open_digit;

        if (result.close_declare_date && result.close_declare_date !== "") {
          // game.market_status = false;
          game.close_pana = result.close_pana;
          game.close_digit = result.close_digit;
        }
      }

      // ✅ Closing day logic (exact PHP match)
      if (game.closing_day) {
        const closingDays = game.closing_day
          .split(",")
          .map((d) => d.trim().toLowerCase());

        if (closingDays.includes(currentDay)) {
          game.open_market_status = false;
          // game.market_status = false;
        }
      }
    }

    return res.json({
      status: true,
      message: "Games Loaded Successfully",
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      result: games,
    });
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
    });
  }
};

exports.newWinHistory = async (req, res) => {
  try {
    const user_id = req.body?.user_id;
    const from =
      req.body?.from || req.body?.date || new Date().toISOString().slice(0, 10);
    const to = req.body?.to || new Date().toISOString().slice(0, 10);

    if (!user_id) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery('SELECT * FROM "user" WHERE id = $1', [
      user_id,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    let result = [];

    // ✅ Normal Win History
    const normalQuery = await dbQuery(
      `SELECT * FROM win_history 
       WHERE TO_DATE(date, 'DD Mon YYYY') 
       BETWEEN $1 AND $2 
       AND user_id = $3`,
      [from, to, user_id],
    );

    for (let row of normalQuery.rows) {
      const gameData = await dbQuery("SELECT name FROM game WHERE id = $1", [
        row.game_id,
      ]);

      row.game_name =
        gameData.rows.length > 0 ? gameData.rows[0].name : "Unknown";
      row.type = "normal";

      result.push(row);
    }

    // ✅ Starline Win History
    const starQuery = await dbQuery(
      `SELECT * FROM starline_win_history 
       WHERE TO_DATE(date, 'DD Mon YYYY') 
       BETWEEN $1 AND $2 
       AND user_id = $3`,
      [from, to, user_id],
    );

    for (let row of starQuery.rows) {
      const gameData = await dbQuery(
        "SELECT name FROM starline_game WHERE id = $1",
        [row.game_id],
      );

      row.game_name =
        gameData.rows.length > 0 ? gameData.rows[0].name : "Unknown";
      row.type = "starline";

      result.push(row);
    }

    if (result.length > 0) {
      return res.json({
        status: true,
        message: "Data Found",
        result: result,
      });
    } else {
      return res.json({
        status: false,
        message: "History Not Found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getHowToPlay = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Total count
    const totalResult = await dbQuery("SELECT COUNT(*) FROM how_to_play");
    const total = parseInt(totalResult.rows[0].count);

    // Data
    const result = await dbQuery(
      `SELECT * FROM how_to_play
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    return res.json({
      status: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      result: result.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
    });
  }
};

exports.winHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { from_date, to_date, page = 1, limit = 10 } = req.body || {};

    if (!userId) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    date = from_date;

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const offset = (currentPage - 1) * perPage;

    // ✅ Default date handling
    const fromDate = date || new Date().toISOString().split("T")[0];

    const formatDate = (inputDate) => {
      const d = new Date(inputDate);
      const day = String(d.getDate()).padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    };

    const formattedDate = formatDate(fromDate);

    // ✅ Check user exists
    const userCheck = await dbQuery(`SELECT id FROM users WHERE id = $1`, [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // ✅ Total count
    const countQuery = await dbQuery(
      `SELECT COUNT(*) 
       FROM win_history 
       WHERE date = $1 AND user_id = $2`,
      [formattedDate, userId],
    );

    const total = parseInt(countQuery.rows[0].count);

    if (total === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
      });
    }

    // ✅ Paginated data with JOIN
    const historyQuery = await dbQuery(
      `SELECT w.*, g.name AS game_name
       FROM win_history w
       LEFT JOIN game g ON g.id = w.game_id
       WHERE w.date = $1 AND w.user_id = $2
       ORDER BY w.id DESC
       LIMIT $3 OFFSET $4`,
      [formattedDate, userId, perPage, offset],
    );

    const result = historyQuery.rows.map((row) => ({
      ...row,
      game_id: row.game_name,
    }));

    return res.json({
      status: true,
      message: "Data Found",
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      result,
    });
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
    });
  }
};

exports.bidHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { from, to, page = 1, limit = 10 } = req.body || {};

    if (!userId) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const offset = (currentPage - 1) * perPage;

    // User Check
    const userCheck = await dbQuery(`SELECT id FROM users WHERE id = $1`, [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // Build date filter dynamically — only applied when both from & to are passed
    const hasDateFilter = !!(from && to);

    const filterClause = hasDateFilter ? `AND ub.game_date BETWEEN $2 AND $3` : "";
    const countFilterClause = hasDateFilter ? `AND game_date BETWEEN $2 AND $3` : "";

    // Params for count query
    const countParams = hasDateFilter ? [userId, from, to] : [userId];

    // Count
    const countQuery = await dbQuery(
      `SELECT COUNT(*)
       FROM user_bid
       WHERE user_id = $1
       ${countFilterClause}`,
      countParams
    );

    const total = parseInt(countQuery.rows[0].count);

    if (total === 0) {
      return res.json({
        status: false,
        message: "History Not Found",
      });
    }

    // Params for main bid query (limit/offset always last)
    const bidParams = hasDateFilter
      ? [userId, from, to, perPage, offset]
      : [userId, perPage, offset];

    const limitOffsetPlaceholders = hasDateFilter ? `$4 OFFSET $5` : `$2 OFFSET $3`;

    const bidQuery = await dbQuery(
      `SELECT ub.*,
              ub.new_game_type AS game_type,
              g.name AS game_name
       FROM user_bid ub
       LEFT JOIN game g ON g.id = ub.game_id
       WHERE ub.user_id = $1
       ${filterClause}
       ORDER BY ub.id DESC
       LIMIT ${limitOffsetPlaceholders}`,
      bidParams
    );

    const result = bidQuery.rows.map((row) => {
      row.game_id = row.game_name;

      if (
        [
          "Jodi Digit",
          "Two Digits Panel",
          "Group Jodi",
          "Red Brackets",
        ].includes(row.new_game_type)
      ) {
        row.session = "";
      }

      return row;
    });

    return res.json({
      status: true,
      message: "Data Found",
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      result,
    });
  } catch (error) {
    console.error("Bid History Error:", error);

    return res.status(500).json({
      status: false,
      message: "Server Error",
    });
  }
};

exports.gameRates = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    // ✅ Get game rates (id = 1)
    const rateQuery = await dbQuery(
      "SELECT * FROM game_rate WHERE id = $1",
      [1],
    );

    if (rateQuery.rows.length === 0) {
      return res.json({
        status: false,
        message: "Data Not Found",
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: rateQuery.rows,
    });
  } catch (error) {
    console.error(error);
    return res.status(202).json({
      status: false,
      message: "Server Error",
    });
  }
};

exports.declearDigit = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const { result_date, page = 1, limit = 10 } = req.body || {};

    let pageNum = parseInt(page);
    let limitNum = parseInt(limit);

    if (pageNum <= 0) pageNum = 1;
    if (limitNum <= 0 || limitNum > 100) limitNum = 10;

    const offset = (pageNum - 1) * limitNum;

    // 📅 If no date passed → today's date (same PHP format)
    let filterDate = result_date;
    if (!filterDate) {
      const now = new Date();
      const options = { day: "2-digit", month: "short", year: "numeric" };
      filterDate = now.toLocaleDateString("en-GB", options);
    }

    // 📊 Total count
    const countQuery = await dbQuery(
      "SELECT COUNT(*) FROM declear_result WHERE result_date=$1",
      [filterDate],
    );

    const totalRecords = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limitNum);

    if (totalRecords === 0) {
      return res.json({
        status: false,
        message: "Data Not Found!",
        data: [],
      });
    }

    // 📄 Data query
    const result = await dbQuery(
      `SELECT * FROM declear_result
       WHERE result_date=$1
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [filterDate, limitNum, offset],
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
    console.error("Declear Digit Error:", error);
    return res.status(202).json({
      status: false,
      message: "Network Error!",
    });
  }
};

exports.gameChartList = async (req, res) => {
  try {
    // 🔐 Token validation
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    const user_id = req.user.id;

    // 📅 Date filter (default today)
    let inputDate = req.body?.date;
    let date;

    if (inputDate) {
      const d = new Date(inputDate);
      date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } else {
      const d = new Date();
      date = d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
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

    // =========================
    // 🔵 STARLINE GAMES
    // =========================

    const starlineGames = await dbQuery("SELECT * FROM starline_game");

    const starlineResults = await dbQuery(
      `SELECT *
       FROM starline_declear_result
       WHERE result_date=$1`,
      [date],
    );

    const starlineResultMap = {};
    starlineResults.rows.forEach((r) => {
      starlineResultMap[r.game_id] = r;
    });

    const starlineData = starlineGames.rows.map((game) => {
      const result = starlineResultMap[game.id];

      return {
        type: "Starline",
        game_id: game.id,
        game_name: game.name,
        game_time: game.game_time,
        result_date: date,
        pana: result ? result.pana : "",
        digit: result ? result.digit : "",
        result_status: result ? "Declared" : "Not Declared",
      };
    });

    // =========================
    // 🟣 JACKPOT GAMES
    // =========================

    const jackpotGames = await dbQuery("SELECT * FROM jackpot");

    const jackpotResults = await dbQuery(
      `SELECT *
       FROM jackpot_declear_result
       WHERE result_date=$1`,
      [date],
    );

    const jackpotResultMap = {};
    jackpotResults.rows.forEach((r) => {
      jackpotResultMap[r.game_id] = r;
    });

    const jackpotData = jackpotGames.rows.map((game) => {
      const result = jackpotResultMap[game.id];

      return {
        type: game.name,
        game_id: game.id,
        game_name: game.name,
        game_time: game.close_time,
        result_date: date,
        pana: result ? result.pana : "",
        digit: result ? result.digit : "",
        result_status: result ? "Declared" : "Not Declared",
      };
    });

    // 🔥 Combine
    const finalData = [...starlineData, ...jackpotData];

    return res.json({
      status: true,
      message: "Data Found",
      result: finalData,
    });
  } catch (error) {
    console.error("Game Chart List Error:", error);
    return res.status(202).json({
      status: false,
      message: "Network Error!",
    });
  }
};
