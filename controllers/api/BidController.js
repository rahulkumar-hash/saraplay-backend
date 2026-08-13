const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");
const { sendSingleNotification, sendMultiNotification } = require("../../utils/sendNotification");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Convert "HH:MM AM/PM" string → total minutes since midnight (0–1439)
// Fix: new Date('1970-01-01 09:22 PM') gives wrong result in Node.js
//      because it ignores AM/PM → use manual parser instead
// ─────────────────────────────────────────────────────────────────────────────
function timeStrToMinutes(timeStr) {
  const [time, modifier] = timeStr.trim().split(" ");
  let [hours, minutes]   = time.split(":").map(Number);
  if (modifier.toUpperCase() === "PM" && hours !== 12) hours += 12;
  if (modifier.toUpperCase() === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolveActiveSession(game_id)
//
// Document Section 1 & 3 logic:
//   • Group B types (Jodi/Sangam) → caller always forces session = "Close"
//   • Group A (Single/Pana/Motor):
//       - Current Time < Open Time AND Open Not Declared → session stays "Open"
//       - Open Time passed BUT Current Time < Close Time → auto-convert to "Close"
//                                                          + sets session_adjusted = true
//       - Current Time >= Close Time                    → returns "closed" (market shut)
//
// Returns object:
//   { active_session: "open"|"close"|"closed", session_adjusted: boolean }
// ─────────────────────────────────────────────────────────────────────────────
async function resolveActiveSession(game_id) {
  const gameRes = await dbQuery(
    "SELECT open_time, close_time, market_status, closing_day FROM game WHERE id = $1",
    [game_id]
  );
  if (!gameRes.rows.length) return { active_session: "closed", session_adjusted: false, is_closing_day: false };

  const { open_time, close_time, market_status, closing_day } = gameRes.rows[0];

  // Check closing day
  const todayObj = new Date();
  const currentDay = todayObj.toLocaleString("en-US", { weekday: "long" }).toLowerCase();
  let is_closing_day = false;
  if (closing_day) {
    const closingDays = closing_day.split(",").map((d) => d.trim().toLowerCase());
    is_closing_day = closingDays.includes(currentDay);
  }

  if (is_closing_day) {
    return { active_session: "closed", session_adjusted: false, is_closing_day: true };
  }

  // IST current time → minutes since midnight (correct AM/PM parsing)
  const nowIST  = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const timeStr = new Date(nowIST).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
  const nowMins   = timeStrToMinutes(timeStr);
  const openMins  = timeStrToMinutes(open_time);
  const closeMins = timeStrToMinutes(close_time);

  const todayFmt = `${String(todayObj.getDate()).padStart(2, "0")} ${todayObj.toLocaleString("en-US", { month: "short" })} ${todayObj.getFullYear()}`;

  const declareRes = await dbQuery(
    `SELECT open_declare_date, close_declare_date
     FROM declear_result
     WHERE result_date = $1
       AND game_id     = $2`,
    [todayFmt, game_id]
  );

  const declareRow    = declareRes.rows[0] || {};
  const open_declared = !!(declareRow.open_declare_date && declareRow.open_declare_date !== "");

  // 1. Before open_time + open NOT declared -> "open" session (both Open & Close bets allowed)
  if (nowMins < openMins && !open_declared) {
    return { active_session: "open", session_adjusted: false, is_closing_day: false };
  }

  // 2. After open_time & before close_time -> "close" session (ONLY Close bets allowed)
  if (nowMins < closeMins) {
    return { active_session: "close", session_adjusted: true, is_closing_day: false };
  }

  // 3. Past close_time -> Market closed for today (neither Open nor Close bets allowed)
  return { active_session: "closed", session_adjusted: false, is_closing_day: false };
}




exports.sendNotificationApi = async (req, res) => {
  try {
    const { token, tokens } = req.body;

    if (token) {
      await sendSingleNotification(
        token,
        "Order Update 🚀",
        "Your order is confirmed"
      );
    }

    if (tokens) {
      await sendMultiNotification(
        tokens,
        "🔥 Offer",
        "Flat 50% off"
      );
    }

    res.json({ success: true });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};

// exports.placeBid = async (req, res) => {
//   const client = await pool.connect();

//   try {
//     const userId = req.user.id;
//     const { game_id, bids } = req.body;

//     /*
//       Expected format:
//       bids: [
//         { bid_type: "single", bid_number: "123", amount: 100 },
//         { bid_type: "single", bid_number: "456", amount: 200 }
//       ]
//     */

//     if (!bids || bids.length === 0) {
//       return res.json({
//         status: false,
//         message: "No bids provided"
//       });
//     }

//     await client.query("BEGIN");

//     // 🔒 Lock user wallet
//     const user = await client.query(
//       "SELECT wallet FROM user WHERE id=$1 FOR UPDATE",
//       [userId]
//     );

//     let walletBalance = parseFloat(user.rows[0].wallet);

//     let totalDeduct = 0;
//     let bidInserts = [];

//     for (let bid of bids) {

//       const commissionRow = await client.query(
//         "SELECT commission_percent FROM commission_settings WHERE bid_type=$1",
//         [bid.bid_type]
//       );

//       const commissionPercent = commissionRow.rows.length
//         ? parseFloat(commissionRow.rows[0].commission_percent)
//         : 0;

//       const commissionAmount = (bid.amount * commissionPercent) / 100;
//       const netAmount = bid.amount - commissionAmount;

//       totalDeduct += parseFloat(bid.amount);

//       bidInserts.push({
//         bid_type: bid.bid_type,
//         bid_number: bid.bid_number,
//         amount: bid.amount,
//         commission: commissionAmount,
//         net_amount: netAmount
//       });
//     }

//     // 💰 Check sufficient balance
//     if (walletBalance < totalDeduct) {
//       await client.query("ROLLBACK");
//       return res.json({
//         status: false,
//         message: "Insufficient Wallet Balance"
//       });
//     }

//     const beforeBalance = walletBalance;
//     const afterBalance = walletBalance - totalDeduct;

//     // Update wallet
//     await client.query(
//       "UPDATE user SET wallet=$1 WHERE id=$2",
//       [afterBalance, userId]
//     );

//     // Insert all bids
//     for (let bid of bidInserts) {
//       await client.query(
//         `INSERT INTO bids
//          (user_id,game_id,bid_type,bid_number,amount,commission,net_amount)
//          VALUES($1,$2,$3,$4,$5,$6,$7)`,
//         [
//           userId,
//           game_id,
//           bid.bid_type,
//           bid.bid_number,
//           bid.amount,
//           bid.commission,
//           bid.net_amount
//         ]
//       );
//     }

//     // Insert wallet transaction
//     await client.query(
//       `INSERT INTO wallet_transaction
//        (user_id,type,amount,before_balance,after_balance,remark)
//        VALUES($1,'debit',$2,$3,$4,$5)`,
//       [userId, totalDeduct, beforeBalance, afterBalance, "Bid Placed"]
//     );

//     await client.query("COMMIT");

//     res.json({
//       status: true,
//       message: "Bid Placed Successfully",
//       deducted: totalDeduct,
//       balance: afterBalance
//     });

//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error(err);
//     res.json({
//       status: false,
//       message: "Bid Transaction Failed"
//     });
//   } finally {
//     client.release();
//   }
// };



exports.placedBid = async (req, res) => {

   const client = await pool.connect();

   try {

      const userId = req.user?.id;

      let data = req.body?.data || req.body;

      if (!userId) {
         return res.status(401).json({
            status: false,
            message: "Unauthorized"
         });
      }

      if (data == '') {
         data = req.body;
      }

      if (typeof data === "string") {
         data = JSON.parse(data);
      }

      if (!Array.isArray(data) || data.length === 0) {
         return res.json({
            status: false,
            message: "Invalid Bid Data"
         });
      }

      if (data.length > 50) {
         return res.json({
            status: false,
            message: "Too Many Bids At Once"
         });
      }

      await client.query("BEGIN");

      const rateRes = await client.query(
         "SELECT * FROM game_rate WHERE id = 1"
      );

      if (!rateRes.rows.length) {

         await client.query("ROLLBACK");

         return res.json({
            status: false,
            message: "Game Rate Not Found"
         });
      }

      const rate = rateRes.rows[0];

      const singleDigit = rate.single_digit2 / rate.single_digit1;
      const jodiDigit = rate.jodi_digit2 / rate.jodi_digit1;
      const singlePana = rate.single_pana2 / rate.single_pana1;
      const doublePana = rate.double_pana2 / rate.double_pana1;
      const tripplePana = rate.tripple_pana2 / rate.tripple_pana1;
      const halfSangam = rate.half_sangam2 / rate.half_sangam1;
      const fullSangam = rate.full_sangam2 / rate.full_sangam1;

      for (const val of data) {

         if (!val.str_gameid || !val.tv_pointsvalue || !val.str_tool) {

            await client.query("ROLLBACK");

            return res.json({
               status: false,
               message: "Invalid Bid Object"
            });
         }

         const gameId = val.str_gameid;
         const points = Number(val.tv_pointsvalue);

         if (isNaN(points) || points <= 0) {

            await client.query("ROLLBACK");

            return res.json({
               status: false,
               message: "Invalid Points Value"
            });
         }

         const gameRes = await client.query(
            "SELECT id, name FROM game WHERE id = $1",
            [gameId]
         );

         if (!gameRes.rows.length) {

            await client.query("ROLLBACK");

            return res.json({
               status: false,
               message: "Invalid Game"
            });
         }

         const game = gameRes.rows[0];

         let gameType = val.str_tool.replace("Bulk", "").trim();

         let session = val.session || "";

         const value = (val.value !== undefined && val.value !== null) ? String(val.value) : "";

         // ─────────────────────────────────────────────────────────────────
         // Session Resolution (Document Section 1 & 3)
         //
         // Group B (Jodi/Sangam) → always force "Close" (handled below)
         // Group A (Single/Pana/Motor):
         //   Case 1: User ne session pass nahi kiya
         //           → active_session se auto-fill karo
         //   Case 2: User ne session pass kiya + active_session se match
         //           → allow
         //   Case 3: User ne session pass kiya + active_session se mismatch
         //           → reject with descriptive alert message
         //   Case 4: Market fully closed → reject bid
         // ─────────────────────────────────────────────────────────────────
         const GROUP_B_TYPES = ["Jodi Digit", "Red Brackets", "Two Digits Panel", "Group Jodi"];
         const isGroupB = GROUP_B_TYPES.includes(gameType);

         if (!isGroupB) {
            // Resolve live active session from DB + IST time
            const { active_session, session_adjusted } = await resolveActiveSession(gameId);

            // Case 4: Market fully closed → no bidding at all
            if (active_session === "closed") {
               await client.query("ROLLBACK");
               return res.json({
                  status: false,
                  message: "Market is closed. Bidding is not allowed at this time."
               });
            }

            // Canonical session label matching active_session
            const expectedSession = active_session === "open" ? "Open" : "Close";

            const userSentSession = val.session ? String(val.session).trim() : "";

            if (!userSentSession) {
               // Case 1: Session not provided → auto-fill with current active session
               session = expectedSession;
               val._session_adjusted = session_adjusted;

            } else if (userSentSession.toLowerCase() === expectedSession.toLowerCase()) {
               // Case 2: User session matches active session → proceed normally
               session = expectedSession;
               val._session_adjusted = false;

            } else if (
               active_session === "open" &&
               userSentSession.toLowerCase() === "close"
            ) {
               // Case 3: active_session = "open" (open time nahi aayi)
               // → Close bhi allow karo kyunki open time se pehle dono valid hain
               session = "Close";
               val._session_adjusted = false;

            } else {
               // Case 4: active_session = "close" but user ne "Open" bheja → reject
               await client.query("ROLLBACK");
               return res.json({
                  status: false,
                  session_mismatch: true,
                  active_session: expectedSession,
                  sent_session:   userSentSession,
                  message: `Only ${expectedSession} session is available now.`
               });
            }
         }

         let winAmount = 0;

         if (["Single Digit", "Odd Even"].includes(gameType)) {
            winAmount = points * singleDigit;
         }
         else if (isGroupB) {
            winAmount = points * jodiDigit;
            session = "Close";   // Group B always Close (Document Section 1)
         }
         else if (gameType === "Single Pana" || gameType === "SP Pana" || gameType === "SP Motor") {
            winAmount = points * singlePana;
         }
         else if (gameType === "Double Pana" || gameType === "DP Pana") {
            winAmount = points * doublePana;
         }
         else if (gameType === "Tripple Pana" || gameType === "TP Pana") {
            winAmount = points * tripplePana;
         }
         else if (gameType === "Half Sangam") {
            winAmount = points * halfSangam;
         }
         else if (gameType === "Full Sangam") {
            winAmount = points * fullSangam;
         }
         else {

            await client.query("ROLLBACK");

            return res.json({
               status: false,
               message: "Invalid Game Type"
            });
         }

         winAmount = Math.round(winAmount);

         const walletRes = await client.query(
            `SELECT txn_clbal
             FROM wallet
             WHERE user_id = $1
             ORDER BY id DESC
             LIMIT 1
             FOR UPDATE`,
            [userId]
         );

         const currentBalance =
            walletRes.rows.length > 0
               ? Number(walletRes.rows[0].txn_clbal)
               : 0;

         if (currentBalance < points) {

            await client.query("ROLLBACK");

            return res.json({
               status: false,
               message: "Insufficient Wallet Balance"
            });
         }

         const newBalance = currentBalance - points;

         const bidTxnId = Math.floor(Math.random() * 99999999);

         const walletTxnId = Math.floor(Math.random() * 99999999);

         await client.query(
            `INSERT INTO user_bid
            (user_id, bid_txn_id, game_date, session, pana,
            game_type, new_game_type, game_id,
            points, win_amount, date)
            VALUES (
               $1, $2,
               CURRENT_DATE,
               $3, $4,
               $5, $5,
               $6,
               $7, $8,
               NOW()
            )`,
            [
               userId,
               bidTxnId,
               session,
               value,
               gameType,
               gameId,
               points,
               winAmount
            ]
         );

         await client.query(
            `INSERT INTO wallet
            (user_id, txn_opbal, txn_crdt, txn_dbdt,
            txn_clbal, txn_comment,
            txn_date, transfer_user_id, transaction_id)
            VALUES (
               $1, $2, 0, $3,
               $4, $5,
               NOW(), $6, $7
            )`,
            [
               userId,
               currentBalance,
               points,
               newBalance,
               `Bid Placed (${game.name} - ${gameType})`,
               userId,
               walletTxnId
            ]
         );
      }

      await client.query("COMMIT");

      // Check if any bid had its session auto-adjusted (Open → Close)
      const anyAdjusted = data.some((v) => v._session_adjusted === true);

      return res.json({
         status: true,
         message: "Bid Placed Success",
         session_adjusted: anyAdjusted,   // true = Open was auto-converted to Close
      });

   } catch (error) {

      await client.query("ROLLBACK");

      console.error(error);

      return res.json({
         status: false,
         message: error.message || "Network Problem"
      });

   } finally {

      client.release();
   }
};



/*

exports.placedBidOld2025= async (req, res) => {

    const client = await pool.connect();

    const userId = req.user?.id;


    // let { data } = req.body || {};
    let data = req.body?.data || req.body;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    // console.log(data);
    // if (typeof data === "string") {
    //   data = JSON.parse(data);
    // }

    // if (!Array.isArray(data) || data.length === 0) {
    //   return res.json({
    //     status: false,
    //     message: "Invalid Bid Data"
    //   });
    // }

    if(data==''){
       data = req.body;
    }
    

    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    // console.log(data);

    if (!Array.isArray(data) || data.length === 0) {
      return res.json({
        status: false,
        message: "Invalid Bid Data"
      });
    }

    // console.log("Step 1");

    if (data.length > 50) {
      return res.json({
        status: false,
        message: "Too Many Bids At Once"
      });
    }

    await client.query("BEGIN");

    const rateRes = await client.query(
      "SELECT * FROM game_rate WHERE id = 1"
    );

    if (!rateRes.rows.length) {
      // throw new Error("Game Rate Not Found");
      return res.json({
        status: false,
        message: "Game Rate Not Found"
      });
    }

    // console.log("Step 2");

    const rate = rateRes.rows[0];

    const singleDigit = rate.single_digit2 / rate.single_digit1;
    const jodiDigit = rate.jodi_digit2 / rate.jodi_digit1;
    const singlePana = rate.single_pana2 / rate.single_pana1;
    const doublePana = rate.double_pana2 / rate.double_pana1;
    const tripplePana = rate.tripple_pana2 / rate.tripple_pana1;
    const halfSangam = rate.half_sangam2 / rate.half_sangam1;
    const fullSangam = rate.full_sangam2 / rate.full_sangam1;

    // console.log(rate);


    for (const val of data) {

      // 🔹 Field Validation
      if (!val.str_gameid || !val.tv_pointsvalue || !val.str_tool) {
        // throw new Error("Invalid Bid Object");
         return res.json({
          status: false,
          message: "Invalid Bid Object"
        });
      }

      const gameId = val.str_gameid;
      const points = Number(val.tv_pointsvalue);

      if (isNaN(points) || points <= 0) {
        // throw new Error("Invalid Points Value");
          return res.json({
            status: false,
            message: "Invalid Points Value"
          });
      }

      // 🔹 Validate Game
      const gameRes = await client.query(
        "SELECT id, name, commission FROM game WHERE id = $1",
        [gameId]
      );

      if (!gameRes.rows.length) {
        // throw new Error("Invalid Game");
        return res.json({
            status: false,
            message: "Invalid Game"
          });
      }

      const game = gameRes.rows[0];

      let gameType = val.str_tool.replace("Bulk", "").trim();
      let session = val.session || "";
      const value = val.value || "";

      let winAmount = 0;

      // console.log(gameType);


      if (["Single Digit", "Odd Even"].includes(gameType)) {
        winAmount = points * singleDigit;
      } 
      else if (
        ["Jodi Digit", "Red Brackets", "Two Digits Panel", "Group Jodi"]
          .includes(gameType)
      ) {
        winAmount = points * jodiDigit;
        session = "Close";
      } 
      else if (gameType === "Single Pana" || gameType==="SP Pana") {
        winAmount = points * singlePana;
      } 
      else if (gameType === "Double Pana" || gameType==="DP Pana") {
        winAmount = points * doublePana;
      } 
      else if (gameType === "Tripple Pana" || gameType==="TP Pana") {
        winAmount = points * tripplePana;
      } 
      else if (gameType === "Half Sangam") {
        winAmount = points * halfSangam;
      } 
      else if (gameType === "Full Sangam") {
        winAmount = points * fullSangam;
      } 
       else if (gameType === "SP Motor") {
        winAmount = points * singlePana;
      } 
       else if (gameType === "DP Motor") {
        winAmount = points * doublePana;
      } 
      else {
        // throw new Error("Invalid Game Type");
        return res.json({
            status: false,
            message: "Invalid Game Type"
          });
      }


      winAmount = Math.round(winAmount);

      // 🔹 Lock Wallet Row (Very Important)
      const walletRes = await client.query(
        `SELECT txn_clbal 
         FROM wallet 
         WHERE user_id = $1 
         ORDER BY id DESC 
         LIMIT 1 
         FOR UPDATE`,
        [userId]
      );

      const currentBalance =
        walletRes.rows.length > 0
          ? Number(walletRes.rows[0].txn_clbal)
          : 0;

      if (currentBalance < points) {
        // throw new Error("Insufficient Wallet Balance");
        return res.json({
            status: false,
            message: "Insufficient Wallet Balance"
          });
      }

      const newBalance = currentBalance - points;

      const bidTxnId = Math.floor(Math.random() * 99999999);
      const walletTxnId = Math.floor(Math.random() * 99999999);

      // 🔹 Insert Bid
      await client.query(
        `INSERT INTO user_bid
         (user_id, bid_txn_id, game_date, session, pana,
          game_type, new_game_type, game_id,
          points, win_amount, date)
         VALUES (
           $1, $2,
           TO_CHAR(NOW(),'DD Mon YYYY'),
           $3, $4,
           $5, $5,
           $6,
           $7, $8,
           NOW()
         )`,
        [
          userId,
          bidTxnId,
          session,
          value,
          gameType,
          gameId,
          points,
          winAmount
        ]
      );

      // 🔹 Debit Wallet
      await client.query(
        `INSERT INTO wallet
        (user_id, txn_opbal, txn_crdt, txn_dbdt,
          txn_clbal, txn_comment,
          txn_date, transfer_user_id, transaction_id)
        VALUES (
          $1, $2, 0, $3,
          $4, $5,
          NOW(), $6, $7
        )`,
        [
          userId,
          currentBalance,
          points,
          newBalance,
          `Bid Placed (${game.name} - ${gameType})`,
          userId,
          walletTxnId
        ]
      );
    }

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Bid Placed Success"
    });

   

}

















exports.placedBidOLD= async (req, res) => {

   
  
  const client = await pool.connect();

  // try {
    const userId = req.user?.id;
    const { data } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }


    console.log(data);

    if (typeof data === "string") {
      data = JSON.parse(data);
    }

    if (!Array.isArray(data) || data.length === 0) {
      return res.json({
        status: false,
        message: "Invalid Bid Data"
      });
    }

    console.log("Step 1");


    if (data.length > 50) {
      return res.json({
        status: false,
        message: "Too Many Bids At Once"
      });
    }


    await client.query("BEGIN");

    // 🔹 Get Game Rates
    const rateRes = await client.query(
      "SELECT * FROM game_rate WHERE id = 1"
    );

    if (!rateRes.rows.length) {
      throw new Error("Game Rate Not Found");
    }

    console.log("Step 2");

    
    const rate = rateRes.rows[0];

    const singleDigit = rate.single_digit2 / rate.single_digit1;
    const jodiDigit = rate.jodi_digit2 / rate.jodi_digit1;
    const singlePana = rate.single_pana2 / rate.single_pana1;
    const doublePana = rate.double_pana2 / rate.double_pana1;
    const tripplePana = rate.tripple_pana2 / rate.tripple_pana1;
    const halfSangam = rate.half_sangam2 / rate.half_sangam1;
    const fullSangam = rate.full_sangam2 / rate.full_sangam1;

    console.log(rate);


    for (const val of data) {

      // 🔹 Field Validation
      if (!val.str_gameid || !val.tv_pointsvalue || !val.str_tool) {
        throw new Error("Invalid Bid Object");
      }

      const gameId = val.str_gameid;
      const points = Number(val.tv_pointsvalue);

      if (isNaN(points) || points <= 0) {
        throw new Error("Invalid Points Value");
      }

      // 🔹 Validate Game
      const gameRes = await client.query(
        "SELECT id, name, commission FROM game WHERE id = $1",
        [gameId]
      );

      if (!gameRes.rows.length) {
        throw new Error("Invalid Game");
      }

      const game = gameRes.rows[0];

      let gameType = val.str_tool.replace("Bulk", "").trim();
      let session = val.session || "";
      const value = val.value || "";

      let winAmount = 0;

      // 🔹 Win Calculation
      if (["Single Digit", "Odd Even"].includes(gameType)) {
        winAmount = points * singleDigit;
      } 
      else if (
        ["Jodi Digit", "Red Brackets", "Two Digits Panel", "Group Jodi"]
          .includes(gameType)
      ) {
        winAmount = points * jodiDigit;
        session = "Close";
      } 
      else if (gameType === "Single Pana") {
        winAmount = points * singlePana;
      } 
      else if (gameType === "Double Pana") {
        winAmount = points * doublePana;
      } 
      else if (gameType === "Tripple Pana") {
        winAmount = points * tripplePana;
      } 
      else if (gameType === "Half Sangam") {
        winAmount = points * halfSangam;
      } 
      else if (gameType === "Full Sangam") {
        winAmount = points * fullSangam;
      } 
      else {
        throw new Error("Invalid Game Type");
      }

      winAmount = Math.round(winAmount);

      // 🔹 Lock Wallet Row (Very Important)
      const walletRes = await client.query(
        `SELECT txn_clbal 
         FROM wallet 
         WHERE user_id = $1 
         ORDER BY id DESC 
         LIMIT 1 
         FOR UPDATE`,
        [userId]
      );

      const currentBalance =
        walletRes.rows.length > 0
          ? Number(walletRes.rows[0].txn_clbal)
          : 0;

      if (currentBalance < points) {
        throw new Error("Insufficient Wallet Balance");
      }

      const newBalance = currentBalance - points;

      const bidTxnId = Math.floor(Math.random() * 99999999);
      const walletTxnId = Math.floor(Math.random() * 99999999);

      // 🔹 Insert Bid
      await client.query(
        `INSERT INTO user_bid
         (user_id, bid_txn_id, game_date, session, pana,
          game_type, new_game_type, game_id,
          points, win_amount, date)
         VALUES (
           $1, $2,
           TO_CHAR(NOW(),'DD Mon YYYY'),
           $3, $4,
           $5, $5,
           $6,
           $7, $8,
           NOW()
         )`,
        [
          userId,
          bidTxnId,
          session,
          value,
          gameType,
          gameId,
          points,
          winAmount
        ]
      );

      // 🔹 Debit Wallet
      await client.query(
        `INSERT INTO wallet
         (user_id, txn_opbal, txn_crdt, txn_dbdt,
          txn_clbal, txn_comment,
          txn_date, transfer_user_id, transaction_id)
         VALUES (
           $1, $2, 0, $3,
           $4, $5,
           NOW(), $1, $6
         )`,
        [
          userId,
          currentBalance,
          points,
          newBalance,
          `Bid Placed (${game.name} - ${gameType})`,
          walletTxnId
        ]
      );
    }

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Bid Placed Success"
    });
    

  // } catch (error) {

  //   await client.query("ROLLBACK");

  //   console.error(error);

  //   return res.json({
  //     status: false,
  //     message: error.message || "Network Problem"
  //   });

  // } finally {
  //   client.release();
  // }

};



*/





exports.jackpotBidHistory = async (req, res) => {
  try {

    // 🔐 Token check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    const { from, to, page = 1, limit = 10 } = req.body;

    const offset = (page - 1) * limit;

    let whereClause = "WHERE jb.user_id = $1";
    let values = [user_id];
    let paramIndex = 2;

    // 📅 Optional date filter
    if (from && to) {
      whereClause += ` AND jb.game_date >= $${paramIndex} AND jb.game_date <= $${paramIndex + 1}`;
      values.push(from, to);
      paramIndex += 2;
    }

    // 🔢 Total count for pagination
    const countQuery = await dbQuery(
      `SELECT COUNT(*) FROM jackpot_bid jb ${whereClause}`,
      values
    );

    const totalRecords = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // 📄 Main data query — JOIN jackpot table to get game name
    const dataQuery = await dbQuery(
      `SELECT 
          jb.*,
          COALESCE(j.name, 'Unknown') AS game_name
       FROM jackpot_bid jb
       LEFT JOIN jackpot j ON j.id = jb.game_id
       ${whereClause}
       ORDER BY jb.id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    if (dataQuery.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No bid history found",
        data: []
      });
    }

    return res.json({
      status: true,
      message: "Jackpot bid history found",
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_records: totalRecords,
        total_pages: totalPages
      },
      data: dataQuery.rows
    });

  } catch (error) {
    console.error("Jackpot Bid History Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};

