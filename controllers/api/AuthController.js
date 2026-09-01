const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const moment = require("moment");


const encodePin = (pin) => {
  return Buffer.from(pin).toString("base64");
};
// REGISTER
// exports.register = async (req, res) => {
//   const { name, email, mobile, password } = req.body;

//   try {
//     // Check existing user
//     const userCheck = await dbQuery(
//       "SELECT * FROM users WHERE mobile = $1 OR email = $2",
//       [mobile, email]
//     );

//     if (userCheck.rows.length > 0) {
//       return res.status(402).json({ status:false, message: "User already exists" });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = await dbQuery(
//         `INSERT INTO users 
//         (name, email, mobile, password, status, delete_status, date, pin, otp,otp_status,logout_status,district,address,address2,pincode,area,state,refer_by,login_time) 
//         VALUES ($1,$2,$3,$4,1,0,NOW(),$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) 
//         RETURNING id, name, email, mobile`,
//         [
//             name,
//             email,
//             mobile,
//             hashedPassword,
//             '0000',
//             12345,
//             true,
//             true,
//             '-',
//             '-',
//             '-',
//             0,
//             '-',
//             '-',
//             'admin',
//             '07:09'
//         ]
//         );

//     res.json({
//         status:true,
//       message: "User registered successfully",
//       user: newUser.rows[0],
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ status:false, message: "Server error" });
//   }
// };








exports.register = async (req, res) => {
  const { name, mobile, password, pin, referal } = req.body;

  if (!name || !mobile || !password) {
    return res.json({
      status: false,
      message: "All Fields Required!"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const username = "USER" + Date.now();
    const referBy = referal ? referal.toUpperCase() : null;

    // ✅ Check Refer ID
    if (referBy) {
      const referCheck = await client.query(
        "SELECT id FROM users WHERE username = $1",
        [referBy]
      );

      if (referCheck.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.json({
          status: false,
          message: "Invalid Refer ID!"
        });
      }
    }

    // ✅ Check Mobile Exists
    const userCheck = await client.query(
      "SELECT id FROM users WHERE mobile = $1 AND delete_status = 'false'",
      [mobile]
    );

    if (userCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.json({
        status: false,
        message: "Mobile Number Already Registered!"
      });
    }

    // ✅ Get Main Setting
    const setting = await client.query(
      "SELECT global_batting, welcome_bonus FROM main_setting WHERE id = 1"
    );

    const globalBatting = setting.rows[0].global_batting;
    const welcomeBonus = setting.rows[0].welcome_bonus;

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(pin || "0000", 10);

    const otp = 1234; // ya random generate kar lo

    // ✅ Insert User
    // const newUser = await client.query(
    //   `INSERT INTO users 
    //   (refer_by, name, mobile, password, status, otp, pin, date, delete_status, otp_status,username)
    //   VALUES ($1,$2,$3,$4,true,$5,$6,NOW(),false,true,$7)
    //   RETURNING id, name, mobile`,
    //   [
    //     referBy,
    //     name,
    //     mobile,
    //     hashedPassword,
    //     otp,
    //     hashedPin,
    //     username
    //   ]
    // );

    const newUser = await client.query(
      `INSERT INTO users 
      (refer_by, name, mobile, password, status, otp, pin, date, delete_status, otp_status, username)
      VALUES ($1::VARCHAR,
              $2::VARCHAR,
              $3::BIGINT,
              $4::VARCHAR,
              true,
              $5::INTEGER,
              $6::VARCHAR,
              NOW(),
              false,
              true,
              $7::VARCHAR)
      RETURNING id, name, mobile`,
      [
        referBy,
        String(name),
        Number(mobile),
        hashedPassword,
        Number(otp),
        hashedPin,
        String(username)
      ]
    );

    const userId = newUser.rows[0].id;

    // ✅ Insert Welcome Bonus in Wallet
    if (welcomeBonus > 0) {
      // await client.query(
      //   `INSERT INTO wallet 
      //   (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_date, txn_comment, transfer_user_id, transaction_id)
      //   VALUES ($1,0,$2,0,$2,NOW(),'Welcome Bonus','Admin',$3)`,
      //   [userId, welcomeBonus, Math.floor(Math.random() * 100000000)]
      // );


        await client.query(
          `INSERT INTO wallet 
          (user_id, txn_opbal, txn_crdt, txn_dbdt, txn_clbal, txn_date, txn_comment, transfer_user_id, transaction_id)
          VALUES ($1::BIGINT,
                  0,
                  $2::NUMERIC,
                  0,
                  $2::NUMERIC,
                  NOW(),
                  'Welcome Bonus',
                  'Admin',
                  $3::BIGINT)`,
          [
            Number(userId),
            Number(welcomeBonus),
            Number(Math.floor(Math.random() * 100000000))
          ]
        );



    }

    await client.query("COMMIT");

    return res.json({
      status: true,
      message: "Registration Successfully",
      result: newUser.rows[0]
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  } finally {
    client.release();
  }
};










// LOGIN

// exports.login = async (req, res) => {
//   const { mobile, password } = req.body;

//   console.log(mobile);

//   try {
//     const result = await dbQuery(
//       "SELECT * FROM users WHERE mobile = $1 AND delete_status = 0",
//       [mobile]
//     );

//     if (result.rows.length === 0) {
//       return res.status(400).json({ message: "User not found" });
//     }

//     const user = result.rows[0];

//     if (user.status !== 1) {
//       return res.status(403).json({ message: "Account disabled" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid password" });
//     }

//     const token = jwt.sign(
//       { id: user.id, mobile: user.mobile },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES }
//     );

//     res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         name: user.name,
//         mobile: user.mobile,
//       },
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error" });
//   }
// };



exports.login = async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    return res.json({
      status: false,
      message: "All Fields Required!"
    });
  }

  try {
    
    const userCheck = await dbQuery(
      "SELECT * FROM users WHERE mobile = $1 AND delete_status = 'false'",
      [mobile]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid Mobile Number!"
      });
    }

    const user = userCheck.rows[0];

    // ✅ Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({
        status: false,
        message: "Incorrect Password!"
      });
    }

    // ✅ Optional: Check account status
    if (user.status === false) {
      return res.json({
        status: false,
        message: "Your Account is Inactive. Contact Admin."
      });
    }

    // ✅ Generate JWT Token
    const token = jwt.sign(
      { id: user.id, mobile: user.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      status: true,
      message: "Login Success",
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile
      }
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  }
};

















