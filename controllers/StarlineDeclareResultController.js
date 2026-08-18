// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const moment = require("moment");
const {
  sendSingleNotification,
  sendAll,
  sendResultBroadcastNotification
} = require("../utils/sendNotification");
/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    res.render("starlineDeclareResult/index", {
      title: "Declare Result",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("StarlineDeclareResult index error:", err);
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
      SELECT DISTINCT ON (g.id) g.id, g.name, g.open_time, g.status
      FROM starline_game g
      LEFT JOIN starline_declear_result r
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

    res.json({ status: true, data: result.rows });
  } catch (err) {
    console.error("Starline getGamesForDeclare error:", err);
    res.json({ status: false, data: [] });
  }
};


/* =========================
   DATATABLE DATA
========================= */
exports.data = async (req, res) => {
  try {
    const { result_date, game_id } = req.body;

    let where = `WHERE 1=1`;
    let params = [];
    let i = 1;

    if (result_date && result_date.trim() !== "") {
      const d1 = moment(result_date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("YYYY-MM-DD");
      const d2 = moment(result_date, ["YYYY-MM-DD", "DD MMM YYYY"]).format("DD MMM YYYY");
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
        r.pana,
        r.digit,
        r.result_date,
        r.declare_date,
        COALESCE(g.name, 'Game #' || r.game_id::text) AS game_name
      FROM starline_declear_result r
      LEFT JOIN starline_game g ON g.id = r.game_id::integer
      ${where}
      ORDER BY r.id DESC
      LIMIT 500
    `, params);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("StarlineDeclareResult data error:", err);
    res.json({ status: false, data: [] });
  }
};


/* =========================
   GET DECLARE FORM
========================= */
exports.getDeclareGame = async (req, res) => {
  try {
    const { date, game_id } = req.body;

    if (!date || !game_id || isNaN(parseInt(game_id))) {
      return res.send("<div class='alert alert-warning'>Please select date &amp; game first.</div>");
    }

    const game = await dbQuery(
      `SELECT * FROM starline_game WHERE id=$1`,
      [parseInt(game_id)]
    );

    if (!game.rows.length) {
      return res.send("<div class='alert alert-danger'>Game not found.</div>");
    }

    const g = game.rows[0];

    // Check if result already saved
    const existing = await dbQuery(
      `SELECT * FROM starline_declear_result WHERE result_date=$1 AND game_id=$2 ORDER BY id DESC LIMIT 1`,
      [date, parseInt(game_id)]
    );

    const saved = existing.rows[0] || null;
    const savedPana  = saved ? (saved.pana  || "") : "";
    const savedDigit = saved ? (saved.digit || "") : "";
    const isDeclared = saved && saved.declare_date ? true : false;

    const pannas = [
      "000","100","110","111","112","113","114","115","116","117","118","119",
      "120","122","123","124","125","126","127","128","129","130","133","134",
      "135","136","137","138","139","140","144","145","146","147","148","149",
      "150","155","156","157","158","159","160","166","167","168","169","170",
      "177","178","179","180","188","189","190","199","200","211","220","222",
      "223","224","225","226","227","228","229","230","233","234","235","236",
      "237","238","239","240","244","245","246","247","248","249","250","255",
      "256","257","258","259","260","266","267","268","269","270","277","278",
      "279","280","288","289","290","299","300","330","333","334","335","336",
      "337","338","339","340","344","345","346","347","348","349","350","355",
      "356","357","358","359","360","366","367","368","369","370","377","378",
      "379","380","388","389","390","399","400","440","444","445","446","447",
      "448","449","450","455","456","457","458","459","460","466","467","468",
      "469","470","477","478","479","480","488","489","490","499","500","550",
      "555","556","557","558","559","560","566","567","568","569","570","577",
      "578","579","580","588","589","590","599","600","660","666","667","668",
      "669","670","677","678","679","680","688","689","690","699","700","770",
      "777","778","779","780","788","789","790","799","800","880","888","889",
      "890","899","900","990","999"
    ];

    let options = `<option value="" disabled ${!savedPana ? "selected" : ""}>Select Pana</option>`;
    pannas.forEach(p => {
      options += `<option value="${p}" ${p === savedPana ? "selected" : ""}>${p}</option>`;
    });

    const declaredBadge = isDeclared
      ? `<span class="badge bg-success ms-2">Declared ✅</span>`
      : "";

    const html = `
<div class="card">
  <div class="card-body">
    <h5 class="card-title mb-3">
      Declare Result — <strong>${g.name}</strong>
      ${declaredBadge}
    </h5>

    <div class="row g-3">

      <div class="col-md-4">
        <label class="form-label fw-semibold">Pana</label>
        <select class="form-control" id="pana" ${isDeclared ? "disabled" : ""}>
          ${options}
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold">Digit</label>
        <input type="text" class="form-control" id="digit"
          value="${savedDigit}" readonly placeholder="Auto">
      </div>

      <div class="col-md-4 d-flex align-items-end gap-2 flex-wrap">
        ${!isDeclared ? `<button class="btn btn-primary" id="slSaveBtn" onclick="saveStarlineResult()">
          <i class="fa fa-save"></i> Save
        </button>` : ""}
        <button class="btn btn-warning" onclick="quickView()">
          <i class="fa fa-eye"></i> Show Winner
        </button>
        ${!isDeclared ? `<button class="btn btn-success" id="slDeclareBtn" onclick="declareStarlineResult()">
          <i class="fa fa-check"></i> Declare
        </button>` : ""}
      </div>

    </div>
  </div>
</div>

<script>
document.getElementById('pana').addEventListener('change', function () {
  const p = this.value;
  if (p && p.length === 3) {
    const digit = (parseInt(p[0]) + parseInt(p[1]) + parseInt(p[2])) % 10;
    document.getElementById('digit').value = digit;
  } else {
    document.getElementById('digit').value = '';
  }
});
</script>
`;

    res.send(html);

  } catch (err) {
    console.error("getDeclareGame error:", err);
    res.send("<div class='alert alert-danger'>Error loading game form</div>");
  }
};


/* =========================
   SHOW WINNER
========================= */
exports.showWinner = async (req, res) => {
  try {
    const { game_id, date, pana, digit } = req.body;

    if (!game_id || !date) {
      return res.send("<div class='alert alert-warning'>Game and Date required.</div>");
    }

    const bids = await dbQuery(`
      SELECT b.*, u.mobile, u.name AS user_name
      FROM starline_user_bid b
      JOIN "users" u ON u.id = b.user_id
      WHERE b.game_id=$1
        AND b.game_date=$2
        AND (
          (b.game_type='Single Digit' AND b.pana=$3)
          OR
          (b.game_type!='Single Digit' AND b.pana=$4)
        )
    `, [game_id, date, digit, pana]);

    if (!bids.rows.length) {
      return res.send("<div class='alert alert-info'>No winners found for this result.</div>");
    }

    let rows = "";
    bids.rows.forEach((b, i) => {
      rows += `
        <tr>
          <td>${i + 1}</td>
          <td>${b.user_name || ""}</td>
          <td>${b.mobile || ""}</td>
          <td>${b.game_type || ""}</td>
          <td>${b.pana || ""}</td>
          <td>${b.points || ""}</td>
          <td><strong>₹${b.win_amount || 0}</strong></td>
        </tr>`;
    });

    const html = `
<div class="table-responsive">
  <table class="table table-striped table-bordered">
    <thead class="table-dark">
      <tr>
        <th>#</th>
        <th>Name</th>
        <th>Mobile</th>
        <th>Type</th>
        <th>Pana</th>
        <th>Points</th>
        <th>Win Amount</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</div>`;

    res.send(html);

  } catch (err) {
    console.error("showWinner error:", err);
    res.send("<div class='alert alert-danger'>Error loading winners</div>");
  }
};


/* =========================
   DELETE RESULT
========================= */
exports.deleteResult = async (req, res) => {
  try {
    const { id } = req.body;

    await dbQuery(
      `DELETE FROM starline_declear_result WHERE id=$1`,
      [id]
    );

    res.json({ res: "success", msg: "Result deleted" });

  } catch (err) {
    console.error("deleteResult error:", err);
    res.json({ res: "error", msg: "Delete failed" });
  }
};


/* =========================
   SAVE RESULT
========================= */
exports.saveResult = async (req, res) => {
  try {
    const { date, game_id, pana, digit } = req.body;

    console.log(`\n[STARLINE SAVE RESULT] Date: ${date} | Game ID: ${game_id} | Pana: ${pana} | Digit: ${digit}`);

    if (!date || !game_id || !pana || digit === undefined || digit === null || digit === "") {
      return res.json({ res: "error", msg: "All fields are required" });
    }

    // Disallow future dates
    if (moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).isAfter(moment(), "day")) {
      return res.json({ res: "error", msg: "Future dates are not allowed for result declaration" });
    }

    const gid = parseInt(game_id);
    if (isNaN(gid)) {
      return res.json({ res: "error", msg: "Invalid game ID" });
    }

    // Fetch game name / time from starline_game table
    const gameRes = await dbQuery(
      `SELECT name, open_time FROM starline_game WHERE id = $1`,
      [gid]
    );
    const gameTime = gameRes.rows[0]?.name || gameRes.rows[0]?.open_time || "";

    // Check if result already exists for this date + game
    const existing = await dbQuery(
      `SELECT id FROM starline_declear_result WHERE result_date=$1 AND game_id=$2`,
      [date, gid]
    );

    if (existing.rows.length) {
      // Update existing
      await dbQuery(
        `UPDATE starline_declear_result SET pana=$1, digit=$2, game_time=$5 WHERE result_date=$3 AND game_id=$4`,
        [pana, digit, date, gid, gameTime]
      );
    } else {
      // Insert new
      await dbQuery(
        `INSERT INTO starline_declear_result (result_date, game_id, pana, digit, game_time, declare_date, result) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [date, gid, pana, digit, gameTime, '', '']
      );
    }

    console.log(`✅ [STARLINE SAVE RESULT] Saved successfully`);
    res.json({ res: "success", msg: "Result Saved" });

  } catch (err) {
    console.error("StarlineDeclareResult saveResult error:", err);
    res.json({ res: "error", msg: "Server Error" });
  }
};


