const db = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");
// const pool = require('../../config/db');

exports.getJackpotGames = async (req, res) => {
  try {
    const result = await dbQuery("SELECT * FROM jackpot");
    const games = result.rows;

    // ── IST current time in HH:MM (24-hour) ──────────────────────────────
    const istNow     = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate    = new Date(istNow);
    const hh         = String(istDate.getHours()).padStart(2, "0");
    const mm         = String(istDate.getMinutes()).padStart(2, "0");
    const currentTime = `${hh}:${mm}`;   // e.g. "18:40"  always HH:MM

    // ── Today's date in IST (YYYY-MM-DD) ─────────────────────────────────
    const todayISO = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    for (let game of games) {
      // Check if result DECLARED (not just saved) today
      const resultData = await dbQuery(
        `SELECT result, declare_date
         FROM jackpot_declear_result 
         WHERE game_id = $1
           AND result_date::date = $2::date
           AND declare_date IS NOT NULL 
           AND declare_date != ''
         LIMIT 1`,
        [game.id, todayISO],
      );

      if (resultData.rows.length > 0) {
        const declaredResult = resultData.rows[0].result || "";

        // result is a 2-digit number like "99", "07"
        // pana  = full result value (jackpot has no separate pana, reuse result)
        // digit = result value (same)
        game.market_status = false;
        game.result        = declaredResult;
        game.pana          = declaredResult;
        game.digit         = declaredResult;
        game.declare_date  = resultData.rows[0].declare_date || "";
      } else {
        // Not declared yet → check current time vs close_time
        game.market_status = currentTime < game.close_time;
        game.result        = "";
        game.pana          = "";
        game.digit         = "";
        game.declare_date  = "";
      }
    }

    res.json({
      status:       true,
      message:      "Jackpot Games Loaded Successfully",
      result:       games,
    });
  } catch (error) {
    res.json({
      status:  false,
      message: error.message,
    });
  }
};

exports.addBulkBids = async (req, res) => {
  console.log("---- NEW BID ----");
  // try {

  const bids = req.body.data;

  if (!bids || !Array.isArray(bids) || bids.length === 0) {
    return res.json({
      status: false,
      message: "Invalid data parameter",
    });
  }

  const insertData = [];
  const game_rate = 10;

  const now = new Date();
  const game_date = now.toISOString().slice(0, 10);

  // for (const bid of bids) {

  //   console.log("---- NEW BID ----");
  //   console.log("Bid:", bid);

  //   const user_id = Number(bid.str_userid);
  //   const game_id = Number(bid.str_gameid);
  //   const digit = bid.value;
  //   const points = Number(bid.tv_pointsvalue);

  //   console.log({ user_id, game_id, digit, points });

  //   // game check
  //   const game = await dbQuery(
  //     `SELECT * FROM jackpot WHERE id=$1`,
  //     [game_id]
  //   );

  //   console.log("Game Found:", game.rows.length);

  //   if (game.rows.length === 0) {
  //     console.log("❌ Game Not Found");
  //     continue;
  //   }

  //   // wallet check
  //   const wallet = await dbQuery(
  //     `SELECT * FROM wallet
  //     WHERE user_id=$1
  //     ORDER BY id DESC
  //     LIMIT 1`,
  //     [user_id]
  //   );

  //   console.log("Wallet Found:", wallet.rows.length);

  //   if (wallet.rows.length === 0) {
  //     console.log("❌ Wallet Not Found");
  //     continue;
  //   }

  //   const closing = Number(wallet.rows[0].txn_clbal);
  //   console.log("Balance:", closing);

  //   if (closing < points) {
  //     console.log("❌ Insufficient Balance");
  //     continue;
  //   }

  //   console.log("✅ VALID BID - WILL INSERT");
  // }

  for (const bid of bids) {
    if (
      !bid.str_userid ||
      !bid.str_gameid ||
      !bid.value ||
      !bid.tv_pointsvalue
    ) {
      continue;
    }

    const user_id = bid.str_userid;
    const game_id = bid.str_gameid;
    const digit = bid.value;
    const points = Number(bid.tv_pointsvalue);

    if (user_id <= 0 || game_id <= 0 || points <= 0 || digit === "") {
      continue;
    }

    // game check
    const game = await dbQuery(`SELECT * FROM jackpot WHERE id=$1`, [game_id]);

    if (game.rows.length === 0) continue;

    // wallet check
    const wallet = await dbQuery(
      `SELECT * FROM wallet 
         WHERE user_id=$1 
         ORDER BY id DESC 
         LIMIT 1`,
      [user_id],
    );

    if (wallet.rows.length === 0) continue;

    const closing = Number(wallet.rows[0].txn_clbal);

    if (closing < points) continue;

    // insert bid
    const bidInsert = await dbQuery(
      `INSERT INTO jackpot_bid
        (user_id, game_date, bid_on, game_id, bid_amount, win_amount,created_at)
        VALUES ($1,$2,$3,$4,$5,$6, NOW())`,
      [user_id, game_date, digit, game_id, points, points * game_rate],
    );

    if (bidInsert) {
      const total = closing - points;
      const txn_id = "TXN" + Date.now();

      const txntype = `Bid placed for Jackpot ${game.rows[0].name}`;

      await dbQuery(
        `INSERT INTO wallet
          (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
           txn_comment, txn_date, transfer_user_id, transaction_id)
          VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)`,
        [user_id, closing, 0, points, total, txntype, user_id, txn_id],
      );

      insertData.push({
        user_id,
        game_id,
        digit,
        bid_amount: points,
        win_amount: points * game_rate,
      });
    }
  }

  if (insertData.length > 0) {
    return res.json({
      status: true,
      message: "Bids placed successfully",
      data: insertData,
    });
  }

  return res.json({
    status: false,
    message: "No valid bids inserted",
  });

  // } catch (error) {
  //   console.error(error);

  //   res.json({
  //     status: false,
  //     message: "Server error"
  //   });
  // }
};