exports.number_verify = async (req, res) => {


  const { mobile } = req.body;

  if (!mobile) {
    return res.json({
      status: false,
      message: "All Fields Required!"
    });
  }

  const userCheck = await dbQuery(
    "SELECT * FROM users WHERE mobile = $1 AND delete_status = 'false'",
    [mobile]
  );

  if (userCheck.rows.length === 0) {
    return res.json({
      status: false,
      message: "Invalid Mobile Number!"
    });
  }

  return res.json({
    status: true,
    message: "Valid Mobile Number!"
  });


};
























exports.verifyOTP = async (req, res) => {
  const { mobile, otp } = req.body;

  const user = await dbQuery(
    "SELECT * FROM user WHERE mobile=$1 ORDER BY id DESC LIMIT 1",
    [mobile]
  );

  if (!user.rows.length) {
    return res.json({
      status: false,
      message: "Invalid User Mobile Number"
    });
  }

  if (user.rows[0].otp != otp) {
    return res.json({
      status: false,
      message: "Invalid OTP"
    });
  }

  await dbQuery(
    "UPDATE user SET otp_status='true', logout_status='login' WHERE mobile=$1",
    [mobile]
  );

  res.json({
    status: true,
    message: "OTP Verification Success",
    result: user.rows
  });
};




exports.forgetPassword = async (req, res) => {
  const { mobile, new_password } = req.body;

  const user = await dbQuery(
    "SELECT * FROM user WHERE mobile=$1",
    [mobile]
  );

  if (!user.rows.length) {
    return res.json({
      status: false,
      message: "Invalid Mobile Number!"
    });
  }

  await dbQuery(
    "UPDATE user SET password=$1 WHERE mobile=$2",
    [md5(new_password), mobile]
  );

  res.json({
    status: true,
    message: "Password Changed Successfully"
  });
};






