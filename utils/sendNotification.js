const admin = require("../firebase");

/**
 * 🔹 Single Device Notification
 */
const sendSingleNotification = async (token, title, body) => {
  try {
    const message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        title: title || "Royal Group App",
        body: body || "",
        target_url: "https://royalmtk.site/"
      },
      android: {
        priority: "high",
        notification: {
          channelId: "royal_group_channel",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true
        }
      }
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (error) {
    console.error("Single Error:", error);
  }
};

/**
 * 🔹 Multiple Devices Notification
 */
const sendMultiNotification = async (tokens, title, body) => {
  try {
    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        title: title || "Royal Group App",
        body: body || "",
        target_url: "https://royalmtk.site/"
      },
      android: {
        priority: "high",
        notification: {
          channelId: "royal_group_channel",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    return response;
  } catch (error) {
    console.error("Multi Error:", error);
  }
};

/**
 * 🔥 NEW BULK NOTIFICATION
 */
const sendBulkNotificationNew = async (tokens, title, body) => {
  try {
    const promises = [];
    for (const token of tokens) {
      const message = {
        token,
        notification: {
          title,
          body,
        },
        data: {
          title: title || "Royal Group App",
          body: body || "",
          target_url: "https://royalmtk.site/"
        },
        android: {
          priority: "high",
          notification: {
            channelId: "royal_group_channel",
            sound: "default",
            defaultSound: true,
            defaultVibrateTimings: true
          }
        }
      };
      promises.push(admin.messaging().send(message));
    }

    const response = await Promise.allSettled(promises);
    let success = 0;
    let failed = 0;
    const deadTokens = [];

    response.forEach((v, idx) => {
      if (v.status === "fulfilled") {
        success++;
      } else {
        failed++;
        const reason = v.reason;
        const errCode = reason?.code || reason?.errorInfo?.code || "";
        if (
          errCode === "messaging/registration-token-not-registered" ||
          String(reason).includes("NotRegistered")
        ) {
          if (tokens[idx]) deadTokens.push(tokens[idx]);
        }
      }
    });

    if (deadTokens.length > 0) {
      dbQuery(
        `UPDATE "users" SET fcm_token = NULL WHERE fcm_token = ANY($1::text[])`,
        [deadTokens]
      ).catch((e) => console.error("Clean dead tokens error:", e));
      console.log(`🧹 Cleaned ${deadTokens.length} dead FCM tokens from users table`);
    }

    console.log("Bulk Success:", success);
    console.log("Bulk Failed:", failed);

    return { success, failed };
  } catch (error) {
    console.log("Bulk Notification Error:", error);
  }
};

/**
 * 📢 Broadcast Topic Notification (Dual 'all_users' & 'all' topic coverage)
 */
const sendAll = async (topic, title, body) => {
  try {
    const topics = (topic === "all" || topic === "all_users" || !topic)
      ? ["all_users", "all"]
      : [topic];

    const results = [];
    for (const t of topics) {
      try {
        const message = {
          topic: t,
          notification: {
            title,
            body,
          },
          data: {
            title: title || "Royal Group App",
            body: body || "",
            target_url: "https://royalmtk.site/"
          },
          android: {
            priority: "high",
            notification: {
              channelId: "royal_group_channel",
              sound: "default",
              defaultSound: true,
              defaultVibrateTimings: true
            }
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        };

        const response = await admin.messaging().send(message);
        results.push(response);
      } catch (topicErr) {
        console.warn(`Topic '${t}' notification error:`, topicErr.message);
      }
    }
    return results;
  } catch (error) {
    console.log("Topic Notification Error:", error);
  }
};

const dbQuery = require("./dbQuery");

/**
 * 📢 Result Notification (Delivered strictly to users who have result notifications ON in settings)
 * - If user turns OFF result notification in settings (notif_result = 0): They will NOT receive it.
 * - If user has result notification ON (notif_result = 1): They WILL receive it even if app is closed.
 */
const sendResultBroadcastNotification = async (title, body) => {
  try {
    // Direct Push strictly to users who have NOT disabled result notification (notif_result = 1)
    // AND ensure that if any user on this device token has notif_result = 0, that token is strictly excluded.
    const userTokens = await dbQuery(
      `SELECT DISTINCT u.fcm_token 
       FROM "users" u 
       WHERE u.fcm_token IS NOT NULL 
         AND u.fcm_token != ''
         AND COALESCE(u.notif_result, 1) = 1
         AND u.fcm_token NOT IN (
           SELECT fcm_token 
           FROM "users" 
           WHERE fcm_token IS NOT NULL 
             AND fcm_token != '' 
             AND COALESCE(notif_result, 1) = 0
         )`
    );

    const tokens = userTokens.rows.map((r) => r.fcm_token).filter(Boolean);
    if (tokens.length > 0) {
      await sendBulkNotificationNew(tokens, title, body);
      console.log(`📲 [FCM RESULT NOTIFICATION] Sent to ${tokens.length} eligible users (result notification enabled)`);
    } else {
      console.log(`ℹ️ [FCM RESULT NOTIFICATION] No eligible users with active result notification preference.`);
    }
  } catch (err) {
    console.error("❌ Result Broadcast Notification Error:", err);
  }
};

module.exports = {
  sendSingleNotification,
  sendMultiNotification,
  sendBulkNotificationNew,
  sendAll,
  sendResultBroadcastNotification
};