/* =========================
   DECLARE RESULT
========================= */
exports.declareResult = async (req, res) => {
  try {
    const { date, game_id, pana, digit } = req.body;

    console.log(`\n==========================================`);
    console.log(`🚀 [STARLINE DECLARE RESULT] Date: ${date} | Game ID: ${game_id} | Pana: ${pana} | Digit: ${digit}`);
    console.log(`==========================================`);

    if (!date || !game_id || !pana || digit === undefined || digit === null || digit === "") {
      return res.json({ res: "error", msg: "All fields are required" });
    }

    // Disallow future dates
    if (moment(date, ["YYYY-MM-DD", "DD MMM YYYY"]).isAfter(moment(), "day")) {
      return res.json({ res: "error", msg: "Future dates are not allowed for result declaration" });
    }

    const gid = parseInt(game_id);
    if (isNaN(gid)) {
      return res.json({ res: "error", msg: "Invalid game ID" });
    }

    // Fetch saved result
    let resultRes = await dbQuery(
      `SELECT * FROM starline_declear_result WHERE result_date=$1 AND game_id=$2 ORDER BY id DESC LIMIT 1`,
      [date, gid]
    );

    if (!resultRes.rows.length) {
      // Auto-save if not saved yet
      const gameRes = await dbQuery(`SELECT name, open_time FROM starline_game WHERE id = $1`, [gid]);
      const gameTime = gameRes.rows[0]?.name || gameRes.rows[0]?.open_time || "";
      await dbQuery(
        `INSERT INTO starline_declear_result (result_date, game_id, pana, digit, game_time, declare_date, result) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [date, gid, pana, digit, gameTime, '', '']
      );
      resultRes = await dbQuery(
        `SELECT * FROM starline_declear_result WHERE result_date=$1 AND game_id=$2 ORDER BY id DESC LIMIT 1`,
        [date, gid]
      );
    }

    const savedResult = resultRes.rows[0];

    // Check if already declared
    if (savedResult.declare_date && savedResult.declare_date.trim() !== '') {
      console.log(`⚠️ Result already declared for Date: ${date} | Game ID: ${gid}`);
      return res.json({ res: "error", msg: "Result already declared for this game and date" });
    }

    const now = moment().format("DD MMM YYYY hh:mm:ss A");

    // Mark as declared
    await dbQuery(
      `UPDATE starline_declear_result SET declare_date=$1, pana=$2, digit=$3 WHERE id=$4`,
      [now, pana, digit, savedResult.id]
    );

    console.log(`✅ starline_declear_result updated with declare_date`);

    // Support both date formats in starline_user_bid
    const date1 = date;
    const date2 = moment(date, ["DD MMM YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD");
    const date3 = moment(date, ["DD MMM YYYY", "YYYY-MM-DD"]).format("DD MMM YYYY");

    // Fetch all bids for this game on this date
    const bidsRes = await dbQuery(
      `SELECT * FROM starline_user_bid
       WHERE game_id=$1
         AND (game_date=$2 OR game_date=$3 OR game_date=$4)
       ORDER BY id DESC`,
      [gid, date1, date2, date3]
    );

    console.log(`📋 Total Starline Bids Found: ${bidsRes.rows.length}`);

    const panaTrimmed  = String(pana  || "").trim();
    const digitTrimmed = String(digit || "").trim();

    let winnerCount = 0;

    for (const bid of bidsRes.rows) {
      const bidPana  = String(bid.pana  || "").trim();
      const gameType = String(bid.game_type || "").trim();

      let isWinner = false;

      if (gameType === "Single Digit" || gameType === "Single") {
        // Match digit
        if (bidPana === digitTrimmed) isWinner = true;
      } else {
        // Single Pana / Double Pana / Triple Pana — match pana
        if (bidPana === panaTrimmed) isWinner = true;
      }

      console.log(`   👉 Bid #${bid.id} | User: ${bid.user_id} | Type: ${gameType} | Pana: ${bidPana} | Winner: ${isWinner}`);

      if (isWinner) {
        winnerCount++;
        console.log(`   🎉 [WINNER!] User ID: ${bid.user_id}`);
        await creditStarlineWallet(bid, { game_id: gid, result_date: date });
      }
    }

    console.log(`✅ Total Starline Winners Credited: ${winnerCount}`);

    // Broadcast FCM notification
    const gameRes = await dbQuery(`SELECT name FROM starline_game WHERE id=$1`, [gid]);
    const gameName = gameRes.rows[0]?.name || "Starline Game";
    const notifTitle = `${panaTrimmed}-${digitTrimmed}`;
    const notifBody  = `${gameName} Result Declared`;

    try {
      await sendResultBroadcastNotification(notifTitle, notifBody);
      console.log(`📲 Broadcast Notification Sent: ${notifTitle} | ${notifBody}`);
    } catch (fcmErr) {
      console.error("❌ Starline FCM Broadcast Error:", fcmErr);
    }

    return res.json({ res: "success", msg: "Result Declared Successfully" });

  } catch (err) {
    console.error("❌ StarlineDeclareResult declareResult error:", err);
    res.json({ res: "error", msg: "Server Error" });
  }
};


/* =========================
   CREDIT STARLINE WALLET
   (private helper)
========================= */
async function creditStarlineWallet(bid, result) {
  try {
    const txn_id  = Math.floor(10000000 + Math.random() * 90000000);
    const user_id = bid.user_id;

    let amount = Number(bid.win_amount) || 0;

    // Fallback: calculate from points + game type if win_amount is missing
    if (amount <= 0 && Number(bid.points) > 0) {
      const points  = Number(bid.points);
      const gType   = String(bid.game_type || "");

      if (gType.includes("Single Digit") || gType === "Single") amount = points * 9.5;
      else if (gType.includes("Single Pana") || gType.includes("SP"))  amount = points * 140;
      else if (gType.includes("Double Pana") || gType.includes("DP"))  amount = points * 280;
      else if (gType.includes("Triple Pana") || gType.includes("Tripple Pana") || gType.includes("TP")) amount = points * 600;
      else amount = points * 9.5;
    }

    amount = Math.round(amount);

    if (amount <= 0) {
      console.log(`⚠️ Starline Credit Skipped: win_amount=0 for User ID: ${user_id}`);
      return;
    }

    const now = moment().format("DD MMM YYYY hh:mm:ss A");

    // Get last wallet balance
    const lastWallet = await dbQuery(
      `SELECT txn_clbal FROM wallet WHERE user_id=$1 ORDER BY id DESC LIMIT 1`,
      [user_id]
    );

    let opening = 0;
    if (lastWallet.rows.length) {
      opening = Number(lastWallet.rows[0].txn_clbal) || 0;
    }
    const closing = opening + amount;

    console.log(`💰 [STARLINE CREDIT] User: ${user_id} | Amount: ₹${amount} | Opening: ₹${opening} | Closing: ₹${closing}`);

    // Insert wallet ledger entry
    await dbQuery(
      `INSERT INTO wallet
        (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date, transfer_user_id, transaction_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [user_id, opening, amount, 0, closing, "Starline Winning Amount", now, "Admin", txn_id]
    );

    // Update users.wallet column
    try {
      await dbQuery(
        `UPDATE "users" SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2`,
        [amount, user_id]
      );
    } catch (uErr) {
      // Ignore if column doesn't exist
    }

    // Insert starline win history
    await dbQuery(
      `INSERT INTO starline_win_history
        (user_id, game_id, game_type, game_date, txn_id, pana, points, amount, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        bid.user_id,
        result.game_id,
        bid.game_type,
        result.result_date,
        txn_id,
        bid.pana,
        bid.points,
        amount,
        moment().format("DD MMM YYYY")
      ]
    );

    console.log(`✅ Starline Win History recorded for User ID: ${user_id}`);

    // Personal FCM notification to winner
    try {
      const userRes = await dbQuery(
        `SELECT fcm_token, notif_win FROM "users" WHERE id=$1 LIMIT 1`,
        [user_id]
      );
      if (
        userRes.rows.length &&
        userRes.rows[0].fcm_token &&
        Number(userRes.rows[0].notif_win) === 1
      ) {
        await sendSingleNotification(
          userRes.rows[0].fcm_token,
          "🎉 Congratulations! You Won!",
          `You won ₹${amount} in Starline ${bid.game_type}!`
        );
        console.log(`📲 Winner FCM sent to User ID: ${user_id}`);
      }
    } catch (notifErr) {
      console.error("❌ Starline Winner FCM Error:", notifErr);
    }

  } catch (err) {
    console.error("❌ creditStarlineWallet Error:", err);
  }
}