exports.changePassword = async (req, res) => {
  try {

    const { old_password, new_password } = req.body || {};
    const userId = req.user?.id;

    if (!old_password || !new_password) {
      return res.json({
        status: false,
        message: "Old password and new password are required"
      });
    }

    const userResult = await dbQuery(
      "SELECT id, password FROM users WHERE id = $1",
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        status: false,
        message: "User not found"
      });
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(
      String(old_password),
      user.password
    );

    if (!isMatch) {
      return res.json({
        status: false,
        message: "Incorrect Old Password"
      });
    }

    const isSamePassword = await bcrypt.compare(
      String(new_password),
      user.password
    );

    if (isSamePassword) {
      return res.json({
        status: false,
        message: "New password cannot be same as old password"
      });
    }

    const hashedPassword = await bcrypt.hash(
      String(new_password),
      10
    );

    await dbQuery(
      "UPDATE users SET password = $1 WHERE id = $2",
      [hashedPassword, userId]
    );

    return res.json({
      status: true,
      message: "Password Changed Successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  }
};






exports.changeMpin = async (req, res) => {
  try {

    // 🔐 Token validation (recommended)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    const { old_mpin, new_mpin } = req.body || {};

    // Basic validation
    if (!old_mpin || !new_mpin) {
      return res.json({
        status: false,
        message: "All fields are required"
      });
    }

    // MPIN must be 4 digits
    const mpinRegex = /^\d{4}$/;
    if (!mpinRegex.test(old_mpin) || !mpinRegex.test(new_mpin)) {
      return res.json({
        status: false,
        message: "MPIN must be exactly 4 digits"
      });
    }

    // Get user
    const user = await dbQuery(
      "SELECT id, pin FROM users WHERE id=$1",
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    const isMatch = await bcrypt.compare(
      old_mpin,
      user.rows[0].pin
    );

    if (!isMatch) {
      return res.json({
        status: false,
        message: "Invalid Old MPIN"
      });
    }

    // Hash new MPIN
    const hashedMpin = await bcrypt.hash(new_mpin, 10);

    const update = await dbQuery(
      "UPDATE users SET pin=$1 WHERE id=$2",
      [hashedMpin, user_id]
    );

    if (update.rowCount > 0) {
      return res.json({
        status: true,
        message: "MPIN changed successfully"
      });
    } else {
      return res.json({
        status: false,
        message: "Failed to update MPIN"
      });
    }

  } catch (error) {
    console.error("Change MPIN Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error"
    });
  }
};

















exports.getUserData = async (req, res) => {
  const userId = req.user.id;

  const user = await dbQuery(
    "SELECT id,name,mobile,wallet,status FROM user WHERE id=$1",
    [userId]
  );

  res.json({
    status: true,
    message: "User Data Found",
    result: user.rows
  });
};


exports.updateFCM = async (req, res) => {
  const { fcm_token } = req.body;
  const userId = req.user.id;

  await dbQuery(
    "UPDATE users SET fcm_token=$1 WHERE id=$2",
    [fcm_token, userId]
  );

  res.json({
    status: true,
    message: "FCM Updated Successfully"
  });
};



exports.logout = async (req, res) => {
  const userId = req.user.id;

  await dbQuery(
    "UPDATE users SET logout_status='logout' WHERE id=$1",
    [userId]
  );

  res.json({
    status: true,
    message: "Logout Successfully"
  });
};




exports.updateProfile = async (req, res) => {
  try {
    const user_id = req.user.id;   // 👈 token se id
    const { name, email } = req.body;

    if (!name || !email) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    // Check user exists
    const userCheck = await dbQuery(
      `SELECT * FROM "users" WHERE id = $1`,
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // Update
    const updateQuery = await dbQuery(
      `UPDATE "users"
       SET name = $1, email = $2
       WHERE id = $3`,
      [name, email, user_id]
    );

    if (updateQuery.rowCount > 0) {
      return res.json({
        status: true,
        message: "Profile Updated Successfully"
      });
    } else {
      return res.json({
        status: false,
        message: "Network Problem"
      });
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  }
};


exports.verifyPin = async (req, res) => {
  try {

    const { mobile, pin } = req.body;

    // 🛑 Validation
    if (!mobile || !pin) {
      return res.status(400).json({
        status: false,
        message: "All Fields Required!"
      });
    }

    // ✅ Get user
    const user = await dbQuery(
      `SELECT * FROM users 
       WHERE mobile=$1 
       AND delete_status='false'`,
      [mobile]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Invalid Mobile Number!"
      });
    }

    const userData = user.rows[0];

    // ❌ Pin mismatch
     const isMatch = await bcrypt.compare(pin, userData.pin);

    if (!isMatch) {
      return res.status(401).json({
        status: false,
        message: "Incorrect Pin!"
      });
    }

    // ✅ Update login time
    const date = moment().format("DD MMM YYYY hh:mm:ss A");


    await dbQuery(
      "UPDATE users SET login_time=$1 WHERE id=$2",
      [date, userData.id]
    );


    const token = jwt.sign(
      { id: userData.id, mobile: userData.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );


    return res.json({
      status: true,
      message: "Pin Verify Successfully",
      token,
      result: userData
    });

  } catch (error) {
    console.error("Verify Pin Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


exports.getUserDetails = async (req, res) => {
  try {

    // 🔐 Token validation (user_id token se)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;

    // ✅ Fetch user details
    const user = await dbQuery(
      "SELECT * FROM users WHERE id=$1",
      [user_id]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Invalid User"
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      result: user.rows
    });

  } catch (error) {
    console.error("Get User Details Error:", error);
    return res.status(500).json({
      status: false,
      message: "Network Error!"
    });
  }
};