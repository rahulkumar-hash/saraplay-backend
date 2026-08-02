const dbQuery = require("../../utils/dbQuery");

exports.autoResultDeclare = async (req, res) => {
  try {
    const data = req.body;

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
      return res.json({ res: 'error', msg: 'Required fields missing' });
    }

    const rdate = new Date(aankdo_date).toDateString();

    // 🔍 Get Game ID
    const gameRes = await dbQuery(`SELECT id, name FROM game`);
    let game_id = null;

    gameRes.rows.forEach(g => {
      if (g.name.toLowerCase().trim() === market_name.toLowerCase().trim()) {
        game_id = g.id;
      }
    });

    if (!game_id) {
      return res.json({ res: 'error', msg: 'Market not found' });
    }

    // 🔍 Check existing result
    const checkRes = await dbQuery(
      `SELECT * FROM declear_result WHERE result_date=$1 AND game_id=$2 ORDER BY id DESC LIMIT 1`,
      [rdate, game_id]
    );

    const check = checkRes.rows[0];

    // ================= OPEN =================
    if (aankdo_open && !aankdo_close) {

      if (check && check.open_declare_date) {
        return res.json({ res: 'error', msg: 'Open result already declared' });
      }

      if (check) {
        await dbQuery(`
          UPDATE declear_result 
          SET open_pana=$1, open_digit=$2, open_declare_date=NOW(), open_result='Declared'
          WHERE result_date=$3 AND game_id=$4
        `, [aankdo_open, figure_open, rdate, game_id]);
      } else {
        await dbQuery(`
          INSERT INTO declear_result 
          (result_date, game_id, open_pana, open_digit, open_declare_date, open_result)
          VALUES ($1,$2,$3,$4,NOW(),'Declared')
        `, [rdate, game_id, aankdo_open, figure_open]);
      }

      // 🔍 Fetch Open Bets
      const bids = await dbQuery(`
        SELECT * FROM user_bid 
        WHERE game_date=$1 AND session='Open' AND game_id=$2
      `, [rdate, game_id]);

      for (let v of bids.rows) {
        let won = false;

        if (v.game_type === 'Single Digit' && v.pana == figure_open) {
          won = true;
        }

        if (v.game_type === 'Single Pana' && v.pana == aankdo_open) {
          won = true;
        }

        if (won) {
          await creditWinning(v, game_id);
        } else {
          await creditCommissionIfAny(v);
        }
      }

      return res.json({ res: 'success', msg: 'Open Result Declared' });
    }

    // ================= CLOSE =================
    if (aankdo_close) {

      if (!check || !check.open_declare_date) {
        return res.json({ res: 'error', msg: 'Declare Open Result First' });
      }

      if (check.close_declare_date) {
        return res.json({ res: 'error', msg: 'Close already declared' });
      }

      await dbQuery(`
        UPDATE declear_result 
        SET close_pana=$1, close_digit=$2, jodi_digit=$3, close_declare_date=NOW()
        WHERE result_date=$4 AND game_id=$5
      `, [aankdo_close, figure_close, jodi, rdate, game_id]);

      const bids = await dbQuery(`
        SELECT * FROM user_bid WHERE game_date=$1 AND game_id=$2
      `, [rdate, game_id]);

      for (let v of bids.rows) {
        let won = false;

        if (v.game_type === 'Jodi Digit' && v.pana == jodi) {
          won = true;
        }

        if (v.game_type === 'Single Digit' && v.session === 'Close' && v.pana == figure_close) {
          won = true;
        }

        if (won) {
          await creditWinning(v, game_id);
        } else {
          await creditCommissionIfAny(v);
        }
      }

      return res.json({ res: 'success', msg: 'Close Result Declared' });
    }

  } catch (err) {
    console.error(err);
    return res.json({ res: 'error', msg: 'Internal Server Error' });
  }
};







async function creditWinning(bid, game_id) {
  const txn_id = Math.floor(Math.random() * 99999999);

  const walletRes = await dbQuery(
    `SELECT * FROM wallet WHERE user_id=$1 ORDER BY id DESC LIMIT 1`,
    [bid.user_id]
  );

  const closing = walletRes.rows.length ? walletRes.rows[0].txn_clbal : 0;
  const total = closing + bid.win_amount;

  await dbQuery(`
    INSERT INTO wallet 
    (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, transaction_id)
    VALUES ($1,$2,$3,0,$4,$5)
  `, [bid.user_id, closing, bid.win_amount, total, txn_id]);

  await dbQuery(`
    INSERT INTO win_history 
    (user_id, game_id, game_type, session, game_date, txn_id, pana, points, amount)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [
    bid.user_id,
    game_id,
    bid.game_type,
    bid.session,
    bid.game_date,
    txn_id,
    bid.pana,
    bid.points,
    bid.win_amount
  ]);
}


async function creditCommissionIfAny(bid) { 
  const userRes = await dbQuery(
    `SELECT * FROM user WHERE id=$1`,
    [bid.user_id]
  );

  if (userRes.rows.length && userRes.rows[0].refer_by) {
    const ref = await dbQuery(
      `SELECT * FROM user WHERE refer_id=$1`,
      [userRes.rows[0].refer_by]
    );

    if (ref.rows.length) {
      const commission = bid.points * 0.05;

      await dbQuery(`
        INSERT INTO wallet 
        (user_id, txn_crdt)
        VALUES ($1,$2)
      `, [ref.rows[0].id, commission]);
    }
  }
}