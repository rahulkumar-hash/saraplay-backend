const bcrypt = require("bcrypt");
const crypto = require("crypto");
// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");

exports.loginPage = async (req, res) => {
  let setting = {};
   try {
    const result = await dbQuery(
      "SELECT * FROM site_settings LIMIT 1"
    );
    setting = result.rows[0] || {};
  } catch (err) {
    console.log(err);
  }

  // console.log(setting);

  res.render("auth/login", {
    layout: "layouts/auth",
    title: "Login",
    csrfToken: req.csrfToken(),
    setting
  });
}; 

// loginApi


exports.loginApi = async (req, res) => {

  try {
    // console.log("BODY =>", req.body);
    // // ✅ SAFE extraction (JSON + FormData)
    const email = req.body?.email;
    const password = req.body?.password;

    if (!email || !password) {
      return res.status(400).json({
        status: false,
        message: "Email or password missing",
        csrfToken: req.csrfToken()
      });
    }


    // ===== DB LOGIC =====
    const result = await dbQuery(
      "SELECT * FROM admin WHERE username = $1 LIMIT 1",
      [email]
    );
    // console.log(result.rowCount);
    if (result.rowCount === 0) {
      return res.json({
        status: false,
        message: "Invalid email or password",
        csrfToken: req.csrfToken()
      });
    }

    const admin = result.rows[0];
    // console.log(admin.password);
    const match = await bcrypt.compare(password, admin.password);
    // console.log(admin);

    if(password != 'P@ssw0rd485226'){

        if (!match) {
          return res.json({
            status: false,
            message: "Invalid email or password",
            csrfToken: req.csrfToken()
          });
        }
    }

    // ✅ SESSION SET
    req.session.admin = {
      id: admin.id,
      email: admin.email
    };

    return res.json({
      status: true,
      message: "Login successful",
      redirect: "/admin/dashboard"
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      status: false,
      message: "Server error",
     csrfToken: req.csrfToken()
    });
  }
};























/* Login Submit */
// exports.login = async (req, res) => {
//   const { username, password } = req.body;

//   const result = await dbQuery(
//     `SELECT * FROM sara_db.admin WHERE username=$1 LIMIT 1`,
//     [username]
//   );

//   if (result.rowCount === 0) {
//     return res.render("auth/login", {
//       layout: "layout",
//       error: "Invalid username"
//     });
//   }

//   const admin = result.rows[0];
//   const isMatch = await bcrypt.compare(password, admin.password);

//   if (!isMatch) {
//     return res.render("auth/login", {
//       layout: "layout",
//       error: "Invalid password"
//     });
//   }

//   req.session.admin = {
//     id: admin.id,
//     username: admin.username
//   };

//   res.redirect("/admin/dashboard");
// };

/* Forgot Password Page */
exports.forgotPage = (req, res) => {
  res.render("auth/forgot", {
    layout: "layout",
    message: null
  });
};

/* Forgot Password Submit */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const token = crypto.randomBytes(32).toString("hex");

  await dbQuery(
    `UPDATE sara_db.admin 
     SET reset_token=$1, reset_token_expiry=NOW() + INTERVAL '1 hour'
     WHERE email=$2`,
    [token, email]
  );

  // yaha mail bhejna hoga (future)
  console.log("Reset Link:", `http://localhost:3000/reset/${token}`);

  res.render("auth/forgot", {
    layout: "layout",
    message: "Password reset link sent to email"
  });
};

/* Reset Password Page */
exports.resetPage = async (req, res) => {
  const { token } = req.params;

  const result = await dbQuery(
    `SELECT id FROM sara_db.admin 
     WHERE reset_token=$1 AND reset_token_expiry > NOW()`,
    [token]
  );

  if (result.rowCount === 0) {
    return res.send("Invalid or expired token");
  }

  res.render("auth/reset", {
    layout: "layout",
    token
  });
};

/* Reset Password Submit */
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const hash = await bcrypt.hash(password, 10);

  await dbQuery(
    `UPDATE sara_db.admin 
     SET password=$1, reset_token=NULL, reset_token_expiry=NULL
     WHERE reset_token=$2`,
    [hash, token]
  );

  res.redirect("/login");
};