exports.winHistory = async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.body;

    if (!user_id || !start_date || !end_date) {
      return res.json({
        status: false,
        message:
          "Missing parameters: user_id, start_date, or end_date required",
      });
    }

    // check user
    const user = await dbQuery(`SELECT * FROM "user" WHERE id=$1`, [user_id]);

    if (user.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid user",
      });
    }

    const from_date = new Date(start_date).toISOString().slice(0, 10);
    const to_date = new Date(end_date).toISOString().slice(0, 10);

    const query = await dbQuery(
      `SELECT * FROM jackpot_win_history
       WHERE user_id=$1
       AND game_date BETWEEN $2 AND $3
       ORDER BY id DESC`,
      [user_id, from_date, to_date],
    );

    if (query.rows.length > 0) {
      const result = [];

      for (const row of query.rows) {
        const game = await dbQuery(`SELECT name FROM jackpot WHERE id=$1`, [
          row.game_id,
        ]);

        row.game_name = game.rows.length ? game.rows[0].name : "Unknown";

        const d = new Date(row.game_date);
        row.game_date = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        result.push(row);
      }

      return res.json({
        status: true,
        message: "Data found",
        start_date: from_date,
        end_date: to_date,
        result,
      });
    } else {
      return res.json({
        status: false,
        message: "No win history found for the selected date range",
      });
    }
  } catch (error) {
    console.error(error);

    res.json({
      status: false,
      message: "Server error",
    });
  }
};

