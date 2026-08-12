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
  try {
    const user_id = req.user && req.user.id ? req.user.id : null;

    let result;

    if (user_id) {
      // ✅ User logged in — return is_read status, exclude deleted notices
      result = await dbQuery(
        `SELECT
           n.id,
           n.title,
           n.des,
           n.status,
           n.notice_date,
           n.date,
           CASE WHEN nr.notice_id IS NOT NULL THEN true ELSE false END AS is_read
         FROM notice n
         LEFT JOIN notice_reads nr
           ON nr.notice_id = n.id AND nr.user_id = $1
         WHERE n.id NOT IN (
           SELECT notice_id FROM notice_deletes WHERE user_id = $1
         )
         ORDER BY n.id DESC`,
        [user_id]
      );
    } else {
      // Fallback — no user, no is_read
      result = await dbQuery("SELECT * FROM notice ORDER BY id DESC");
    }

    // ✅ Count unread from fetched data
    const unreadCount = user_id
      ? result.rows.filter(n => !n.is_read).length
      : 0;

    if (result.rows.length > 0) {
      res.json({
        status: true,
        message: "Notifications fetched successfully",
        unread_count: unreadCount,
        data: result.rows
      });
    } else {
      res.json({
        status: false,
        message: "No notifications found",
        unread_count: 0,
        data: []
      });
    }
  } catch (err) {
    console.error("getNotifications Error:", err);
    res.status(500).json({
      status: false,
      message: "Internal server error"
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



/* =============================================
   🔴 MARK SINGLE NOTIFICATION AS READ
   POST /api/notification/mark-read
   Body: { notification_id: 5 }
   Note: Uses 'notice' table (global broadcast notices)
         Tracks read status per-user in notice_reads table
============================================= */
exports.markNotificationRead = async (req, res) => {
  try {

    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // 🛑 Body check
    const { notification_id } = req.body || {};

    if (!notification_id) {
      return res.status(400).json({
        status: false,
        message: "notification_id is required"
      });
    }

    // ✅ Verify notice exists
    const check = await dbQuery(
      `SELECT id FROM notice WHERE id = $1`,
      [notification_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Notification not found"
      });
    }

    // ✅ Upsert into notice_reads (insert if not exists)
    await dbQuery(
      `INSERT INTO notice_reads (user_id, notice_id, read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, notice_id) DO NOTHING`,
      [user_id, notification_id]
    );

    return res.json({
      status: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


/* =============================================
   🔴 MARK ALL NOTIFICATIONS AS READ
   POST /api/notification/mark-all-read
   Body: {} (no body needed)
============================================= */
exports.markAllNotificationsRead = async (req, res) => {
  try {

    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // ✅ Insert read record for all notices not yet read by this user
    const result = await dbQuery(
      `INSERT INTO notice_reads (user_id, notice_id, read_at)
       SELECT $1, id, NOW()
       FROM notice
       WHERE id NOT IN (
         SELECT notice_id FROM notice_reads WHERE user_id = $1
       )`,
      [user_id]
    );

    const updatedCount = result.rowCount || 0;

    return res.json({
      status: true,
      message: `${updatedCount} notification(s) marked as read`,
      updated_count: updatedCount
    });

  } catch (error) {
    console.error("Mark All Notifications Read Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


/* =============================================
   📋 GET UNREAD NOTIFICATION COUNT
   GET /api/notification/list
============================================= */
exports.getUserNotifications = async (req, res) => {
  try {

    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // ✅ Count total notices
    const totalResult = await dbQuery(
      `SELECT COUNT(*) AS total FROM notice`
    );

    // ✅ Count already read by this user
    const readResult = await dbQuery(
      `SELECT COUNT(*) AS read_count FROM notice_reads WHERE user_id = $1`,
      [user_id]
    );

    const total = parseInt(totalResult.rows[0].total) || 0;
    const readCount = parseInt(readResult.rows[0].read_count) || 0;
    const unreadCount = total - readCount;

    return res.json({
      status: true,
      message: "Unread notification count fetched successfully",
      unread_count: unreadCount < 0 ? 0 : unreadCount
    });

  } catch (error) {
    console.error("Get Unread Count Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


/* =============================================
   🗑️ DELETE NOTIFICATION (USER-SIDE)
   DELETE /api/notification/delete/:id
   Params: id (notification/notice id)
   Header: Authorization: Bearer <token>
============================================= */
exports.deleteNotification = async (req, res) => {
  try {

    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;
    const notification_id = req.params.id;

    // 🛑 Param check
    if (!notification_id) {
      return res.status(400).json({
        status: false,
        message: "notification_id is required"
      });
    }

    // ✅ Verify notice exists
    const check = await dbQuery(
      `SELECT id FROM notice WHERE id = $1`,
      [notification_id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Notification not found"
      });
    }

    // ✅ Insert into notice_deletes (idempotent — ON CONFLICT DO NOTHING)
    await dbQuery(
      `INSERT INTO notice_deletes (user_id, notice_id, deleted_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, notice_id) DO NOTHING`,
      [user_id, notification_id]
    );

    return res.json({
      status: true,
      message: "Notification deleted successfully"
    });

  } catch (error) {
    console.error("Delete Notification Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


/* =============================================
   🗑️ DELETE ALL NOTIFICATIONS (USER-SIDE)
   DELETE /api/notification/delete-all
   Header: Authorization: Bearer <token>
============================================= */
exports.deleteAllNotifications = async (req, res) => {
  try {

    // 🔐 Auth check
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized. Invalid or missing token."
      });
    }

    const user_id = req.user.id;

    // ✅ Insert delete record for all notices not yet deleted by this user
    const result = await dbQuery(
      `INSERT INTO notice_deletes (user_id, notice_id, deleted_at)
       SELECT $1, id, NOW()
       FROM notice
       WHERE id NOT IN (
         SELECT notice_id FROM notice_deletes WHERE user_id = $1
       )`,
      [user_id]
    );

    const deletedCount = result.rowCount || 0;

    return res.json({
      status: true,
      message: `${deletedCount} notification(s) deleted successfully`,
      deleted_count: deletedCount
    });

  } catch (error) {
    console.error("Delete All Notifications Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};


/* =============================================
   🔔 GET NEW NOTIFICATION PREFERENCES
   GET /api/notification/preferences
   Header: Authorization: Bearer <token>
   Response: { win, withdrawal, deposit, result } — 1=ON, 0=OFF
============================================= */
exports.getNotificationPreferences = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const user_id = req.user.id;

    const result = await dbQuery(
      `SELECT notif_win, notif_withdrawal, notif_deposit, notif_result
       FROM users WHERE id = $1 LIMIT 1`,
      [user_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    const prefs = result.rows[0];

    return res.json({
      status: true,
      message: "Preferences fetched successfully",
      data: {
        win:        Number(prefs.notif_win),
        withdrawal: Number(prefs.notif_withdrawal),
        deposit:    Number(prefs.notif_deposit),
        result:     Number(prefs.notif_result)
      }
    });

  } catch (error) {
    console.error("getNotificationPreferences Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};


/* =============================================
   🔔 UPDATE NEW NOTIFICATION PREFERENCES
   POST /api/notification/preferences
   Header: Authorization: Bearer <token>
   Body: { win, withdrawal, deposit, result }  — send only the ones to update (1 or 0)
============================================= */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ status: false, message: "Unauthorized" });
    }

    const user_id = req.user.id;
    const body = req.body || {};

    const allowed = ["win", "withdrawal", "deposit", "result"];

    // Human-readable labels for alert messages
    const labelMap = {
      win:        "Win Notification",
      withdrawal: "Withdrawal Notification",
      deposit:    "Deposit Notification",
      result:     "Result Notification"
    };

    const columnMap = {
      win:        "notif_win",
      withdrawal: "notif_withdrawal",
      deposit:    "notif_deposit",
      result:     "notif_result"
    };

    // Build dynamic SET clause — only update fields that are sent
    const setClauses = [];
    const values = [];
    const alertMessages = [];
    let idx = 1;

    for (const key of allowed) {
      if (body[key] !== undefined) {
        const val = Number(body[key]);
        if (val !== 0 && val !== 1) {
          return res.status(400).json({
            status: false,
            message: `Invalid value for '${key}'. Must be 0 or 1.`
          });
        }
        setClauses.push(`${columnMap[key]} = $${idx++}`);
        values.push(val);

        // Build alert message per toggle
        const status = val === 1 ? "ON" : "OFF";
        const emoji  = val === 1 ? "🔔" : "🔕";
        alertMessages.push(`${emoji} ${labelMap[key]} turned ${status}`);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({
        status: false,
        message: "At least one field (win, withdrawal, deposit, result) is required"
      });
    }

    values.push(user_id);

    await dbQuery(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx}`,
      values
    );

    // Single toggle → direct message; multiple → joined
    const alertMessage = alertMessages.join("\n");

    return res.json({
      status: true,
      message: alertMessage,
      updated: Object.fromEntries(
        allowed
          .filter(k => body[k] !== undefined)
          .map(k => [k, Number(body[k])])
      )
    });

  } catch (error) {
    console.error("updateNotificationPreferences Error:", error);
    return res.status(500).json({ status: false, message: "Internal server error" });
  }
};
