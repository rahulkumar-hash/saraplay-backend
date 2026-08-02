const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  res.render("bidRevert/index", {
    title: "Bid Revert",
    layout: "layouts/admin",
    csrfToken: req.csrfToken(),
    admin: req.session.admin
  });
};

/* =========================
   SEARCH BIDS (AJAX)
========================= */
exports.search = async (req, res) => {
  try {
    const { result_date, game } = req.body;

    // convert yyyy-mm-dd -> d M Y
    const d = new Date(result_date);
    const rdate = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).replace(/ /g, " ");

    const bids = await dbQuery(`
      SELECT 
        ub.*,
        u.name,
        u.mobile
      FROM user_bid ub
      JOIN "users" u ON u.id = ub.user_id
      WHERE ub.game_date = $1
        AND ub.game_id = $2
      ORDER BY ub.id DESC
    `, [rdate, game]);

    res.json({ status: true, data: bids.rows });

  } catch (err) {
    console.error("BidRevert search error:", err);
    res.json({ status: false, data: [] });
  }
};

/* =========================
   REFUND ALL BIDS
========================= */
exports.refund = async (req, res) => {
  const client = await pool.connect();

  try {
    const { game_id, game_date } = req.body;
    const now = new Date().toLocaleString("en-IN");

    await client.query("BEGIN");

    const game = await client.query(
      `SELECT name FROM game WHERE id=$1`,
      [game_id]
    );

    const bids = await client.query(`
      SELECT * FROM user_bid
      WHERE game_id=$1 AND game_date=$2
    `, [game_id, game_date]);

    for (const v of bids.rows) {

      const txn_id = Math.floor(Math.random() * 90000000) + 10000000;
      const comment = `Refund Bid of ${game.rows[0].name} in ${v.game_type} (Session - ${v.session})`;

      const wallet = await client.query(`
        SELECT txn_clbal
        FROM wallet
        WHERE user_id=$1 AND role!='Master'
        ORDER BY id DESC
        LIMIT 1
      `, [v.user_id]);

      const opening = wallet.rows.length ? wallet.rows[0].txn_clbal : 0;
      const closing = opening + v.points;

      await client.query(`
        INSERT INTO wallet
        (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal,
         txn_comment, txn_date, transfer_user_id, transaction_id, txn_type)
        VALUES ($1,$2,$3,0,$4,$5,$6,'Admin',$7,'Bid Refund')
      `, [
        v.user_id,
        opening,
        v.points,
        closing,
        comment,
        now,
        txn_id
      ]);
    }

    await client.query(`
      DELETE FROM user_bid
      WHERE game_id=$1 AND game_date=$2
    `, [game_id, game_date]);

    await client.query("COMMIT");

    res.json({ status: "success", msg: "Refund completed successfully" });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Bid refund error:", err);
    res.json({ status: "error", msg: "Refund failed" });
  } finally {
    client.release();
  }
};