exports.JackpotGameChart = async (req, res) => {
  try {
    const { user_id, date } = req.body;

    const game_date = date
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    if (!user_id) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // check user
    const user = await dbQuery(`SELECT * FROM "user" WHERE id=$1`, [user_id]);

    if (user.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    const query = await dbQuery(
      `SELECT * FROM jackpot_declear_result
       WHERE result_date=$1`,
      [game_date],
    );

    if (query.rows.length > 0) {
      const result = [];

      for (const row of query.rows) {
        const game = await dbQuery(`SELECT name FROM jackpot WHERE id=$1`, [
          row.game_id,
        ]);

        row.game_name = game.rows.length ? game.rows[0].name : "Unknown";

        result.push(row);
      }

      return res.json({
        status: true,
        message: "Data Found",
        result,
      });
    }

    return res.json({
      status: false,
      message: "Data Not Found",
      result: [],
    });
  } catch (error) {
    console.error(error);

    res.json({
      status: false,
      message: "Server error",
    });
  }
};

// exports.addBulkBids = async (req, res) => {
//   try {

//     const inputData = req.body.data;

//     if (!inputData) {
//       return res.json({
//         status: false,
//         message: "Missing data parameter"
//       });
//     }

//     let bids;

//     try {
//       bids = JSON.parse(inputData);
//     } catch (err) {
//       return res.json({
//         status: false,
//         message: "Invalid JSON format in data"
//       });
//     }

//     if (!Array.isArray(bids) || bids.length === 0) {
//       return res.json({
//         status: false,
//         message: "Invalid JSON format in data"
//       });
//     }

//     const insertData = [];
//     const game_rate = 10;

//     const date = new Date();
//     const game_date = date.toISOString().slice(0, 10);

//     for (const bid of bids) {

//       if (
//         !bid.str_userid ||
//         !bid.str_gameid ||
//         !bid.value ||
//         !bid.tv_pointsvalue
//       ) {
//         continue;
//       }

//       const user_id = bid.str_userid;
//       const game_id = bid.str_gameid;
//       const digit = bid.value;
//       const points = Number(bid.tv_pointsvalue);

//       if (user_id <= 0 || game_id <= 0 || points <= 0 || digit === "") {
//         continue;
//       }

//       // 1️⃣ Get Game
//       const game = await dbQuery(
//         `SELECT * FROM jackpot WHERE id=$1`,
//         [game_id]
//       );

//       if (game.rows.length === 0) continue;

//       // 2️⃣ Get Wallet
//       const wallet = await dbQuery(
//         `SELECT * FROM wallet
//          WHERE user_id=$1
//          ORDER BY id DESC
//          LIMIT 1`,
//         [user_id]
//       );

//       if (wallet.rows.length === 0) continue;

//       const closing = Number(wallet.rows[0].txn_clbal);

//       if (closing < points) continue;

//       // 3️⃣ Insert Bid
//       const insertBid = await dbQuery(
//         `INSERT INTO jackpot_bid
//         (user_id, game_date, bid_on, game_id, bid_amount, win_amount)
//         VALUES ($1,$2,$3,$4,$5,$6)`,
//         [
//           user_id,
//           game_date,
//           digit,
//           game_id,
//           points,
//           points * game_rate
//         ]
//       );

//       if (insertBid) {

//         const total = closing - points;
//         const txn_id = "TXN" + Date.now();

//         const txntype = `Bid placed for Jackpot ${game.rows[0].name}`;

//         // 4️⃣ Insert Wallet Transaction
//         await dbQuery(
//           `INSERT INTO wallet
//           (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
//            txn_comment, txn_date, transfer_user_id, transaction_id)
//           VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,$8)`,
//           [
//             user_id,
//             closing,
//             0,
//             points,
//             total,
//             txntype,
//             user_id,
//             txn_id
//           ]
//         );

//         insertData.push({
//           user_id,
//           game_id,
//           digit,
//           bid_amount: points,
//           win_amount: points * game_rate
//         });
//       }
//     }

//     if (insertData.length > 0) {
//       return res.json({
//         status: true,
//         message: "Bids placed successfully"
//       });
//     }

//     return res.json({
//       status: false,
//       message: "No valid bids inserted"
//     });

//   } catch (error) {
//     console.error("Bulk bid error:", error);

//     res.json({
//       status: false,
//       message: "Server error"
//     });
//   }
// };

exports.placeJackpotBids = async (req, res) => {
  const client = await db.connect();

  try {
    const bids = req.body.data;

    if (!bids || bids.length === 0) {
      return res.json({
        status: false,
        message: "Missing data parameter",
      });
    }

    const game_rate = 10;
    const game_date = new Date().toISOString().slice(0, 10);

    let inserted = [];

    await client.query("BEGIN");

    for (let bid of bids) {
      console.log("BID DATA:", bid);

      let user_id = bid.str_userid;
      let game_id = bid.str_gameid;
      let digit = bid.value;
      let points = bid.tv_pointsvalue;

      if (!user_id || !game_id || !points) {
        console.log("Missing field");
        continue;
      }

      const game = await client.query("SELECT * FROM jackpot WHERE id=$1", [
        game_id,
      ]);

      console.log("GAME:", game.rows);

      if (game.rows.length === 0) {
        console.log("Game not found");
        continue;
      }

      const wallet = await client.query(
        "SELECT * FROM wallet WHERE user_id=$1 ORDER BY id DESC LIMIT 1",
        [user_id],
      );

      console.log("WALLET:", wallet.rows);

      if (wallet.rows.length === 0) {
        console.log("Wallet not found");
        continue;
      }

      let closing = wallet.rows[0].txn_clbal;

      if (closing < points) {
        console.log("Insufficient balance");
        continue;
      }
    }

    await client.query("COMMIT");

    if (inserted.length > 0) {
      res.json({
        status: true,
        message: "Bids placed successfully",
        inserted: inserted.length,
      });
    } else {
      res.json({
        status: false,
        message: "No valid bids inserted",
      });
    }
  } catch (error) {
    await client.query("ROLLBACK");

    res.json({
      status: false,
      message: error.message,
    });
  } finally {
    client.release();
  }
};

// exports.placeJackpotBids = async (req,res)=>{

//   try{

//     const bids = req.body.data;

//     if(!bids || bids.length===0){
//       return res.json({
//         status:false,
//         message:"Missing data parameter"
//       })
//     }

//     const game_rate = 10;
//     const game_date = new Date().toISOString().slice(0,10);

//     let inserted=[];

//     for(let bid of bids){

//       let user_id = bid.str_userid;
//       let game_id = bid.str_gameid;
//       let digit = bid.value;
//       let points = bid.tv_pointsvalue;

//       if(!user_id || !game_id || !points) continue;

//       const [game] = await dbQuery("SELECT * FROM jackpot WHERE id=?",[game_id]);

//       if(game.length==0) continue;

//       const [wallet] = await dbQuery(
//         "SELECT * FROM wallet WHERE user_id=? ORDER BY id DESC LIMIT 1",
//         [user_id]
//       );

//       if(wallet.length==0) continue;

//       let closing = wallet[0].txn_clbal;

//       if(closing < points) continue;

//       await dbQuery(`
//       INSERT INTO jackpot_bid
//       (user_id,game_date,bid_on,game_id,bid_amount,win_amount)
//       VALUES (?,?,?,?,?,?)`,
//       [
//         user_id,
//         game_date,
//         digit,
//         game_id,
//         points,
//         points*game_rate
//       ]);

//       let total = closing - points;

//       await dbQuery(`
//       INSERT INTO wallet
//       (user_id,txn_opbal,txn_crdt,txn_dbdt,txn_clbal,txn_comment)
//       VALUES (?,?,?,?,?,?)`,
//       [
//         user_id,
//         closing,
//         0,
//         points,
//         total,
//         "Bid placed for Jackpot "+game[0].name
//       ]);

//       inserted.push(bid);

//     }

//     if(inserted.length>0){

//       res.json({
//         status:true,
//         message:"Bids placed successfully"
//       });

//     }else{

//       res.json({
//         status:false,
//         message:"No valid bids inserted"
//       });

//     }

//   }catch(error){

//     res.json({
//       status:false,
//       message:error.message
//     });

//   }

// }

exports.jackpotBidHistory = async (req,res)=>{

  try{

    const {user_id,start_date,end_date} = req.body;

    if(!user_id){

      return res.json({
        status:false,
        message:"Missing parameters"
      })

    }

    const hasDateFilter = !!(start_date && end_date);

    const dateFilterClause = hasDateFilter ? "AND game_date BETWEEN ? AND ?" : "";
    const params = hasDateFilter ? [user_id,start_date,end_date] : [user_id];

    const [rows] = await dbQuery(`
      SELECT * FROM jackpot_bid
      WHERE user_id=?
      ${dateFilterClause}
      ORDER BY id DESC
    `,params);

    for(let row of rows){

      const [game] = await dbQuery(
        "SELECT name FROM jackpot WHERE id=?",
        [row.game_id]
      );

      row.game_name = game.length?game[0].name:"Unknown";

    }

    res.json({
      status:true,
      message:"Data found",
      result:rows
    })

  }catch(error){

    res.json({status:false,message:error.message})

  }

}

exports.jackpotWinHistory = async (req, res) => {
  try {
    const { user_id, start_date, end_date } = req.body;

    if (!user_id || !start_date || !end_date) {
      return res.json({
        status: false,
        message:
          "Missing parameters: user_id, start_date, or end_date required",
      });
    }

    // check user
    const user = await dbQuery(`SELECT * FROM "users" WHERE id=$1`, [user_id]);

    if (user.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid user",
      });
    }

    const from_date = new Date(start_date).toISOString().slice(0, 10);
    const to_date = new Date(end_date).toISOString().slice(0, 10);

    const query = await dbQuery(
      `SELECT * FROM jackpot_win_history
       WHERE user_id=$1
       AND game_date BETWEEN $2 AND $3
       ORDER BY id DESC`,
      [user_id, from_date, to_date],
    );

    if (query.rows.length > 0) {
      const result = [];

      for (const row of query.rows) {
        const game = await dbQuery(`SELECT name FROM jackpot WHERE id=$1`, [
          row.game_id,
        ]);

        row.game_name = game.rows.length ? game.rows[0].name : "Unknown";

        const d = new Date(row.game_date);
        row.game_date = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        result.push(row);
      }

      return res.json({
        status: true,
        message: "Data found",
        start_date: from_date,
        end_date: to_date,
        result,
      });
    } else {
      return res.json({
        status: false,
        message: "No win history found for the selected date range",
      });
    }
  } catch (error) {
    console.error(error);

    res.json({
      status: false,
      message: "Server error",
    });
  }

  // try{

  //   const {user_id,start_date,end_date} = req.body;

  //   const [rows] = await dbQuery(`
  //   SELECT * FROM jackpot_win_history
  //   WHERE user_id=? AND game_date BETWEEN ? AND ?
  //   ORDER BY id DESC
  //   `,[user_id,start_date,end_date]);

  //   for(let row of rows){

  //     const [game] = await dbQuery(
  //       "SELECT name FROM jackpot WHERE id=?",
  //       [row.game_id]
  //     );

  //     row.game_name = game.length?game[0].name:"Unknown";

  //   }

  //   res.json({
  //     status:true,
  //     message:"Data found",
  //     result:rows
  //   })

  // }catch(error){

  //   res.json({status:false,message:error.message})

  // }
};

