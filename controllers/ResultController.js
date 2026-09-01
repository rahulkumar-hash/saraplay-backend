// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const moment = require("moment");
const resultService = require("../services/resultService");
const { formatResultDate } = require("../utils/dateHelper");
const {
  sendSingleNotification,
  sendMultiNotification,
  sendAll,
  sendResultBroadcastNotification
} = require("../utils/sendNotification");


exports.index = async (req, res) => {
  try {
    // YYYY-MM-DD
    const today = new Date().toISOString().slice(0, 10);

    const result = await dbQuery(`
      SELECT 
        d.*, 
        g.name AS game_name
      FROM declear_result d
      JOIN game g 
        ON g.id = d.game_id::integer
      WHERE to_date(d.result_date, 'DD Mon YYYY') = $1::date
      ORDER BY d.id DESC
    `, [today]);

    res.render("result/index", {
      layout: "layouts/admin",
      title: "Declear Result",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("Index error:", err);
    res.status(500).send("Server Error");
  }
};


exports.getResultHistory = async (req, res) => {
  try {
    const { pick_date } = req.body; // YYYY-MM-DD

    const result = await dbQuery(`
      SELECT 
        d.*, 
        g.name AS game_name
      FROM declear_result d
      JOIN game g 
        ON g.id = d.game_id::integer
      WHERE to_date(d.result_date, 'DD Mon YYYY') = $1::date
      ORDER BY d.id DESC
    `, [pick_date]);

    res.json({
      status: true,
      data: result.rows
    });

  } catch (err) {
    console.error("History error:", err);
    res.json({ status: false, data: [] });
  }
};



exports.getGamesForDeclare = async (req, res) => {
  try {
    const rawDate = req.query.date || req.body.date || new Date();
    const dateMoment = moment(rawDate, ["YYYY-MM-DD", "DD MMM YYYY", "YYYY/MM/DD", moment.ISO_8601]);
    const dateISO = dateMoment.isValid() ? dateMoment.format("YYYY-MM-DD") : moment().format("YYYY-MM-DD");
    const dateFmt = dateMoment.isValid() ? dateMoment.format("DD MMM YYYY") : moment().format("DD MMM YYYY");

    const result = await dbQuery(`
      SELECT DISTINCT ON (g.id) g.*
      FROM game g
      LEFT JOIN declear_result d
        ON g.id = d.game_id::integer
       AND (
         d.result_date = $2
         OR (
           d.result_date ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4}$'
           AND to_date(d.result_date, 'DD Mon YYYY') = $1::date
         )
       )
      WHERE g.status = 'true'
        AND (
          d.id IS NULL
          OR NOT (
            (COALESCE(d.open_result, '') = 'Declared' OR (d.open_declare_date IS NOT NULL AND d.open_declare_date != ''))
            AND
            (COALESCE(d.close_result, '') = 'Declared' OR (d.close_declare_date IS NOT NULL AND d.close_declare_date != ''))
          )
        )
      ORDER BY g.id ASC
    `, [dateISO, dateFmt]);

    const parseTimeToMinutes = (timeStr) => {
      if (!timeStr || typeof timeStr !== "string") return 0;
      const cleaned = timeStr.trim().toUpperCase();
      const m = moment(cleaned, ["hh:mm A", "h:mm A", "hh:mmA", "h:mmA", "HH:mm", "H:mm"]);
      if (m.isValid()) {
        return m.hours() * 60 + m.minutes();
      }
      const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const meridiem = match[3] ? match[3].toUpperCase() : "";
        if (meridiem === "PM" && hours < 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;
        return hours * 60 + minutes;
      }
      return 0;
    };

    const sortedGames = (result.rows || []).sort((a, b) => {
      const openA = parseTimeToMinutes(a.open_time);
      const openB = parseTimeToMinutes(b.open_time);
      if (openA !== openB) return openA - openB;
      const closeA = parseTimeToMinutes(a.close_time);
      const closeB = parseTimeToMinutes(b.close_time);
      return closeA - closeB;
    });

    res.json(sortedGames);
  } catch (err) {
    console.error("getGamesForDeclare error:", err);
    res.json([]);
  }
};
















exports.getDeclareGame = async (req, res) => {

  try {

    const { date, game_id, session } = req.body;

    const rdate = formatResultDate(date);

    const data = await resultService.getResultByGameDate(rdate, game_id);

    let selectedPana = "";
    let selectedDigit = "";

    if (data) {

      if (session === "Open") {

        selectedPana = data.open_pana || "";
        selectedDigit = data.open_digit || "";

      } else {

        selectedPana = data.close_pana || "";
        selectedDigit = data.close_digit || "";

      }

    }


    /* BUTTON FLOW */

    let saveBtn = "";
    let declareBtn = "";
    let winnerBtn = "";

    console.log(data);

    if (!data) {

      saveBtn = `<button class="btn btn-primary" id="save">Save</button>`;

    } else {

      if (session === "Open") {

        if (!data.open_declare_date) {

          saveBtn = `<button class="btn btn-primary" id="save">Save</button>`;

        }

        if (!data.open_result) {

          declareBtn = `<button class="btn btn-success" id="declare">Declare</button>`;

        }

      } else {

        // if (!data.close_declare_date) {

          saveBtn = `<button class="btn btn-primary" id="save">Save</button>`;

        // }

        // if (!data.close_result && data.open_result) {

          declareBtn = `<button class="btn btn-success" id="declare">Declare</button>`;

        // }

      }


      winnerBtn = `<button class="btn btn-warning" onclick="quick_view()">Show Winner</button>`;

    }


    /* PANNA LIST */

    const pannas = [
      "000", "100", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119",
      "120", "122", "123", "124", "125", "126", "127", "128", "129", "130", "133", "134",
      "135", "136", "137", "138", "139", "140", "144", "145", "146", "147", "148", "149",
      "150", "155", "156", "157", "158", "159", "160", "166", "167", "168", "169", "170",
      "177", "178", "179", "180", "188", "189", "190", "199", "200", "211", "220", "222",
      "223", "224", "225", "226", "227", "228", "229", "230", "233", "234", "235", "236",
      "237", "238", "239", "240", "244", "245", "246", "247", "248", "249", "250", "255",
      "256", "257", "258", "259", "260", "266", "267", "268", "269", "270", "277", "278",
      "279", "280", "288", "289", "290", "299", "300", "330", "333", "334", "335", "336",
      "337", "338", "339", "340", "344", "345", "346", "347", "348", "349", "350", "355",
      "356", "357", "358", "359", "360", "366", "367", "368", "369", "370", "377", "378",
      "379", "380", "388", "389", "390", "399", "400", "440", "444", "445", "446", "447",
      "448", "449", "450", "455", "456", "457", "458", "459", "460", "466", "467", "468",
      "469", "470", "477", "478", "479", "480", "488", "489", "490", "499", "500", "550",
      "555", "556", "557", "558", "559", "560", "566", "567", "568", "569", "570", "577",
      "578", "579", "580", "588", "589", "590", "599", "600", "660", "666", "667", "668",
      "669", "670", "677", "678", "679", "680", "688", "689", "690", "699", "700", "770",
      "777", "778", "779", "780", "788", "789", "790", "799", "800", "880", "888", "889",
      "890", "899", "900", "990", "999"
    ];


    let options = '<option disabled>Select Pana</option>';

    pannas.forEach(p => {

      options += `
        <option value="${p}" ${p === selectedPana ? "selected" : ""}>
          ${p}
        </option>`;

    });


    /* HTML RESPONSE */

    const html = `
    
    <div class="card">

    <div class="card-body">

    <h4>Declare Result</h4>

    <div class="row">

    <div class="col-md-4">

    <label>Panna</label>

    <select class="form-control" id="pana">

    ${options}

    </select>

    </div>


    <div class="col-md-4">

    <label>Digit</label>

    <input class="form-control" id="digit"
    value="${selectedDigit}" readonly>

    </div>


    <div class="col-md-4">

    <br>

    ${saveBtn}
    ${winnerBtn}
    ${declareBtn}

    </div>

    </div>

    </div>

    </div>

    <script>

    $(document).on("change","#pana",function(){

      let pana=$(this).val()

      let point=
      parseInt(pana[0])+
      parseInt(pana[1])+
      parseInt(pana[2])

      $("#digit").val(point%10)

    })

    </script>
    `;

    res.send(html);

  } catch (error) {

    console.log(error);

    res.send("Server Error");

  }

};




/* =====================================
   SAVE RESULT
===================================== */

exports.saveResult = async (req, res) => {

  try {

    const { date, game_id, session, pana, digit } = req.body;

    const rdate = formatResultDate(date);

    const data = await resultService.getResultByGameDate(rdate, game_id);

    if (session === "Open") {

      if (data) {

        await resultService.updateOpenResult(
          rdate, game_id, pana, digit
        );

      } else {

        await resultService.insertOpenResult(
          rdate, game_id, pana, digit
        );

      }

    }

    if (session === "Close") {

      await resultService.updateCloseResult(
        rdate, game_id, pana, digit
      );

    }


    res.json({

      res: "success",
      msg: "Result Saved"

    });

  } catch (error) {

    console.log(error);

    res.json({

      res: "error",
      msg: "Server error"

    });

  }

};








exports.showWinner = async (req, res) => {

  try {

    const { date, game_id, session, pana, digit } = req.body

    const rdate = moment(date).format("DD MMM YYYY")

    /* RESULT DATA */

    const result = await dbQuery(`
SELECT * FROM declear_result
WHERE result_date=$1
AND game_id=$2
`, [rdate, game_id])

    if (!result.rows.length) {
      return res.send("No Result Found")
    }

    const data = result.rows[0]

    const gdate = data.result_date
    const gid = data.game_id

    let html = `
<div class="table-scrollable">

<table class="table table-striped">

<thead>

<tr>
<th>#</th>
<th>Username</th>
<th>Bid Points</th>
<th>Winning Amount</th>
<th>Type</th>
<th>Bid Txn ID</th>
</tr>

</thead>

<tbody>
`

    let j = 1

    /* =========================
    OPEN SESSION
    ========================= */

    if (session === "Open") {

      const bids = await dbQuery(`
SELECT * FROM user_bid
WHERE game_date=$1
AND session='Open'
AND game_id=$2
ORDER BY id DESC
`, [gdate, gid])

      for (const v of bids.rows) {

        if (v.pana === data.open_pana || v.pana === data.open_digit) {

          const user = await dbQuery(`
SELECT name FROM users WHERE id=$1
`, [v.user_id])

          html += `
<tr>
<td>${j++}</td>
<td>${user.rows[0]?.name || ""}</td>
<td>${v.points}</td>
<td>${v.win_amount}</td>
<td>${v.game_type}</td>
<td>${v.bid_txn_id}</td>
</tr>
`

        }

      }

    }

    /* =========================
    CLOSE SESSION
    ========================= */

    else {

      const bids = await dbQuery(`
SELECT * FROM user_bid
WHERE game_date=$1
AND game_id=$2
ORDER BY id DESC
`, [gdate, gid])

      for (const v of bids.rows) {

        let open = data.open_digit == 0 ? "A" : data.open_digit

        let userPana = v.pana

        if (v.game_type === "Single Digit") {
          userPana = v.pana == 0 ? "A" : v.pana
        }

        const jodi = open + data.close_digit
        const halfSangam1 = data.open_digit + data.close_pana
        const halfSangam2 = data.open_pana + data.close_digit
        const fullSangam = data.open_pana + data.close_pana
        const jodiRes = data.jodi_digit

        if (v.session !== "Open") {

          if (
            userPana === data.close_pana ||
            userPana === data.close_digit ||
            userPana === fullSangam ||
            userPana === jodiRes
          ) {

            const user = await dbQuery(`
SELECT name FROM users WHERE id=$1
`, [v.user_id])

            html += `
<tr>
<td>${j++}</td>
<td>${user.rows[0]?.name || ""}</td>
<td>${v.points}</td>
<td>${v.win_amount}</td>
<td>${v.game_type}</td>
<td>${v.bid_txn_id}</td>
</tr>
`

          }

        }

        if (v.game_type === "Half Sangam") {

          if (v.pana === halfSangam1 || v.pana === halfSangam2) {

            const user = await dbQuery(`
SELECT name FROM users WHERE id=$1
`, [v.user_id])

            html += `
<tr>
<td>${j++}</td>
<td>${user.rows[0]?.name || ""}</td>
<td>${v.points}</td>
<td>${v.win_amount}</td>
<td>${v.game_type} (${v.session})</td>
<td>${v.bid_txn_id}</td>
</tr>
`

          }

        }

      }

    }

    html += `
</tbody>
</table>
</div>
`

    res.send(html)

  } catch (err) {

    console.log(err)

    res.send("Server Error")

  }

}











exports.declareResult = async (req, res) => {
  try {
    const { date, game_id, session, pana, digit } = req.body;

    console.log("\n==========================================");
    console.log(`🚀 [DECLARE RESULT REQUEST] Date: ${date} | Game ID: ${game_id} | Session: ${session} | Pana: ${pana} | Digit: ${digit}`);
    console.log("==========================================");

    const rdate = moment(date).format("DD MMM YYYY");
    const now = moment().format("DD MMM YYYY hh:mm:ss A");

    if (!date || !game_id || !session || !pana) {
      console.log("❌ Declare Result Failed: Missing parameters");
      return res.json({ res: "error", msg: "Data require" });
    }

    /* ==============================
    GET RESULT
    ============================== */
    console.log(`🔍 Searching declear_result table for Date: '${rdate}' & Game ID: ${game_id}...`);

    const result = await dbQuery(`
      SELECT * FROM declear_result
      WHERE result_date=$1
      AND game_id=$2
      ORDER BY id DESC
      LIMIT 1
    `, [rdate, game_id]);

    if (!result.rows.length) {
      console.log(`❌ No declear_result record found for Date: '${rdate}' & Game ID: ${game_id}`);
      return res.json({ res: "error", msg: "Result Not Found" });
    }

    const data = result.rows[0];
    console.log(`✅ Result Row Found: Open Pana: ${data.open_pana}, Open Digit: ${data.open_digit}, Close Pana: ${data.close_pana}, Close Digit: ${data.close_digit}`);

    // Support both DD MMM YYYY and YYYY-MM-DD date formats in user_bid
    const date1 = data.result_date;
    const date2 = moment(data.result_date, ["DD MMM YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD");
    const date3 = moment(data.result_date, ["DD MMM YYYY", "YYYY-MM-DD"]).format("DD MMM YYYY");

    /* ==============================
    OPEN DECLARE
    ============================== */
    if (session === "Open") {
      console.log(`📢 Declaring OPEN session for Game ID: ${data.game_id}...`);

      await dbQuery(`
        UPDATE declear_result
        SET open_declare_date=$1, open_result='Declared'
        WHERE result_date=$2 AND game_id=$3
      `, [now, data.result_date, data.game_id]);

      /* WINNER CHECK */
      console.log(`🔎 Querying user_bid for Open session | Dates: ['${date1}', '${date2}', '${date3}'] | Game ID: ${data.game_id}`);

      const bids = await dbQuery(`
        SELECT * FROM user_bid
        WHERE (game_date = $1 OR game_date = $2 OR game_date = $3)
        AND session='Open'
        AND game_id=$4
        ORDER BY id DESC
      `, [date1, date2, date3, data.game_id]);

      console.log(`📋 Total OPEN Bids Found: ${bids.rows.length}`);

      let winnerCount = 0;
      for (const v of bids.rows) {
        const panaVal = String(v.pana || "").trim();
        const openDigitVal = String(data.open_digit || "").trim();
        const openPanaVal = String(data.open_pana || "").trim();
        const gameType = String(v.game_type || "").trim();

        console.log(`   👉 Checking Bid #${v.id} | User ID: ${v.user_id} | Type: '${gameType}' | Pana/Digit: '${panaVal}' | Points: ${v.points}`);

        let isWinner = false;
        if (
          (panaVal === openDigitVal && (gameType === "Single Digit" || gameType === "Single")) ||
          (panaVal === openPanaVal && (gameType === "Single Pana" || gameType === "SP Pana" || gameType === "SP Motor" || gameType === "SP" || gameType === "Single Pana Bulk" || gameType === "Single Panna")) ||
          (panaVal === openPanaVal && (gameType === "Double Pana" || gameType === "DP Pana" || gameType === "DP Motor" || gameType === "DP" || gameType === "Double Panna Bulk" || gameType === "Double Panna")) ||
          (panaVal === openPanaVal && (gameType === "Tripple Pana" || gameType === "TP Pana" || gameType === "TP" || gameType === "Triple Panna" || gameType === "Triple Pana"))
        ) {
          isWinner = true;
        } else if (gameType === "Odd Even") {
          const num = parseInt(openDigitVal, 10);
          if (!isNaN(num)) {
            const isOdd = num % 2 !== 0;
            if ((panaVal.toLowerCase() === "odd" && isOdd) || (panaVal.toLowerCase() === "even" && !isOdd)) {
              isWinner = true;
            }
          }
        }

        if (isWinner) {
          winnerCount++;
          console.log(`   🎉 [OPEN WINNER MATCHED!] User ID: ${v.user_id} | Type: ${gameType} | Pana: ${panaVal}`);
          await creditWallet(v, data);
        } else {
          console.log(`   ❌ No Match for Bid #${v.id}`);
        }
      }

      console.log(`✅ OPEN Session Completed. Total Winners Credited: ${winnerCount}`);

      const game = await dbQuery(`SELECT name FROM game WHERE id = $1`, [data.game_id]);
      var title = data.open_pana + '-' + data.open_digit + '*-***';
      var body = (game.rows[0]?.name || 'Game') + ' Result';

      try {
        await sendResultBroadcastNotification(title, body);
        console.log(`📲 Broadcast Notification Sent: ${title}`);
      } catch (fcmErr) {
        console.error("❌ FCM Broadcast Error:", fcmErr);
      }

      return res.json({ res: "success", msg: "Result Declared" });
    }

    /* ==============================
    CLOSE DECLARE
    ============================== */
    if (session === "Close") {
      if (!data.open_declare_date) {
        console.log("❌ Close Declare Failed: Open result not declared yet");
        return res.json({ res: "error", msg: "Declare Open Result First" });
      }

      console.log(`📢 Declaring CLOSE session for Game ID: ${data.game_id}...`);

      await dbQuery(`
        UPDATE declear_result
        SET close_declare_date=$1, close_result='Declared'
        WHERE result_date=$2 AND game_id=$3
      `, [now, data.result_date, data.game_id]);

      console.log(`🔎 Querying user_bid for Close session | Dates: ['${date1}', '${date2}', '${date3}'] | Game ID: ${data.game_id}`);

      const bids = await dbQuery(`
        SELECT * FROM user_bid
        WHERE (game_date = $1 OR game_date = $2 OR game_date = $3)
        AND game_id = $4
        ORDER BY id DESC
      `, [date1, date2, date3, data.game_id]);

      console.log(`📋 Total CLOSE Bids Found: ${bids.rows.length}`);

      const jodi = String(data.open_digit || "") + String(data.close_digit || "");
      const half1 = String(data.open_digit || "") + String(data.close_pana || "");
      const half2 = String(data.open_pana || "") + String(data.close_digit || "");
      const full = String(data.open_pana || "") + String(data.close_pana || "");

      console.log(`🎯 Winning Patterns -> Jodi: '${jodi}', Half1: '${half1}', Half2: '${half2}', Full: '${full}'`);

      let winnerCount = 0;
      for (const v of bids.rows) {
        const panaVal = String(v.pana || "").trim();
        const closePanaVal = String(data.close_pana || "").trim();
        const closeDigitVal = String(data.close_digit || "").trim();
        const gameType = String(v.game_type || "").trim();

        let isWinner = false;

        if (v.session === "Close") {
          if (
            (panaVal === closeDigitVal && (gameType === "Single Digit" || gameType === "Single")) ||
            (panaVal === closePanaVal && (gameType === "Single Pana" || gameType === "SP Pana" || gameType === "SP Motor" || gameType === "SP" || gameType === "Single Pana Bulk" || gameType === "Single Panna")) ||
            (panaVal === closePanaVal && (gameType === "Double Pana" || gameType === "DP Pana" || gameType === "DP Motor" || gameType === "DP" || gameType === "Double Panna Bulk" || gameType === "Double Panna")) ||
            (panaVal === closePanaVal && (gameType === "Tripple Pana" || gameType === "TP Pana" || gameType === "TP" || gameType === "Triple Panna" || gameType === "Triple Pana"))
          ) {
            isWinner = true;
          } else if (gameType === "Odd Even") {
            const num = parseInt(closeDigitVal, 10);
            if (!isNaN(num)) {
              const isOdd = num % 2 !== 0;
              if ((panaVal.toLowerCase() === "odd" && isOdd) || (panaVal.toLowerCase() === "even" && !isOdd)) {
                isWinner = true;
              }
            }
          }
        }

        if (
          gameType === "Jodi Digit" ||
          gameType === "Jodi" ||
          gameType === "Red Brackets" ||
          gameType === "Group Jodi" ||
          gameType === "Two Digits Panel"
        ) {
          if (panaVal === jodi.trim()) isWinner = true;
        }

        if (gameType === "Half Sangam" || gameType === "Half Sangam A" || gameType === "Half Sangam B") {
          if (panaVal === half1.trim() || panaVal === half2.trim()) isWinner = true;
        }

        if (gameType === "Full Sangam") {
          if (panaVal === full.trim()) isWinner = true;
        }

        console.log(`   👉 Checking Bid #${v.id} | User ID: ${v.user_id} | Type: '${gameType}' | Session: '${v.session}' | Pana/Digit: '${panaVal}' | Points: ${v.points}`);

        if (isWinner) {
          winnerCount++;
          console.log(`   🎉 [CLOSE WINNER MATCHED!] User ID: ${v.user_id} | Type: ${gameType} | Pana: ${panaVal}`);
          await creditWallet(v, data);
        } else {
          console.log(`   ❌ No Match for Bid #${v.id}`);
        }
      }

      console.log(`✅ CLOSE Session Completed. Total Winners Credited: ${winnerCount}`);

      const game = await dbQuery(`SELECT name FROM game WHERE id = $1`, [data.game_id]);
      var title = data.open_pana + '-' + data.open_digit + '' + data.close_digit + '-' + data.close_pana;
      var body = (game.rows[0]?.name || 'Game') + ' Result';

      try {
        await sendResultBroadcastNotification(title, body);
        console.log(`📲 Broadcast Notification Sent: ${title}`);
      } catch (fcmErr) {
        console.error("❌ FCM Broadcast Error:", fcmErr);
      }

      return res.json({ res: "success", msg: "Result Declared" });
    }

  } catch (err) {
    console.error("❌ Declare Result Server Error:", err);
    res.json({ res: "error", msg: "Server Error" });
  }
};

async function creditWallet(bid, result) {
  try {
    const txn_id = Math.floor(10000000 + Math.random() * 90000000);
    const user_id = bid.user_id;
    let amount = Number(bid.win_amount) || 0;

    // Fallback calculation if win_amount is missing or zero
    if (amount <= 0 && Number(bid.points) > 0) {
      const points = Number(bid.points);
      const gType = String(bid.game_type || "").trim();
      let singleDigit = 9.5, jodiDigit = 95, singlePana = 140, doublePana = 280, tripplePana = 600, halfSangam = 1000, fullSangam = 10000;

      try {
        const rateRes = await dbQuery("SELECT * FROM game_rate WHERE id = 1");
        if (rateRes.rows.length) {
          const rate = rateRes.rows[0];
          if (rate.single_digit1) singleDigit = rate.single_digit2 / rate.single_digit1;
          if (rate.jodi_digit1) jodiDigit = rate.jodi_digit2 / rate.jodi_digit1;
          if (rate.single_pana1) singlePana = rate.single_pana2 / rate.single_pana1;
          if (rate.double_pana1) doublePana = rate.double_pana2 / rate.double_pana1;
          if (rate.tripple_pana1) tripplePana = rate.tripple_pana2 / rate.tripple_pana1;
          if (rate.half_sangam1) halfSangam = rate.half_sangam2 / rate.half_sangam1;
          if (rate.full_sangam1) fullSangam = rate.full_sangam2 / rate.full_sangam1;
        }
      } catch (rErr) {
        console.error("game_rate query error in creditWallet:", rErr);
      }

      if (gType.includes("Single Digit") || gType === "Single" || gType === "Odd Even") amount = points * singleDigit;
      else if (gType.includes("Jodi") || gType.includes("Red Brackets") || gType.includes("Two Digits Panel") || gType.includes("Group Jodi")) amount = points * jodiDigit;
      else if (gType.includes("Single Pana") || gType.includes("SP Pana") || gType.includes("SP Motor") || gType.includes("SP") || gType.includes("Single Panna")) amount = points * singlePana;
      else if (gType.includes("Double Pana") || gType.includes("DP Pana") || gType.includes("DP Motor") || gType.includes("DP") || gType.includes("Double Panna")) amount = points * doublePana;
      else if (gType.includes("Tripple Pana") || gType.includes("TP Pana") || gType.includes("TP") || gType.includes("Triple")) amount = points * tripplePana;
      else if (gType.includes("Half Sangam")) amount = points * halfSangam;
      else if (gType.includes("Full Sangam")) amount = points * fullSangam;
      else amount = points * singleDigit;
    }
    amount = Math.round(amount);

    if (amount <= 0) {
      console.log(`⚠️ Credit Skipped: Win Amount is 0 for User ID: ${user_id}`);
      return;
    }

    const now = moment().format("DD MMM YYYY hh:mm:ss A");

    const last = await dbQuery(`
      SELECT txn_clbal FROM wallet
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 1
    `, [user_id]);

    let opening = 0;
    if (last.rows.length) {
      opening = Number(last.rows[0].txn_clbal) || 0;
    }
    let closing = opening + amount;

    console.log("------------------------------------------");
    console.log(`💰 [CREDITING WALLET] User ID: ${user_id} | Game Type: ${bid.game_type} | Points: ${bid.points}`);
    console.log(`💰 Calculated Win Amount: ₹${amount}`);
    console.log(`💰 Opening Balance: ₹${opening} -> New Closing Balance: ₹${closing}`);
    console.log("------------------------------------------");

    await dbQuery(`
      INSERT INTO wallet
      (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date, transfer_user_id, transaction_id)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

    try {
      await dbQuery(`UPDATE "users" SET wallet = COALESCE(wallet, 0) + $1 WHERE id = $2`, [amount, user_id]);
      console.log(`✅ Updated users table wallet column for User ID: ${user_id}`);
    } catch (uErr) {
      // Ignore if users.wallet column does not exist
    }

    await dbQuery(`
      INSERT INTO win_history
      (user_id, game_id, game_type, session, game_date, txn_id, pana, points, amount, date)
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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

    console.log(`✅ Win History Recorded for User ID: ${user_id}`);

    try {
      const userRes = await dbQuery(`SELECT fcm_token, notif_win FROM "users" WHERE id = $1 LIMIT 1`, [user_id]);
      if (
        userRes.rows.length > 0 &&
        userRes.rows[0].fcm_token &&
        Number(userRes.rows[0].notif_win) === 1
      ) {
        await sendSingleNotification(
          userRes.rows[0].fcm_token,
          "Congratulations! 🥳 You Won!",
          `You won ₹${amount} in ${bid.game_type} (${bid.session})!`
        );
        console.log(`📲 Winner FCM Notification Sent to User ID: ${user_id}`);
      } else if (userRes.rows.length > 0 && Number(userRes.rows[0].notif_win) === 0) {
        console.log(`🔕 Win notification OFF for User ID: ${user_id}, skipped`);
      } else {
        console.log(`ℹ️ FCM Token missing for User ID: ${user_id}, skipped FCM notification`);
      }
    } catch (notifErr) {
      console.error("❌ Winner FCM Notification Error:", notifErr);
    }
  } catch (err) {
    console.error("❌ creditWallet Execution Error:", err);
  }
};
































exports.getDeclareGameOld = async (req, res) => {
  try {

    const { date, game_id, session } = req.body;

    const result = await dbQuery(`
      SELECT * FROM declear_result
      WHERE game_id=$1
      AND to_date(result_date,'DD Mon YYYY')=$2::date
    `, [game_id, date]);

    const data = result.rows[0];

    let selectedPana = "";
    let selectedDigit = "";

    if (data) {
      if (session === "Open") {
        selectedPana = data.open_pana || "";
        selectedDigit = data.open_digit || "";
      } else {
        selectedPana = data.close_pana || "";
        selectedDigit = data.close_digit || "";
      }
    }

    const pannas = [
      "000", "100", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119",
      "120", "122", "123", "124", "125", "126", "127", "128", "129", "130", "133", "134",
      "135", "136", "137", "138", "139", "140", "144", "145", "146", "147", "148", "149",
      "150", "155", "156", "157", "158", "159", "160", "166", "167", "168", "169", "170",
      "177", "178", "179", "180", "188", "189", "190", "199", "200", "211", "220", "222",
      "223", "224", "225", "226", "227", "228", "229", "230", "233", "234", "235", "236",
      "237", "238", "239", "240", "244", "245", "246", "247", "248", "249", "250", "255",
      "256", "257", "258", "259", "260", "266", "267", "268", "269", "270", "277", "278",
      "279", "280", "288", "289", "290", "299", "300", "330", "333", "334", "335", "336",
      "337", "338", "339", "340", "344", "345", "346", "347", "348", "349", "350", "355",
      "356", "357", "358", "359", "360", "366", "367", "368", "369", "370", "377", "378",
      "379", "380", "388", "389", "390", "399", "400", "440", "444", "445", "446", "447",
      "448", "449", "450", "455", "456", "457", "458", "459", "460", "466", "467", "468",
      "469", "470", "477", "478", "479", "480", "488", "489", "490", "499", "500", "550",
      "555", "556", "557", "558", "559", "560", "566", "567", "568", "569", "570", "577",
      "578", "579", "580", "588", "589", "590", "599", "600", "660", "666", "667", "668",
      "669", "670", "677", "678", "679", "680", "688", "689", "690", "699", "700", "770",
      "777", "778", "779", "780", "788", "789", "790", "799", "800", "880", "888", "889",
      "890", "899", "900", "990", "999"
    ];

    let options = '';

    if (selectedPana) {
      options += `<option selected>${selectedPana}</option>`;
    } else {
      options += `<option disabled selected>Select Pana</option>`;
    }

    pannas.forEach(p => {
      options += `<option value="${p}">${p}</option>`;
    });

    const html = `
    
<div class="card" id="drct">

<div class="card-body">

<h4 class="card-title">Declare Result</h4>

<div class="row">

<div class="form-group col-md-4">

<label>Panna</label>

<select class="form-control" id="pana">

${options}

</select>

</div>

<div class="form-group col-md-4">

<label>Digit</label>

<input type="text" class="form-control" id="digit" value="${selectedDigit}" readonly>

</div>

<div class="form-group col-md-4" id="buttons">

<br>

<button class="btn btn-primary" id="save">Save</button>

<button class="btn btn-warning" onclick="quick_view()">Show Winner</button>

<button class="btn btn-success" id="declare">Declare</button>

</div>

</div>

<div id="error1" style="display:none">
<div class="alert alert-danger">Please Select Pana!</div>
</div>

</div>

</div>

<script>

$("#pana").change(function(){

let pana=this.value;

let point=parseInt(pana[0])+parseInt(pana[1])+parseInt(pana[2]);

$("#digit").val(point%10);

});

</script>
`;

    res.send(html);

  } catch (err) {
    console.error(err);
    res.send("Error loading result form");
  }
};







exports.saveResultOld = async (req, res) => {
  try {

    const { date, game_id, session, pana, digit } = req.body;

    const r = await dbQuery(`
        SELECT * FROM declear_result
        WHERE game_id=$1
        AND to_date(result_date,'DD Mon YYYY')=$2::date
    `, [game_id, date]);

    if (session === "Open") {

      if (r.rows.length) {

        await dbQuery(`
                UPDATE declear_result
                SET open_pana=$1,
                    open_digit=$2
                WHERE game_id=$3
                AND to_date(result_date,'DD Mon YYYY')=$4::date
            `, [pana, digit, game_id, date]);

      } else {

        await dbQuery(`
                INSERT INTO declear_result
                (result_date,game_id,open_pana,open_digit)
                VALUES(
                    to_char($1::date,'DD Mon YYYY'),
                    $2,$3,$4
                )
            `, [date, game_id, pana, digit]);

      }

    }

    if (session === "Close") {

      await dbQuery(`
            UPDATE declear_result
            SET close_pana=$1,
                close_digit=$2
            WHERE game_id=$3
            AND to_date(result_date,'DD Mon YYYY')=$4::date
        `, [pana, digit, game_id, date]);

    }

    res.json({
      res: "success",
      msg: "Saved"
    });

  } catch (err) {
    console.log(err)
    res.json({
      res: "error",
      msg: "Server error"
    })
  }
}





exports.declareResultOLD = async (req, res) => {

  try {

    const { date, game_id, session } = req.body;

    const r = await dbQuery(`
SELECT * FROM declear_result
WHERE game_id=$1
AND to_date(result_date,'DD Mon YYYY')=$2::date
`, [game_id, date]);

    if (!r.rows.length) {
      return res.json({ res: "error", msg: "Result not found" })
    }

    let result = r.rows[0];

    if (session === "Open") {

      await dbQuery(`
UPDATE declear_result
SET open_result='Declared',
open_declare_date=NOW()
WHERE id=$1
`, [result.id]);

    }

    if (session === "Close") {

      await dbQuery(`
UPDATE declear_result
SET close_result='Declared',
close_declare_date=NOW()
WHERE id=$1
`, [result.id]);

    }

    res.json({
      res: "success",
      msg: "Result Declared"
    })

  } catch (err) {

    console.log(err)
    res.json({
      res: "error",
      msg: "Server error"
    })

  }
}





































































































exports.showWinnerOld = async (req, res) => {

  try {

    const { date, game_id, session } = req.body;

    const result = await dbQuery(`
SELECT * FROM declear_result
WHERE game_id=$1
AND to_date(result_date,'DD Mon YYYY')=$2::date
`, [game_id, date]);

    if (!result.rows.length) {
      return res.json([])
    }

    const data = result.rows[0];

    const bids = await dbQuery(`
SELECT u.name,b.*
FROM user_bid b
JOIN users u ON u.id=b.user_id
WHERE b.game_id=$1
AND to_date(b.game_date,'DD Mon YYYY')=$2::date
`, [game_id, date]);

    let winners = [];

    bids.rows.forEach(v => {

      if (session === "Open") {

        if (v.pana === data.open_pana || v.pana === data.open_digit) {
          winners.push(v)
        }

      } else {

        if (v.pana === data.close_pana || v.pana === data.close_digit) {
          winners.push(v)
        }

      }

    })

    res.json(winners)

  } catch (err) {
    console.log(err)
    res.json([])
  }

}



exports.delete = async (req, res) => {
    try {
        const id = req.params.id;
        const title = req.params.title;
        if(title=='delete'){
        await dbQuery(`DELETE FROM declear_result WHERE id = $1`, [id]);
        }else{
          
          await dbQuery(`UPDATE declear_result SET  close_pana = '',close_digit='',close_result='',close_declare_date='' WHERE id = $1`, [id]);
        }

        return res.json({
            status: true,
            message: "Deleted successfully"
        });

    } catch (error) {
        return res.json({
            status: false,
            message: "Delete failed"
        });
    }
};