// const pool = require("../config/db");
const bcrypt = require("bcrypt");

const dbQuery = require("../utils/dbQuery");
/* =========================
   PROFILE PAGE
========================= */
exports.manageProfile = async (req, res) => {
  try {
    const adminId = 101;

    const result = await dbQuery(
      `SELECT * FROM admin limit 1`,
    );

    res.render("profile/manage-profile", {
      title: "Manage Profile",
      layout: "layouts/admin",
      admin: result.rows[0],
      csrfToken: req.csrfToken()
    });

  } catch (err) {
    console.error("ManageProfile error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   UPDATE PROFILE
========================= */
exports.updateProfile = async (req, res) => {
  try {
    const adminId = req.session.admin.id;
    const { name, email, mobile, address } = req.body;

    if (!name || !email || !mobile || !address) {
      return res.json({ res: "error", msg: "All fields required" });
    }

    let imageQuery = "";
    let values = [name, email, mobile, address, adminId];

    if (req.file) {
      imageQuery = `, image = $6`;
      values.push(`/upload/${req.file.filename}`);
    }

    await dbQuery(
      `
      UPDATE admin
      SET name=$1, email=$2, mobile=$3, address=$4
      ${imageQuery}
      WHERE id=$5
      `,
      values
    );

    res.json({
      res: "success",
      msg: "Profile updated successfully",
      url: "/admin/manage-profile"
    });

  } catch (err) {
    console.error("UpdateProfile error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};


/* =========================
   CHANGE PASSWORD
========================= */
// exports.changePassword = async (req, res) => {
//   try {
//     const adminId =6;
//     const { npass, cpass } = req.body;

//     if (!npass || !cpass) {
//       return res.json({ res: "error", msg: "Password required" });
//     }

//     if (npass.length < 6) {
//       return res.json({ res: "error", msg: "Minimum 6 characters required" });
//     }

//     if (npass !== cpass) {
//       return res.json({ res: "error", msg: "Passwords do not match" });
//     }

//     const hashed = await bcrypt.hash(npass, 10);

//     await dbQuery(
//       `UPDATE admin SET password=$1 WHERE user_id=$2`,
//       [hashed, adminId]
//     );

//     res.json({
//       res: "success",
//       msg: "Password changed successfully"
//     });

//   } catch (err) {
//     console.error("ChangePassword error:", err);
//     res.json({ res: "error", msg: "Something went wrong" });
//   }
// };
exports.changePassword = async (req, res) => {
  try {

    const adminId = 6;
    const { npass, cpass } = req.body;

    console.log(req.body);

    if (!npass || !cpass) {
      return res.json({
        res: "error",
        msg: "Password required"
      });
    }

    if (npass !== cpass) {
      return res.json({
        res: "error",
        msg: "Passwords do not match"
      });
    }

    const hashed = await bcrypt.hash(npass, 10);

    console.log("HASH:", hashed);

    const result = await dbQuery(
      `UPDATE admin
       SET password = $1
       WHERE user_id = $2
       RETURNING user_id,password`,
      [hashed, adminId]
    );

    console.log("RESULT:", result.rows);
    console.log("ROW COUNT:", result.rowCount);

    if (result.rowCount === 0) {
      return res.json({
        res: "error",
        msg: "No row updated"
      });
    }

    res.json({
      res: "success",
      msg: "Password changed successfully"
    });

  } catch (err) {

    console.error("ChangePassword error:", err);

    res.json({
      res: "error",
      msg: err.message
    });

  }
};

/* =========================
   CHANGE USER PIN
========================= */
exports.changePin = async (req, res) => {
  try {
    const { user_id, pin, url } = req.body;

    if (!pin) {
      return res.json({ res: "error", msg: "Enter Security Pin" });
    }

    const encodedPin = Buffer.from(pin).toString("base64");

    const check = await dbQuery(
      `SELECT pin FROM "user" WHERE id=$1`,
      [user_id]
    );

    if (check.rows[0].pin === encodedPin) {
      return res.json({
        res: "error",
        msg: "New & current pin are same"
      });
    }

    await dbQuery(
      `UPDATE "user" SET pin=$1 WHERE id=$2`,
      [encodedPin, user_id]
    );

    res.json({
      res: "success",
      msg: "PIN updated successfully",
      url
    });

  } catch (err) {
    console.error("ChangePin error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
