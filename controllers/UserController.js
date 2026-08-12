// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const bcrypt = require("bcrypt");
const { sendSingleNotification } = require("../utils/sendNotification");











function processBid(v) {
  let pana = v.pana ? v.pana.toString() : "";

  let open_paana = "N/A";
  let open_digit = "N/A";
  let close_paana = "N/A";
  let close_digit = "N/A";
  let jodi_digit = "N/A";

  /* ======================
     OPEN PAANA
  ====================== */
   if ( (v.game_type === "Half Sangam"  && v.session === "Close") ||   v.game_type === "Full Sangam" || (v.game_type === "SP Pana"  && v.session === "Close") || (v.game_type === "DP Pana"  && v.session === "Close") || (v.game_type === "TP Pana"  && v.session === "Close")   ) 
  {
    close_paana = pana.substring(0, 3);
  } else if (
    ["Single Pana", "Double Pana", "Tripple Pana","DP Pana","SP Pana","TP Pana"].includes(v.game_type) &&
    v.session === "Open"
  ) {
    open_paana = pana;
  }

  

  /* ======================
     OPEN DIGIT
  ====================== */
  if (
    ["Single Digit", "Half Sangam"].includes(v.game_type) &&
    v.session === "Open"
  ) {
    open_digit = pana.charAt(0);
  }

  /* ======================
     CLOSE PAANA
  ====================== */
  if (
    (v.game_type === "Half Sangam" && v.session === "Open") ||
    v.game_type === "Full Sangam"
  ) {
    close_paana = pana.slice(-3);
  } else if (
    ["Single Pana", "Double Pana", "Tripple Pana"].includes(v.game_type) &&
    v.session === "Close"
  ) {
    close_paana = pana;
  }

  /* ======================
     CLOSE DIGIT
  ====================== */
  if (
    ["Single Digit", "Half Sangam"].includes(v.game_type) &&
    v.session === "Close"
  ) {
    close_digit = pana.slice(-1);
  }

  /* ======================
     JODI DIGIT
  ====================== */
  if (v.game_type === "Jodi Digit") {
    jodi_digit = pana;
  }


  return {
    ...v,
    open_paana,
    open_digit,
    close_paana,
    close_digit,
    jodi_digit
  };
}
/* Dashboard */

exports.index = async (req, res) => {
  try {
    const counts = {};

    res.render("users/index", {
      layout: "layouts/admin",
      title: "Users List",
      csrfToken: req.csrfToken(),
      admin: req.session.admin,
      counts
    });

  } catch (error) {
    console.error("Dashboard index error:", error);
    res.status(500).send("Dashboard error");
  }
};



exports.changeUserPin = async (req,res)=>{

  try{

    const {user_id,pin} = req.body;

    if(!pin){

      return res.json({
        success:false,
        message:"Please Enter Security Pin"
      });

    }

    const userResult = await dbQuery(
    "SELECT pin FROM users WHERE id=$1",
    [user_id]
    );

  if(userResult.rows.length === 0){

    return res.json({
      success:false,
      message:"User not found"
    });

  }

const currentPin = userResult.rows[0].pin;

const samePin = await bcrypt.compare(pin,currentPin);

if(samePin){

return res.json({
success:false,
message:"New & Current Pin are same"
});

}

const hashedPin = await bcrypt.hash(pin,10);

await dbQuery(
"UPDATE users SET pin=$1 WHERE id=$2",
[hashedPin,user_id]
);

return res.json({
success:true,
message:"Pin Updated Successfully"
});

}catch(err){

console.log(err);

return res.json({
success:false,
message:"Pin not changed"
});

}

};


