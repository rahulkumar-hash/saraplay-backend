const pool = require("../../config/db");
const dbQuery = require("../../utils/dbQuery");

const {
  sendSingleNotification,
  sendBulkNotificationNew,
  sendAll,
  sendResultBroadcastNotification
} = require("../../utils/sendNotification");
const moment = require("moment");


function normalizeVal(val) {
  return val ? String(val).trim() : "";
}

function parseInput(body) {
  try {
    if (typeof body === "object") return body;

    const decoded = Buffer.from(body, "base64").toString("utf-8");

    try {
      return JSON.parse(decoded);
    } catch {
      return JSON.parse(body);
    }
  } catch {
    return null;
  }
}


async function sendBulkNotifications(tokens, title, body) {

  try {

    const chunkSize = 500;

    for (let i = 0; i < tokens.length; i += chunkSize) {

      const chunk = tokens.slice(i, i + chunkSize);

      await sendBulkNotificationNew(
        chunk,
        title,
        body
      );

      console.log(
        `Notification Batch ${i / chunkSize + 1} Sent`
      );

    }

  } catch (err) {

    console.log(
      "Bulk Notification Error:",
      err
    );

  }
}







async function creditWinning(client, bid, result) {

  try {

      const txn_id = Math.floor(Math.random() * 99999999);

      const user_id = bid.user_id;

      // console.log("UserID="+ user_id);
        
      const amount = Number(
        bid.win_amount || bid.amount * (bid.multiplier || 2)
      );

      const now = moment().format("DD MMM YYYY hh:mm:ss A");

      // duplicate check
      const already = await client.query(`
        SELECT id FROM win_history 
        WHERE user_id=$1 
        AND game_id=$2 
        AND game_date=$3 
        AND pana=$4
      `, [
        bid.user_id,
        result.game_id,
        result.result_date,
        bid.pana
      ]);

      // console.log(already.rows);

      if (already.rows.length) {
        return;
      }

      // wallet last balance
      const last = await client.query(`
        SELECT *
        FROM wallet
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT 1
      `, [user_id]);

      let opening = 0;
      let closing = amount;

      if (last.rows.length) {
        opening = Number(last.rows[0].txn_clbal) || 0;
        closing = opening + amount;
      }

      // wallet insert
      await client.query(`
        INSERT INTO wallet
        (
          user_id,
          txn_opbal,
          txn_crdt,
          txn_dbdt,
          txn_clbal,
          txn_comment,
          txn_date,
          transfer_user_id,
          transaction_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        user_id,
        opening,
        amount,
        0,
        closing,
        "Winning Amount",
        now,
        "Admin",
        txn_id
      ]);

      // win history
      await client.query(`
        INSERT INTO win_history
        (
          user_id,
          game_id,
          game_type,
          session,
          game_date,
          txn_id,
          pana,
          points,
          amount,
          date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        bid.user_id,
        result.game_id,
        bid.game_type,
        bid.session,
        result.result_date,
        txn_id,
        bid.pana,
        bid.points,
        amount,
        moment().format("DD MMM YYYY")
      ]);


      // ✅ Fetch fcm_token + win notification preference
      const userRes = await client.query(`
          SELECT fcm_token, notif_win
          FROM users
          WHERE id=$1
          LIMIT 1
        `, [user_id]);

        if (
          userRes.rows.length &&
          userRes.rows[0].fcm_token &&
          Number(userRes.rows[0].notif_win) === 1
        ) {
          // notif_win = 1 (ON) → return token for bulk win notification
          return userRes.rows[0].fcm_token;
        }

        return null;

      // const userRes = await client.query(`
      //   SELECT
      //     name,
      //     fcm_token
      //   FROM users
      //   WHERE id=$1
      //   LIMIT 1
      // `, [user_id]);

      // if (
      //   userRes.rows.length &&
      //   userRes.rows[0].fcm_token
      // ) {

      //   const userName = userRes.rows[0].name || "User";

      //   await sendSingleNotification(
      //     userRes.rows[0].fcm_token,
      //     "🎉 Winning Amount Credited",
      //     `Hi ${userName}, ₹${amount} winning amount credited successfully`
      //   );

      // }

  } catch (err) {

    console.log("creditWinning Error:", err);

  }
}


