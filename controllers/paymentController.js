const axios = require("axios");
// const db = require("../config/db");


const dbQuery = require("../utils/dbQuery");


exports.createPayment = async (req, res) => {
  try {
    const { amount, mobileNumber, custEmail, custName } = req.body;

    //console.log("Request Body:", req.body);

    // ✅ user find
    const userResult = await dbQuery(
      "SELECT id FROM users WHERE mobile = $1 AND delete_status = 'false'",
      [mobileNumber]
    );

    //console.log("User Result:", userResult.rows);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const user_id = userResult.rows[0].id;

    const custRefNum = "REF" + Date.now();

    // ✅ INSERT TEST
    const insertResult = await dbQuery(
      `INSERT INTO payments (custRefNum, user_id, amount, status)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [custRefNum, user_id, amount, "pending"]
    );

    //console.log("Inserted Payment:", insertResult.rows);

    // ✅ gateway call
    const payload = {
      authEmail: "siddhujain2628@gmail.com",
      amount: parseFloat(amount),
      mobileNumber,
      custRefNum,
      custEmail,
      custName,
      apiKey: "10ae1fe170997095e9d422334411b279"
    };

    const response = await axios.post(
      "https://primexpay.in/api/payments/create",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );

    return res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    //console.error("ERROR =>", error.message);
    //console.error("FULL ERROR =>", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


// exports.createPayment = async (req, res) => {
//   try {
//     const { amount, mobileNumber, custEmail, custName } = req.body;

//     // ✅ 1. user_id mobile se nikalo
//     const userResult = await dbQuery(
//       "SELECT id FROM users WHERE mobile = $1",
//       [mobileNumber]
//     );

//     if (userResult.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found with this mobile number"
//       });
//     }

//     const user_id = userResult.rows[0].id;

//     // 🔥 Unique Ref
//     const custRefNum = "REF" + Date.now();

//     // ✅ 2. Payment DB me save karo
//     await dbQuery(
//       `INSERT INTO payments (custRefNum, user_id, amount, status)
//        VALUES ($1, $2, $3, $4)`,
//       [custRefNum, user_id, amount, "pending"]
//     );

//     // ✅ 3. Gateway call
//     const payload = {
//       authEmail: "siddhujain2628@gmail.com",
//       amount: parseFloat(amount),
//       mobileNumber,
//       custRefNum,
//       custEmail,
//       custName,
//       apiKey: "10ae1fe170997095e9d422334411b279"
//     };

//     const response = await axios.post(
//       "https://primexpay.in/api/payments/create",
//       payload,
//       {
//         headers: { "Content-Type": "application/json" }
//       }
//     );

//     return res.json({
//       success: true,
//       custRefNum,
//       data: response.data
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       success: false,
//       message: "Payment create failed"
//     });
//   }
// };











exports.paymentCallback = async (req, res) => {
  try {
    const { custRefNum, status, amount } = req.body;

    //console.log("Callback Data:", req.body);

    // ✅ 1. Payment find
    const paymentResult = await dbQuery(
      "SELECT * FROM payments WHERE custRefNum = $1",
      [custRefNum]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Payment not found"
      });
    }

    const pay = paymentResult.rows[0];

    // ❌ Duplicate रोकना
    if (pay.status === "success") {
      return res.json({
        status: true,
        message: "Already processed"
      });
    }

    if (status === "success") {

      await dbQuery("BEGIN");

      try {
        // ✅ 2. Payment update
        await dbQuery(
          "UPDATE payments SET status = 'success' WHERE custRefNum = $1",
          [custRefNum]
        );

        // ✅ 3. Last balance nikaalo
        const walletRes = await dbQuery(
          `SELECT txn_clbal FROM wallet
           WHERE user_id = $1
           ORDER BY id DESC LIMIT 1`,
          [pay.user_id]
        );

        let lastBalance = 0;

        if (walletRes.rows.length > 0) {
          lastBalance = parseFloat(walletRes.rows[0].txn_clbal);
        }

        // ✅ 4. New balance calculate
        const newBalance = lastBalance + parseFloat(amount);
        const now = new Date();
       
        const transaction_id = Date.now();
        // ✅ 5. Wallet entry insert (ledger entry) transaction_id
        await dbQuery(
          `INSERT INTO wallet 
          (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_comment, txn_type,txn_date,transaction_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7,$8,$9)`,
          [
            pay.user_id,
            lastBalance,
            amount,
            0,
            newBalance,
            "Wallet Topup via Payment",
            "credit",
            now,
            transaction_id
          ]
        );

        
        await dbQuery("COMMIT");

        //console.log("Wallet Updated:", newBalance);

      } catch (err) {
        await dbQuery("ROLLBACK");
        throw err;
      }
    }

    return res.json({
      status: true,
      message: "Callback processed"
    });

  } catch (error) {
    //console.error("Callback Error:", error);

    return res.status(500).json({
      status: false,
      message: "Something went wrong"
    });
  }
};





























// exports.paymentCallback = async (req, res) => {
//   try {
//     const { custRefNum, status, amount } = req.body;

//     // ✅ payment find
//     const paymentResult = await dbQuery(
//       "SELECT * FROM payments WHERE custRefNum = $1",
//       [custRefNum]
//     );

//     if (paymentResult.rows.length === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "Payment not found"
//       });
//     }

//     const pay = paymentResult.rows[0];

//     // ❌ duplicate check
//     if (pay.status === "success") {
//       return res.json({
//         status: true,
//         message: "Already processed"
//       });
//     }

//     if (status === "success") {

//       await dbQuery("BEGIN");

//       try {
//         // ✅ payment update
//         await dbQuery(
//           "UPDATE payments SET status = 'success' WHERE custRefNum = $1",
//           [custRefNum]
//         );

//         // ✅ wallet update
//         await dbQuery(
//           `INSERT INTO wallets (user_id, balance)
//            VALUES ($1, $2)
//            ON CONFLICT (user_id)
//            DO UPDATE SET balance = wallets.balance + $2`,
//           [pay.user_id, amount]
//         );

//         await dbQuery("COMMIT");

//       } catch (err) {
//         await dbQuery("ROLLBACK");
//         throw err;
//       }
//     }

//     return res.json({
//       status: true,
//       message: "Callback processed"
//     });

//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({
//       status: false,
//       message: "Error"
//     });
//   }
// };















// exports.createPayment = async (req, res) => {
//   try {
//     const {
//       amount,
//       mobileNumber,
//       custEmail,
//       custName
//     } = req.body;

//     // 🔥 Unique Ref Number
//     const custRefNum = "REF" + Date.now();
   
//   const payload = {
//       authEmail: "siddhujain2628@gmail.com",
//       amount: parseFloat(amount),
//       mobileNumber,
//       custRefNum,
//       custEmail,
//       custName,
//       apiKey: "10ae1fe170997095e9d422334411b279"
//     };


//     console.log(payload);

//     const response = await axios.post(
//       "https://primexpay.in/api/payments/create",
//       payload,
//       {
//         headers: {
//           "Content-Type": "application/json"
//         }
//       }
//     );





//     console.log(response.data);

//     return res.json({
//       success: true,
//       data: response.data
//     });

//   } catch (error) {
//     console.error(error.response?.data || error.message);

//     return res.status(500).json({
//       success: false,
//       error: error.response?.data || "Payment failed"
//     });
//   }
// };








// exports.paymentCallback = async (req, res) => {

//     let totalAmount=0;
//     try {
//         const data = req.body;

//         // ✅ 1. Console print
//         console.log("Callback Data:", data);

//         const { custRefNum, status, amount } = data;

//         // ✅ 2. Validation basic
//         if (!custRefNum || !status || !amount) {
//             return res.status(400).json({
//                 status: false,
//                 message: "Invalid data"
//             });
//         }

//         // ✅ 3. Amount add (only success)
//         if (status === "success") {
//             totalAmount += parseFloat(amount);

//             console.log("Updated Total Amount:", totalAmount);
//         }

//         // ✅ 4. Response
//         return res.json({
//             status: true,
//             message: "Callback received successfully",
//             totalAmount: totalAmount
//         });

//     } catch (error) {
//         console.error("Callback Error:", error);

//         return res.status(500).json({
//             status: false,
//             message: "Something went wrong"
//         });
//     }
// };