exports.jackpotGameChart = async (req, res) => {
  try {
    const { user_id, date } = req.body || {};

    const game_date = date
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    if (!user_id) {
      return res.json({
        status: false,
        message: "Missing Parameters",
      });
    }

    // check user
    const user = await dbQuery(`SELECT * FROM "users" WHERE id=$1`, [user_id]);

    if (user.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User",
      });
    }

    const query = await dbQuery(
      `SELECT * FROM jackpot_declear_result
       WHERE result_date=$1`,
      [game_date],
    );

    if (query.rows.length > 0) {
      const result = [];

      for (const row of query.rows) {
        const game = await dbQuery(`SELECT name FROM jackpot WHERE id=$1`, [
          row.game_id,
        ]);

        row.game_name = game.rows.length ? game.rows[0].name : "Unknown";

        result.push(row);
      }

      return res.json({
        status: true,
        message: "Data Found",
        result,
      });
    }

    return res.json({
      status: false,
      message: "Data Not Found",
      result: [],
    });
  } catch (error) {
    console.error(error);

    res.json({
      status: false,
      message: "Server error",
    });
  }

  // try{

  //   const {user_id,date} = req.body;

  //   const game_date = date || new Date().toISOString().slice(0,10);

  //   const [rows] = await dbQuery(
  //     "SELECT * FROM jackpot_declear_result WHERE result_date=?",
  //     [game_date]
  //   );

  //   for(let row of rows){

  //     const [game] = await dbQuery(
  //       "SELECT name FROM jackpot WHERE id=?",
  //       [row.game_id]
  //     );

  //     row.game_name = game.length?game[0].name:"Unknown";

  //   }

  //   res.json({
  //     status:true,
  //     message:"Data Found",
  //     result:rows
  //   })

  // }catch(error){

  //   res.json({status:false,message:error.message})

  // }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/jackpot/result-chart