exports.getUsersData = async (req, res) => {
  try {
    /* ===============================
       SAFETY
    =============================== */
    const request = req.body || {};

    const draw   = parseInt(request.draw ?? 1);
    const start  = parseInt(request.start ?? 0);
    const limit  = parseInt(request.length ?? 10);
    const search = request.search?.value || "";

    const filterType = request.filter_type || "";
    const fromDate = request.from_date;
    const toDate = request.to_date;

    /* ===============================
       WHERE CONDITIONS
    =============================== */
    let where = `
      WHERE u.delete_status = 'false'
        AND u.otp_status = 'true'
    `;
    //  AND u.status = 'true'
    const params = [];

    if (filterType === "today") {
      where += ` AND DATE(u.date) = CURRENT_DATE`;
    }

    if (filterType === "players") {
      where += ` AND u.id IN (SELECT DISTINCT user_id FROM user_bid)`;
    }

    if (filterType === "active_today") {
      where += `
        AND u.id IN (
          SELECT DISTINCT user_id
          FROM wallet
          WHERE DATE(txn_date) = CURRENT_DATE
        )
      `;
    }

    if (fromDate && toDate) {
      params.push(fromDate);
      params.push(toDate);

      where += `
        AND DATE(u.date) BETWEEN $${params.length - 1} AND $${params.length}
      `;
    }

    if (search) {
      params.push(`%${search}%`);
      where += `
        AND (
          u.name ILIKE $${params.length}
          OR u.mobile ILIKE $${params.length}
          OR u.email ILIKE $${params.length}
        )
      `;
    }

    /* ===============================
       TOTAL RECORDS
    =============================== */
    const totalQuery = `
      SELECT COUNT(*)
      FROM users u
      WHERE u.delete_status = 'false'
        AND u.otp_status = 'true'
    `;
    const totalResult = await dbQuery(totalQuery);
    const recordsTotal = parseInt(totalResult.rows[0].count);

    /* ===============================
       FILTERED RECORDS
    =============================== */
    const filteredQuery = `
      SELECT COUNT(*)
      FROM users u
      ${where}
    `;
    const filteredResult = await dbQuery(filteredQuery, params);
    const recordsFiltered = parseInt(filteredResult.rows[0].count);

    /* ===============================
       USERS DATA + WALLET BALANCE
    =============================== */
    const dataQuery = `
      SELECT 
        u.*,
        COALESCE(
          (
            SELECT w.txn_clbal::numeric
            FROM wallet w
            WHERE w.user_id = u.id
            ORDER BY w.id DESC
            LIMIT 1
          ), 0
        ) AS balance
      FROM users u
      ${where}
      ORDER BY u.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const usersResult = await dbQuery(
      dataQuery,
      [...params, limit, start]
    );

    /* ===============================
       FORMAT RESPONSE
    =============================== */
    const data = [];
    let i = start + 1;

    for (const user of usersResult.rows) {

      // const transferHtml = user.transfer_status === 'true'
      //   ? `<span class="badge bg-success">Yes</span>`
      //   : `<span class="badge bg-danger">No</span>`;

      const transferHtml =
        user.transfer_status === 'true'
        ? `<a class="badge bg-success text-white"
            onclick="changeStatus(${user.id},'transfer_status','false','Transfer Disable')">
            Yes
          </a>`
        : `<a class="badge bg-danger text-white"
            onclick="changeStatus(${user.id},'transfer_status','true','Transfer Enable')">
            No
          </a>`;





      // const statusHtml = user.status === 'true'
      //   ? `<span class="badge bg-success">Active</span>`
      //   : `<span class="badge bg-danger">Inactive</span>`;


      const statusHtml =
        user.status === 'true'
        ? `<a class="badge bg-success text-white"
            onclick="changeStatus(${user.id},'status','false','Deactivate')">
            Active
          </a>`
        : `<a class="badge bg-danger text-white"
            onclick="changeStatus(${user.id},'status','true','Activate')">
            Inactive
          </a>`;


// <button class="btn btn-sm btn-danger text-white"
//           onclick="DeleteUser(${user.id},'id','user','Delete')">
//           <i class="fa fa-trash"></i>
//         </button>


      const action = `
        <a class="btn btn-sm btn-info text-white"
           href="/admin/SingleUser/${user.id.toString()}">
          <i class="fa fa-eye"></i>
        </a>
        
      `;

      data.push({
        no: i++,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        date: user.date,
        balance: `₹${Number(user.balance).toFixed(2)}`,
        transfer: transferHtml,
        status: statusHtml,
        action
      });
    }

    /* ===============================
       DATATABLE RESPONSE
    =============================== */
    return res.json({
      draw,
      recordsTotal,
      recordsFiltered,
      csrfToken: req.csrfToken(),
      data
    });

  } catch (error) {
    console.error("getUsersData error:", error);
    return res.status(500).json({
      draw: 1,
      recordsTotal: 0,
      recordsFiltered: 0,
      data: []
    });
  }
};


// exports.singleUser = async (req, res) => {
//   try {
//     const userId = parseInt(req.params.id);

//     if (!userId) {
//       return res.redirect('/admin/users');
//     }

//     /* =========================
//        USER BASIC DETAILS
//     ========================== */
//     const userResult = await dbQuery(
//       `SELECT * FROM users WHERE id = $1`,
//       [userId]
//     );

//     if (userResult.rows.length === 0) {
//       return res.redirect('/admin/users');
//     }

//     /* =========================
//        PAYMENT DETAILS
//     ========================== */
//     const paymentResult = await dbQuery(
//       `SELECT * FROM payment_details WHERE user_id = $1`,
//       [userId]
//     );

//     /* =========================
//        CURRENT BALANCE
//     ========================== */
//     const walletResult = await dbQuery(`
//       SELECT COALESCE(txn_clbal::numeric, 0) AS balance
//       FROM wallet
//       WHERE user_id = $1
//       ORDER BY id DESC
//       LIMIT 1
//     `, [userId]);

//     /* =========================
//        TOTAL BID
//     ========================== */
//     const totalBidResult = await dbQuery(`
//       SELECT COALESCE(SUM(points::numeric), 0) AS total
//       FROM user_bid
//       WHERE user_id = $1
//     `, [userId]);

//     /* =========================
//        TOTAL WINNING
//     ========================== */
//     const totalWinResult = await dbQuery(`
//       SELECT COALESCE(SUM(amount::numeric), 0) AS total
//       FROM win_history
//       WHERE user_id = $1
//     `, [userId]);

//     /* =========================
//        TOTAL DEPOSIT
//     ========================== */
//     const totalDepositResult = await dbQuery(`
//       SELECT COALESCE(SUM(txn_crdt::numeric), 0) AS total
//       FROM wallet
//       WHERE user_id = $1
//       AND txn_comment IN 
//       ('Online UPI Credit From App', 'Direct Credit By Admin')
//     `, [userId]);

//     /* =========================
//        TOTAL WITHDRAW
//     ========================== */
//     const totalWithdrawResult = await dbQuery(`
//       SELECT COALESCE(SUM(amount::numeric), 0) AS total
//       FROM withdraw_request
//       WHERE user_id = $1
//       AND status = 'Accepted'
//     `, [userId]);

//     /* =========================
//        RENDER PAGE
//     ========================== */
//     res.render('users/single-user', {
//       layout: 'layouts/admin',
//       title: 'User Details',
//       admin: req.session.admin,
//       user: userResult.rows[0],
//        csrfToken: req.csrfToken(),
//       payment: paymentResult.rows[0] || {},
//       balance: walletResult.rows[0]?.balance || 0,
//       stats: {
//         totalBid: totalBidResult.rows[0].total,
//         totalWin: totalWinResult.rows[0].total,
//         totalDeposit: totalDepositResult.rows[0].total,
//         totalWithdraw: totalWithdrawResult.rows[0].total
//       }
//     });

//   } catch (error) {
//     console.error("singleUser error:", error);
//     res.redirect('/admin/users');
//   }
// };










exports.withdrawFund = async (req, res) => {
  try {

    const { user_id, amount } = req.body;

    if (!user_id || !amount) {
      return res.json({
        success:false,
        message:"Amount required"
      });
    }

    /* CURRENT BALANCE */

    const balanceResult = await dbQuery(`
      SELECT COALESCE(txn_clbal::numeric,0) AS balance
      FROM wallet
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 1
    `,[user_id]);

    const currentBalance = balanceResult.rows[0]?.balance || 0;

    if (currentBalance < amount) {
      return res.json({
        success:false,
        message:"Insufficient Balance"
      });
    }

    const newBalance = parseFloat(currentBalance) - parseFloat(amount);

    /* INSERT WALLET ENTRY */

    await dbQuery(`
      INSERT INTO wallet
      (user_id, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date)
      VALUES ($1,0,$2,$3,'Withdraw By Admin',NOW())
    `,[user_id,amount,newBalance]);

    res.json({
      success:true,
      message:"Withdraw Successful"
    });

  } catch (error) {

    console.log(error);

    res.json({
      success:false,
      message:"Something went wrong"
    });

  }
};







exports.addFund = async (req, res) => {
  try {

    const { user_id, amount } = req.body;

    if (!user_id || !amount) {
      return res.json({
        success: false,
        message: "Amount required"
      });
    }

    /* CURRENT BALANCE */

    const balanceResult = await dbQuery(`
      SELECT COALESCE(txn_clbal::numeric,0) AS balance
      FROM wallet
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 1
    `,[user_id]);

    const currentBalance = balanceResult.rows[0]?.balance || 0;

    const newBalance = parseFloat(currentBalance) + parseFloat(amount);

    /* INSERT WALLET ENTRY */

    await dbQuery(`
      INSERT INTO wallet
      (user_id, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_date)
      VALUES ($1,$2,0,$3,'Direct Credit By Admin',NOW())
    `,[user_id,amount,newBalance]);

    // 🔔 Deposit notification (Firebase — only if notif_deposit = 1)
    try {
      console.log(`🔍 [UserController.addFund] Checking deposit notif for User ID: ${user_id}`);
      const userNotif = await dbQuery(
        `SELECT fcm_token, notif_deposit FROM users WHERE id = $1 LIMIT 1`,
        [user_id]
      );
      console.log(`🔍 [UserController.addFund] DB Result:`, JSON.stringify(userNotif.rows[0] || null));
      if (
        userNotif.rows.length &&
        userNotif.rows[0].fcm_token &&
        Number(userNotif.rows[0].notif_deposit) === 1
      ) {
        await sendSingleNotification(
          userNotif.rows[0].fcm_token,
          "✅ Fund Added Successfully",
          `₹${amount} has been credited to your wallet by Admin.`
        );
        console.log(`📲 Deposit notification sent to User ID: ${user_id}`);
      } else if (userNotif.rows.length && Number(userNotif.rows[0].notif_deposit) === 0) {
        console.log(`🔕 Deposit notification OFF for User ID: ${user_id}, skipped`);
      } else if (!userNotif.rows.length) {
        console.log(`❌ User ID ${user_id} not found in users table`);
      } else if (!userNotif.rows[0].fcm_token) {
        console.log(`❌ FCM token missing for User ID: ${user_id}`);
      }
    } catch (notifErr) {
      console.error("❌ Deposit Notification Error:", notifErr);
    }

    res.json({
      success:true,
      message:"Fund Added Successfully"
    });

  } catch (error) {

    console.log(error);

    res.json({
      success:false,
      message:"Something went wrong"
    });

  }
};





exports.singleUser = async (req, res) => {
  try {

    const userId = parseInt(req.params.id);

    if (!userId) {
      return res.redirect('/admin/users');
    }

    /* =========================
       USER DETAILS
    ========================== */

    const userResult = await dbQuery(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.redirect('/admin/users');
    }




    const result = await dbQuery(`
      SELECT 
        u.*,
        pd.bank_name,
        pd.branch,
        pd.account_holder_name,
        pd.account_no,
        pd.ifsc_code,
        pd.phonepe,
        pd.google_pay,
        pd.paytm
      FROM users u
      LEFT JOIN payment_details pd 
        ON pd.user_id = u.id
      WHERE u.id = $1
    `, [userId]);

    








    /* =========================
       PAYMENT DETAILS
    ========================== */

    const paymentResult = await dbQuery(
      `SELECT * FROM payment_details WHERE user_id = $1`,
      [userId]
    );

    /* =========================
       CURRENT BALANCE
    ========================== */

    const walletBalance = await dbQuery(`
      SELECT COALESCE(txn_clbal::numeric,0) AS balance
      FROM wallet
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 1
    `,[userId]);


    /* =========================
       TOTAL BID
    ========================== */

    const totalBid = await dbQuery(`
      SELECT COALESCE(SUM(points::numeric),0) AS total
      FROM user_bid
      WHERE user_id=$1
    `,[userId]);


    /* =========================
       TOTAL WINNING
    ========================== */

    const totalWin = await dbQuery(`
      SELECT COALESCE(SUM(amount::numeric),0) AS total
      FROM win_history
      WHERE user_id=$1
    `,[userId]);


    /* =========================
       TOTAL DEPOSIT
    ========================== */

    const totalDeposit = await dbQuery(`
      SELECT COALESCE(SUM(txn_crdt::numeric),0) AS total
      FROM wallet
      WHERE user_id=$1
      AND txn_comment IN
      ('Online UPI Credit From App','Direct Credit By Admin')
    `,[userId]);


    /* =========================
       TOTAL WITHDRAW
    ========================== */

    const totalWithdraw = await dbQuery(`
      SELECT COALESCE(SUM(amount::numeric),0) AS total
      FROM withdraw_request
      WHERE user_id=$1
      AND status='Accepted'
    `,[userId]);


    /* =========================
       DEPOSIT HISTORY depositHistory
    ========================== */

    const depositHistory = await dbQuery(`
      SELECT transaction_id,
      txn_date,
      txn_crdt,
      txn_comment
      FROM wallet
      WHERE user_id=$1
      AND txn_comment IN
      ('Online UPI Credit From App','Direct Credit By Admin')
      ORDER BY id DESC
      LIMIT 500
    `,[userId]);


    /* =========================
       WITHDRAW HISTORY
    ========================== */

    const withdrawHistory = await dbQuery(`
      SELECT id,
      amount,
      payment_mode,
      reason,
      status,
      date
      FROM withdraw_request
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 50
    `,[userId]);


    /* =========================
       BID HISTORY
    ========================== */

    const bidHistory = await dbQuery(`
      SELECT *
      FROM user_bid
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 50
    `,[userId]);

       const databidHistory = bidHistory.rows.map(processBid);
    /* =========================
       WALLET HISTORY
    ========================== */

    const walletHistory = await dbQuery(`
      SELECT transaction_id,
      txn_date,
      txn_crdt,
      txn_dbdt,
      txn_comment
      FROM wallet
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 50
    `,[userId]);


    /* =========================
       RENDER PAGE
    ========================== */

    res.render('users/single-user',{

      layout:'layouts/admin',
      title:'User Details',
      admin:req.session.admin,
      csrfToken:req.csrfToken(),

      user:userResult.rows[0],
      userBank : result.rows[0],

      payment:paymentResult.rows[0] || {},

      balance:walletBalance.rows[0]?.balance || 0,

      stats:{
        totalBid:totalBid.rows[0].total,
        totalWin:totalWin.rows[0].total,
        totalDeposit:totalDeposit.rows[0].total,
        totalWithdraw:totalWithdraw.rows[0].total
      },

      depositHistory:depositHistory.rows,

      withdrawHistory:withdrawHistory.rows,

      bidHistory:databidHistory,

      walletHistory:walletHistory.rows

    });

  } 
  catch (error) {

    console.error("singleUser error:", error);

    res.redirect('/admin/users');

  }
};







exports.walletHistory = async (req,res)=>{

    try{

        const userId = req.params.id;

        const result = await dbQuery(`
            SELECT
                id,
                transaction_id,
                txn_crdt,
                txn_dbdt,
                txn_comment,
                txn_date
            FROM wallet
            WHERE user_id = $1
            ORDER BY id DESC
            LIMIT 50
        `,[userId]);

        res.json({
            status:true,
            data:result.rows
        });

    }catch(err){

        console.log(err);

        res.json({
            status:false,
            data:[]
        });

    }

}








exports.singleUserBidHis = async (req,res)=>{

    try{

        const userId = req.params.id;

        const result = await dbQuery(`
            SELECT
                ub.id,
                ub.bid_txn_id,
                g.name AS game_name,
                ub.game_type,
                ub.session,
                ub.pana,
                ub.points,
                ub.win_amount,
                ub.game_date,
                ub.date
            FROM user_bid ub
            LEFT JOIN game g ON g.id = ub.game_id
            WHERE ub.user_id = $1
            ORDER BY ub.id DESC
        `,[userId]);



         const databidHistory = result.rows.map(processBid);
        res.json({
            status:true,
            data:databidHistory
        });

    }catch(err){

        console.log(err);

        res.json({
            status:false,
            data:[]
        });

    }

}







// exports.singleUser = async (req, res) => {
//   // try {
//     const userId = req.params.id;

//     const user = await dbQuery(
//       "SELECT * FROM users WHERE id = $1",
//       [userId]
//     );

//     const payment = await dbQuery(
//       "SELECT * FROM payment_details WHERE user_id = $1",
//       [userId]
//     );

//     const wallet = await dbQuery(`
//       SELECT COALESCE(txn_clbal,0) as balance
//       FROM wallet
//       WHERE user_id = $1
//       ORDER BY id DESC LIMIT 1
//     `,[userId]);

//     const totalBid = await dbQuery(
//       "SELECT COALESCE(SUM(points),0) as total FROM user_bid WHERE user_id=$1",
//       [userId]
//     );

//     const totalWin = await dbQuery(
//       "SELECT COALESCE(SUM(amount),0) as total FROM win_history WHERE user_id=$1",
//       [userId]
//     );

//     const totalDeposit = await dbQuery(`
//       SELECT COALESCE(SUM(txn_crdt),0) as total
//       FROM wallet
//       WHERE user_id=$1
//       AND txn_comment IN ('Online UPI Credit From App','Direct Credit By Admin')
//     `,[userId]);

//     const totalWithdraw = await dbQuery(`
//       SELECT COALESCE(SUM(amount),0) as total
//       FROM withdraw_request
//       WHERE user_id=$1 AND status='Accepted'
//     `,[userId]);

//     res.render("users/single-user",{
//       layout:"layouts/admin",
//       user: user.rows[0],
//       csrfToken: req.csrfToken(),
//       payment: payment.rows[0] || {},
//       balance: wallet.rows[0]?.balance || 0,
//       stats:{
//         totalBid: totalBid.rows[0].total,
//         totalWin: totalWin.rows[0].total,
//         totalDeposit: totalDeposit.rows[0].total,
//         totalWithdraw: totalWithdraw.rows[0].total
//       }
//     });

  // } catch(err){
  //   console.log(err);
  //   res.redirect('/admin/users');
  // }
// };


// exports.singleUser = async (req, res) => {
//   try {
//     const userId = req.params.id;

//     const userResult = await dbQuery(
//       "SELECT * FROM users WHERE id = $1",
//       [userId]
//     );

//     if (userResult.rows.length === 0) {
//       return res.redirect('/admin/users');
//     }

//     res.render('users/single-user', {
//       layout: 'layouts/admin',
//       title: 'User Details',
//       admin: req.session.admin,
//       csrfToken: req.csrfToken(),
//       user: userResult.rows[0]
//     });

//   } catch (error) {
//     console.error(error);
//     res.redirect('/admin/users');
//   }
// };


exports.updateUserStatus = async (req, res) => {
  try {

    const { id, column, status } = req.body;

    if (!id || !column || !status) {
      return res.json({ success: false });
    }

    const query = `
      UPDATE users
      SET ${column} = $1
      WHERE id = $2
    `;

    await dbQuery(query, [status, id]);

    return res.json({
      success: true,
      message: "Status Updated"
    });

  } catch (error) {
    console.error("updateUserStatus error:", error);
    return res.json({ success: false });
  }
};



exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({
        success: false,
        message: "User ID required"
      });
    }

    // Soft Delete (recommended)
    await dbQuery(
      `UPDATE users SET delete_status = 'true' WHERE id = $1`,
      [id]
    );

    return res.json({
      success: true,
      message: "User Deleted Successfully"
    });

  } catch (error) {
    console.error("deleteUser error:", error);
    return res.json({
      success: false,
      message: "Delete Failed"
    });
  }
};









