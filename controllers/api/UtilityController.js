// const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");

exports.getApkUpdate = async (req, res) => {
  const result = await dbQuery("SELECT * FROM apk_update");

  if (result.rows.length > 0) {
    res.json({
      status: true,
      message: "Data fetched successfully",
      data: result.rows
    });
  } else {
    res.json({
      status: false,
      message: "No data found",
      data: []
    });
  }
};




exports.getNotifications = async (req, res) => {
  const result = await dbQuery(
    "SELECT * FROM notice ORDER BY id DESC"
  );

  if (result.rows.length > 0) {
    res.json({
      status: true,
      message: "Notifications fetched successfully",
      data: result.rows
    });
  } else {
    res.json({
      status: false,
      message: "No notifications found",
      data: []
    });
  }
};




exports.updateNotificationStatus = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: false,
        message: "Request body is required"
      });
    }

    const {
      main_notification,
      notification_status,
      king_starline_notification,
      king_jackpot_notification
    } = req.body;

    if (
      main_notification === undefined ||
      notification_status === undefined ||
      king_starline_notification === undefined ||
      king_jackpot_notification === undefined
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required"
      });
    }

    await dbQuery(
      `UPDATE users SET
       notification_status=$1,
       game_notification=$2,
       king_starline_notification=$3,
       king_jackpot_notification=$4
       WHERE id=$5`,
      [
        main_notification,
        notification_status,
        king_starline_notification,
        king_jackpot_notification,
        user_id
      ]
    );

    return res.json({
      status: true,
      message: "Notification status updated successfully"
    });

  } catch (error) {
    console.error("Update Notification Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};





// exports.updateNotificationStatus = async (req, res) => {
//   const {
//     user_id,
//     main_notification,
//     notification_status,
//     king_starline_notification,
//     king_jackpot_notification
//   } = req.body;

//   if (!user_id) {
//     return res.json({
//       status: false,
//       message: "Missing parameters"
//     });
//   }

//   const user = await dbQuery(
//     "SELECT * FROM user WHERE id=$1",
//     [user_id]
//   );

//   if (!user.rows.length) {
//     return res.json({
//       status: false,
//       message: "Invalid user_id"
//     });
//   }

//   await dbQuery(
//     `UPDATE user SET
//      notification_status=$1,
//      game_notification=$2,
//      king_starline_notification=$3,
//      king_jackpot_notification=$4
//      WHERE id=$5`,
//     [
//       main_notification,
//       notification_status,
//       king_starline_notification,
//       king_jackpot_notification,
//       user_id
//     ]
//   );

//   res.json({
//     status: true,
//     message: "Notification status updated successfully"
//   });
// };











exports.updateFcm = async (req, res) => {
  try {

    // 🔐 Check token
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // 🛑 Check body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        status: false,
        message: "Request body is required"
      });
    }

    const { fcm_token } = req.body;

    // 🛑 Required validation
    if (!fcm_token) {
      return res.status(400).json({
        status: false,
        message: "FCM token is required"
      });
    }

    // ✅ Check user exists
    const user = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (!user.rows.length) {
      return res.status(404).json({
        status: false,
        message: "User not found"
      });
    }

    // ✅ Update FCM
    await dbQuery(
      "UPDATE users SET fcm_token=$1 WHERE id=$2",
      [fcm_token, user_id]
    );

    return res.json({
      status: true,
      message: "FCM token updated successfully"
    });

  } catch (error) {
    console.error("Update FCM Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};











exports.verifyUser = async (req, res) => {
  try {

    // 🔐 Check token
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // ✅ Check user in database
    const user = await dbQuery(
      "SELECT delete_status FROM users WHERE id=$1",
      [user_id]
    );

    if (user.rows.length > 0) {
      return res.json({
        status: true,
        message: "Data Found",
        result: user.rows[0]
      });
    } else {
      return res.status(404).json({
        status: false,
        message: "Invalid User"
      });
    }

  } catch (error) {
    console.error("Verify User Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};

