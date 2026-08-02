// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const moment = require("moment");
const resultService = require("../services/resultService");
const { formatResultDate } = require("../utils/dateHelper");
const {
  sendSingleNotification,
  sendMultiNotification,
  sendAll
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
    const today = new Date().toISOString().slice(0, 10);

    const result = await dbQuery(`
      SELECT g.*
      FROM game g
      LEFT JOIN declear_result d
        ON g.id = d.game_id::integer
       AND to_date(d.result_date, 'DD Mon YYYY') = $1::date
      WHERE g.status = 'true'
    `, [today]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
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

    const { date, game_id, session, pana, digit } = req.body

    const rdate = moment(date).format("DD MMM YYYY")
    const now = moment().format("DD MMM YYYY hh:mm:ss A")

    if (!date || !game_id || !session || !pana) {
      return res.json({ res: "error", msg: "Data require" })
    }

    /* ==============================
    GET RESULT
    ============================== */

    const result = await dbQuery(`
SELECT * FROM declear_result
WHERE result_date=$1
AND game_id=$2
ORDER BY id DESC
LIMIT 1
`, [rdate, game_id])

    if (!result.rows.length) {
      return res.json({ res: "error", msg: "Result Not Found" })
    }

    const data = result.rows[0]

    /* ==============================
    OPEN DECLARE
    ============================== */

    if (session === "Open") {

      await dbQuery(`
UPDATE declear_result
SET
open_declare_date=$1,
open_result='Declared'
WHERE
result_date=$2
AND game_id=$3
`, [
        now,
        data.result_date,
        data.game_id
      ])

      /* WINNER CHECK */

      const bids = await dbQuery(`
SELECT * FROM user_bid
WHERE
game_date=$1
AND session='Open'
AND game_id=$2
ORDER BY id DESC
`, [
        data.result_date,
        data.game_id
      ])

      for (const v of bids.rows) {

        if (
          (v.pana === data.open_digit && v.game_type === "Single Digit") ||
          (v.pana === data.open_pana && v.game_type === "Single Pana") ||
          (v.pana === data.open_pana && v.game_type === "Double Pana") ||
          (v.pana === data.open_pana && v.game_type === "Tripple Pana")
        ) {

          await creditWallet(v, data)

        }

      }

      const game = await dbQuery(`
        SELECT name
        FROM game
        WHERE id = $1
        `, [
            data.game_id
        ]);

      var title = data.open_pana+'-'+data.open_digit+'*-***';
      var body = game.rows[0]?.name+' Result'

      await sendAll(
        "all",
        title,
        body
      );





      return res.json({
        res: "success",
        msg: "Result Declared"
      })

    }

    /* ==============================
    CLOSE DECLARE
    ============================== */

    if (session === "Close") {

      if (!data.open_declare_date) {
        return res.json({
          res: "error",
          msg: "Declare Open Result First"
        })
      }

      await dbQuery(`
UPDATE declear_result
SET
close_declare_date=$1,
close_result='Declared'
WHERE
result_date=$2
AND game_id=$3
`, [
        now,
        data.result_date,
        data.game_id
      ])

      const bids = await dbQuery(`
SELECT * FROM user_bid
WHERE
game_date=$1
AND game_id=$2
ORDER BY id DESC
`, [
        data.result_date,
        data.game_id
      ])

      const jodi = data.open_digit + data.close_digit
      const half1 = data.open_digit + data.close_pana
      const half2 = data.open_pana + data.close_digit
      const full = data.open_pana + data.close_pana

      for (const v of bids.rows) {

        if (
          v.pana === data.close_pana ||
          v.pana === data.close_digit ||
          v.pana === full
        ) {

          await creditWallet(v, data)

        }

        if (v.pana === jodi) {
          await creditWallet(v, data)
        }

        if (v.game_type === "Half Sangam") {
          if (v.pana === half1 || v.pana === half2) {
            await creditWallet(v, data)
          }
        }

      }


       const game = await dbQuery(`
        SELECT name
        FROM game
        WHERE id = $1
        `, [
            data.game_id
        ]);

      var title = data.open_pana+'-'+data.open_digit+''+data.close_digit+'-'+data.close_pana;
      var body = game.rows[0]?.name+' Result'

      await sendAll(
        "all",
        title,
        body
      );


      return res.json({
        res: "success",
        msg: "Result Declared"
      })

    }

  } catch (err) {

    console.log(err)

    res.json({
      res: "error",
      msg: "Server Error"
    })

  }

}









async function creditWallet(bid, result) {

  const txn_id = Math.floor(Math.random() * 99999999)

  const user_id = bid.user_id
  const amount = Number(bid.win_amount)
  const now = moment().format("DD MMM YYYY hh:mm:ss A")

  const last = await dbQuery(`
SELECT * FROM wallet
WHERE user_id=$1
ORDER BY id DESC
LIMIT 1
`, [user_id])

  let opening = 0
  let closing = amount

  if (last.rows.length) {

    opening = Number(last.rows[0].txn_clbal) || 0
    closing = opening + amount

  }

  console.log(closing);

  await dbQuery(`
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
VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
  ])

  await dbQuery(`
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
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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
    ])

}
































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