async function creditWinningOLD2025(client, bid, result) {

  // await client.query("BEGIN");

  try {
      const txn_id = Math.floor(Math.random() * 99999999);

      const user_id = bid.user_id;
      // const amount = Number(bid.win_amount); // same as working function

      const amount = Number(bid.win_amount || bid.amount * (bid.multiplier || 2));

      const now = moment().format("DD MMM YYYY hh:mm:ss A");



      const already = await client.query(`
        SELECT id FROM win_history 
        WHERE user_id=$1 AND game_id=$2 AND game_date=$3 AND pana=$4
      `, [bid.user_id, result.game_id, result.result_date, bid.pana]);

      if (already.rows.length) {
        return; // skip duplicate
      }






      // 🔍 Last wallet entry
      const last = await client.query(`
        SELECT * FROM wallet
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT 1
      `, [user_id]);

      let opening = 0;
      let closing = amount;

      if (last.rows.length) {
        opening = Number(last.rows[0].txn_clbal) || 0;
        closing = opening + amount;
      }

      console.log("Closing Balance:", closing);

      // 💰 Wallet insert (proper ledger)
      await client.query(`
        INSERT INTO wallet
        (
          user_id,
          txn_opbal,
          txn_crdt,
          txn_dbdt,
          txn_clbal,
          txn_comment,
          txn_date,
          transfer_user_id,
          transaction_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [
        user_id,
        opening,
        amount,
        0,
        closing,
        "Winning Amount",
        now,
        "Admin",
        txn_id
      ]);

      // 🏆 Win history insert
      await client.query(`
        INSERT INTO win_history
        (
          user_id,
          game_id,
          game_type,
          session,
          game_date,
          txn_id,
          pana,
          points,
          amount,
          date
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      `, [
        bid.user_id,
        result.game_id,
        bid.game_type,
        bid.session,
        result.result_date,
        txn_id,
        bid.pana,
        bid.points,
        amount,
        moment().format("DD MMM YYYY")
      ]);

    // await client.query("COMMIT");

  } catch (err) {
    // await client.query("ROLLBACK");
    throw err;
  }
}







exports.autoResultDeclare = async (req, res) => {
  const client = await pool.connect();

  try {
    const rawBody = req.body;

    const data = parseInput(rawBody);

    if (!data) {
      return res.json({ res: "error", msg: "Invalid input" });
    }

    const {
      aankdo_open,
      figure_open,
      aankdo_close,
      figure_close,
      market_name,
      jodi,
      aankdo_date
    } = data;

    if (!market_name || !aankdo_date || aankdo_open === undefined) {
      return res.json({ res: "error", msg: "Required fields missing" });
    }

    // console.log(market_name);

    
    // ===== Date =====
    const now = new Date();
    const dateStr = now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const dateOnly = now.toLocaleDateString("en-IN");


    const existingData = await client.query(
      `SELECT id 
      FROM demo 
      WHERE res = $1 
      LIMIT 1`,
      [JSON.stringify(data)]
    );

    if (existingData.rows.length > 0) {
      console.log("⚠️ Same data already exists");

      return res.json({
        res: "success",
        msg: "Duplicate data skipped"
      });
    }
    
    

    await client.query(
        `INSERT INTO demo(time, res, send)
        VALUES($1, $2, $3)`,
        [dateStr, JSON.stringify(data), 0]
    );

    // console.log(market_name);
    // ===== Get Game =====
    const gameRes = await client.query(
      "SELECT * FROM game WHERE LOWER(TRIM(name)) = LOWER(TRIM($1))",
      [market_name]
    );

    // console.log(gameRes);
    if (gameRes.rows.length === 0) {
      return res.json({ res: "error", msg: "Market not found" });
    }

    const game_id = gameRes.rows[0].id;

    const rdate = new Date(aankdo_date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const checkRes = await client.query(
      "SELECT * FROM declear_result WHERE result_date=$1 AND game_id=$2 ORDER BY id DESC",
      [rdate, game_id]
    );

    const check = checkRes.rows;

    const resultType = aankdo_open && !aankdo_close ? "Open" : "Close";

    // console.log(resultType);
    const winnerTokens = [];
    // ================= OPEN =================
    if (resultType === "Open") {

      if (check.length && check[0].open_declare_date) {
        return res.json({ res: "error", msg: "Open already declared" });
      }

      if (check.length) {
        await client.query(
          `UPDATE declear_result 
           SET open_pana=$1, open_digit=$2, open_declare_date=$3, open_result='Declared'
           WHERE result_date=$4 AND game_id=$5`,
          [aankdo_open, figure_open, dateStr, rdate, game_id]
        );
      } else {
        await client.query(
          `INSERT INTO declear_result 
           (result_date, game_id, open_pana, open_digit, open_declare_date, open_result)
           VALUES ($1,$2,$3,$4,$5,'Declared')`,
          [rdate, game_id, aankdo_open, figure_open, dateStr]
        );
      }

      const openPana = normalizeVal(aankdo_open);
      const openDigit = normalizeVal(figure_open);

      const bidsRes = await client.query(
        "SELECT * FROM user_bid WHERE game_date=$1 AND session='Open' AND game_id=$2",
        [rdate, game_id]
      );

      // console.log(bidsRes);

      for (let bid of bidsRes.rows) {
        let won = false;
        const betPana = normalizeVal(bid.pana);
        const gType = String(bid.game_type || "").trim();

        if (gType === "Single Digit" || gType === "Single") {
          if (betPana === openDigit) won = true;
        } else if (gType === "Odd Even") {
          const num = parseInt(openDigit, 10);
          if (!isNaN(num)) {
            const isOdd = num % 2 !== 0;
            if ((betPana.toLowerCase() === "odd" && isOdd) || (betPana.toLowerCase() === "even" && !isOdd)) {
              won = true;
            }
          }
        } else if (
          gType === "Single Pana" ||
          gType === "SP Pana" ||
          gType === "SP Motor" ||
          gType === "SP" ||
          gType === "Single Pana Bulk" ||
          gType === "Single Panna"
        ) {
          if (betPana === openPana) won = true;
        } else if (
          gType === "Double Pana" ||
          gType === "DP Pana" ||
          gType === "DP Motor" ||
          gType === "DP" ||
          gType === "Double Panna Bulk" ||
          gType === "Double Panna"
        ) {
          if (betPana === openPana) won = true;
        } else if (
          gType === "Tripple Pana" ||
          gType === "TP Pana" ||
          gType === "TP" ||
          gType === "Triple Panna" ||
          gType === "Triple Pana"
        ) {
          if (betPana === openPana) won = true;
        }

        if (won) {
          const token = await creditWinning(client, bid, {
            game_id: game_id,
            result_date: rdate
          });

          if (token) {
            winnerTokens.push(token);
          }
        }
      }

      if (winnerTokens.length > 0) {
        await sendBulkNotifications(
          winnerTokens,
          "🎉 Winning Amount Credited",
          "Winning amount credited successfully"
        );
      }

      const game = await dbQuery(`
          SELECT name
          FROM game
          WHERE id = $1
      `, [
          game_id
      ]);

      const title =
      aankdo_open +
      "-" +
      figure_open +
      "*-***";

      const body =
      (game.rows[0]?.name || market_name)
      + " Result";

      console.log(
      "OPEN PUSH:",
      title,
      body
      );

      await sendResultBroadcastNotification(
        title,
        body
      );

      return res.json({ res: "success", msg: "Open Result Declared" });
    }
    
    // ================= CLOSE =================
    if (resultType === "Close") {

      if (!check.length || !check[0].open_declare_date) {
        return res.json({ res: "error", msg: "Declare Open First" });
      }

      if (check[0].close_declare_date) {
        return res.json({ res: "error", msg: "Close already declared" });
      }

      const closePana = normalizeVal(aankdo_close);
      const closeDigit = normalizeVal(figure_close);
      const jodiDigit = normalizeVal(jodi);

      await client.query(
        `UPDATE declear_result 
         SET close_pana=$1, close_digit=$2, jodi_digit=$3, close_declare_date=$4, close_result='Declared'
         WHERE result_date=$5 AND game_id=$6`,
        [closePana, closeDigit, jodiDigit, dateStr, rdate, game_id]
      );

      const bidsRes = await client.query(
        "SELECT * FROM user_bid WHERE game_date=$1 AND game_id=$2",
        [rdate, game_id]
      );

      // console.log(bidsRes);


      const openDigit = normalizeVal(check[0].open_digit);
      const openPana = normalizeVal(check[0].open_pana);

      const jodiResult = openDigit + closeDigit;
      const half1 = openDigit + closePana;
      const half2 = openPana + closeDigit;
      const full = openPana + closePana;

      
      // LOOP
      for (let bid of bidsRes.rows) {
        let won = false;
        const betPana = normalizeVal(bid.pana);
        const gType = String(bid.game_type || "").trim();
        const bSession = String(bid.session || "").trim();

        if (bSession === "Close") {
          if (gType === "Single Digit" || gType === "Single") {
            if (betPana === closeDigit) won = true;
          } else if (gType === "Odd Even") {
            const num = parseInt(closeDigit, 10);
            if (!isNaN(num)) {
              const isOdd = num % 2 !== 0;
              if ((betPana.toLowerCase() === "odd" && isOdd) || (betPana.toLowerCase() === "even" && !isOdd)) {
                won = true;
              }
            }
          } else if (
            gType === "Single Pana" ||
            gType === "SP Pana" ||
            gType === "SP Motor" ||
            gType === "SP" ||
            gType === "Single Pana Bulk" ||
            gType === "Single Panna"
          ) {
            if (betPana === closePana) won = true;
          } else if (
            gType === "Double Pana" ||
            gType === "DP Pana" ||
            gType === "DP Motor" ||
            gType === "DP" ||
            gType === "Double Panna Bulk" ||
            gType === "Double Panna"
          ) {
            if (betPana === closePana) won = true;
          } else if (
            gType === "Tripple Pana" ||
            gType === "TP Pana" ||
            gType === "TP" ||
            gType === "Triple Panna" ||
            gType === "Triple Pana"
          ) {
            if (betPana === closePana) won = true;
          }
        }

        if (
          gType === "Jodi Digit" ||
          gType === "Jodi" ||
          gType === "Red Brackets" ||
          gType === "Group Jodi" ||
          gType === "Two Digits Panel"
        ) {
          if (betPana === jodiResult) won = true;
        }

        if (gType === "Full Sangam") {
          if (betPana === full) won = true;
        }

        if (gType === "Half Sangam" || gType === "Half Sangam A" || gType === "Half Sangam B") {
          if (betPana === half1 || betPana === half2) won = true;
        }

        // CREDIT
        if (won) {
          const token = await creditWinning(client, bid, {
            game_id: game_id,
            result_date: rdate
          });

          if (token) {
            winnerTokens.push(token);
          }
        }
      }

      console.log("Winner Tokens:", winnerTokens.length);
      if (winnerTokens.length > 0) {
        await sendBulkNotifications(
          winnerTokens,
          "🎉 Winning Amount Credited",
          "Winning amount credited successfully"
        );
      }

      const game = await dbQuery(`
          SELECT name
          FROM game
          WHERE id = $1
      `, [
          game_id
      ]);

      const title =
      aankdo_open +
      "-" +
      figure_open +
      figure_close +
      "-" +
      aankdo_close;

      const body =
      (game.rows[0]?.name || market_name)
      + " Result";

      console.log(
      "CLOSE PUSH:",
      title,
      body
      );

      await sendResultBroadcastNotification(
        title,
        body
      );

      return res.json({ res: "success", msg: "Close Result Declared" });
    }

  

  } catch (err) {
    console.error(err);
    return res.json({ res: "error", msg: "Server Error" });
  } finally {
    client.release();
  }
};