exports.getWithdrawList = async (req, res) => {
  try {

    const { user_id } = req.body;

    const result = await dbQuery(`
      SELECT * FROM withdraw_request
      WHERE user_id = $1
      ORDER BY id DESC
    `, [user_id]);

    return res.json({
      success: true,
      data: result.rows
    });

  } catch (err) {
    console.log(err);
    return res.json({
      success: false,
      data: []
    });
  }
};





// exports.updateWithdrawStatus = async (req, res) => {
//   try {

//     const { id, status } = req.body;

//     await dbQuery(
//       `UPDATE withdraw_request 
//        SET status = $1 
//        WHERE id = $2`,
//       [status, id]
//     );

//     return res.json({ success: true });

//   } catch (error) {
//     console.log(error);
//     return res.json({ success: false });
//   }
// };













exports.winningHistory = async (req, res) => {

    try {

        const userId = req.params.userId;
        const { date } = req.query;

        let where = [];
        let values = [];
        let i = 1;

        where.push(`w.user_id::integer = $${i++}`);
        values.push(userId);

        if(date){

            where.push(`DATE(w.date) = $${i++}`);
            values.push(date);

        }

        const condition = where.length
            ? `WHERE ${where.join(" AND ")}`
            : "";

        const result = await dbQuery(`

            SELECT 
                w.*,
                u.mobile,
                g.name AS game_name

            FROM win_history w

            LEFT JOIN "users" u
                ON u.id = w.user_id::integer

            LEFT JOIN game g
                ON g.id = w.game_id::integer

            ${condition}

            ORDER BY w.id DESC

            LIMIT 500

        `, values);

        res.json({
            status: true,
            data: result.rows
        });

    } catch (err) {

        console.log("winningHistory Error =>", err);

        res.json({
            status: false,
            data: []
        });

    }

};