// Chart: rows = dates (last N days), columns = jackpot games (sorted by close_time)
// Cell value = declared result ("07","99") or "" if not declared yet
// ─────────────────────────────────────────────────────────────────────────────
exports.jackpotResultChart = async (req, res) => {
  try {
    // ── Auth check ────────────────────────────────────────────────────────────
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const days = parseInt(req.query.days || req.body?.days) || 30;
    const fromParam = req.query.from || req.body?.from || null;
    const toParam   = req.query.to   || req.body?.to   || null;

    // ── Date range ────────────────────────────────────────────────────────────
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"

    const endDate   = toParam   || todayIST;
    const startDate = fromParam
      ? fromParam
      : (() => {
          const d = new Date(endDate);
          d.setDate(d.getDate() - (days - 1));
          return d.toISOString().slice(0, 10);
        })();

    // ── 1. All active jackpot games ──────────────────────────────────────────
    const gamesRes = await dbQuery(
      `SELECT id, name, close_time
       FROM jackpot
       WHERE status = true
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

    games.sort((a, b) => timeToMinutes(a.close_time) - timeToMinutes(b.close_time));

    if (games.length === 0) {
      return res.json({
        status:  false,
        message: "No jackpot games found",
        games:   [],
        dates:   [],
        chart:   [],
      });
    }

    // ── 2. All declared results in date range ─────────────────────────────────
    const resultsRes = await dbQuery(
      `SELECT game_id, result_date, result, declare_date
       FROM jackpot_declear_result
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
        resultMap[key] = String(row.result || "").trim() || "**";
      }
    });

    // ── 3. Build date list (newest first) ─────────────────────────────────────
    const dateList = [];
    const cursor   = new Date(endDate);
    const stop     = new Date(startDate);
    while (cursor >= stop) {
      dateList.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() - 1);
    }

    // ── 4. Build chart rows ───────────────────────────────────────────────────
    const chart = dateList.map((dateStr) => {
      const [y, m, d] = dateStr.split("-");
      const displayDate = `${d}-${m}-${y}`;

      const results = {};
      games.forEach((game) => {
        const key = `${dateStr}_${game.id}`;
        results[game.id] = resultMap[key] || "";
      });

      return {
        date:         displayDate,      // "13-08-2026"
        date_iso:     dateStr,          // "2026-08-13"
        results,                        // { 17: "07", 18: "99" }
      };
    });

    // ── 5. Games header info for frontend columns ─────────────────────────────
    const gameHeaders = games.map((g) => ({
      id:         g.id,
      name:       g.name,
      close_time: formatTime12(g.close_time),
    }));

    return res.json({
      status:  true,
      message: "Jackpot Result Chart Loaded",
      from:    startDate,
      to:      endDate,
      games:   gameHeaders,
      chart,
    });

  } catch (error) {
    console.error("Jackpot Result Chart Error:", error);
    return res.status(500).json({
      status:  false,
      message: "Server Error",
      error:   error.message,
    });
  }
};