exports.updateWithdrawStatus = async (req, res) => {

  // const client = await pool.connect();

  try {

    const { id, status, reason = "" } =
      req.body;

    // await client.query("BEGIN");

    // Withdraw Details
    const withdraw = await dbQuery(
      `SELECT *
       FROM withdraw_request
       WHERE id=$1
       FOR UPDATE`,
      [id]
    );

    if (!withdraw.rows.length) {

   

      return res.json({
        success: false,
        msg: "Request not found"
      });

    }

    const data = withdraw.rows[0];

    // Already Processed
    if (
      data.status === "Accepted" ||
      data.status === "Rejected"
    ) {

      return res.json({
        success: false,
        msg: "Already processed"
      });

    }

    // Reject → Refund
    if (status === "Rejected") {

      const wallet =
        await dbQuery(
          `SELECT txn_clbal
           FROM wallet
           WHERE user_id=$1
           AND role IS NULL
           ORDER BY id DESC
           LIMIT 1
           FOR UPDATE`,
          [data.user_id]
        );

      const currentBalance =
        wallet.rows.length
        ? Number(
            wallet.rows[0]
              .txn_clbal
          )
        : 0;

      const newBalance =
        currentBalance +
        Number(data.amount);

      // Refund Wallet Entry
      await dbQuery(
        `INSERT INTO wallet
        (
          user_id,
          txn_opbal,
          txn_crdt,
          txn_dbdt,
          txn_clbal,
          txn_comment,
          txn_date,
          transfer_user_id,
          transaction_id,
          txn_type
        )
        VALUES(
          $1,$2,$3,$4,$5,
          $6,NOW(),$7,$8,$9
        )`,
        [
          data.user_id,
          currentBalance,
          data.amount,
          0,
          newBalance,
          "Withdraw Refund",
          "Admin",
          Date.now(),
          "Refund"
        ]
      );

    }

    // Update Status
    await dbQuery(
      `UPDATE withdraw_request
       SET
       status=$1,
       reason=$2
       WHERE id=$3`,
      [
        status,
        reason,
        id
      ]
    );


    return res.json({
      success: true,
      msg:
        status === "Rejected"
        ? "Rejected & Refunded"
        : "Accepted Successfully"
    });

  } catch (error) {

  

    return res.json({
      success: false
    });

  } finally {

  }

};

