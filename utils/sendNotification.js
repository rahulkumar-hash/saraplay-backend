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

    response.forEach((v) => {
      if (v.status === "fulfilled") {
        success++;
      } else {
        failed++;
        console.log(v.reason);
      }
    });

    console.log("Bulk Success:", success);
    console.log("Bulk Failed:", failed);

    return { success, failed };
  } catch (error) {
    console.log("Bulk Notification Error:", error);
  }
};

/**
 * 📢 Broadcast Topic Notification
 */
const sendAll = async (topic, title, body) => {
  try {
    const message = {
      topic: topic,
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
    return response;
  } catch (error) {
    console.log("Topic Notification Error:", error);
  }
};

const dbQuery = require("./dbQuery");

/**
 * 📢 Complete Result Broadcast (Topic + Direct Webview/Android User Tokens)
 */
const sendResultBroadcastNotification = async (title, body) => {
  try {
    // 1. Broadcast to Topic "all"
    try {
      await sendAll("all", title, body);
      console.log(`📲 [FCM BROADCAST TOPIC 'all'] Title: ${title} | Body: ${body}`);
    } catch (tErr) {
      console.error("❌ FCM Topic Broadcast Error:", tErr);
    }

    // 2. Direct Push to all registered user FCM Tokens (Android Webview / App users)
    try {
      const userTokens = await dbQuery(
        `SELECT DISTINCT fcm_token FROM "users" WHERE fcm_token IS NOT NULL AND fcm_token != ''`
      );
      const tokens = userTokens.rows.map((r) => r.fcm_token).filter(Boolean);
      if (tokens.length > 0) {
        await sendBulkNotificationNew(tokens, title, body);
        console.log(`📲 [FCM DIRECT TOKENS] Sent notification to ${tokens.length} active device tokens`);
      }
    } catch (uErr) {
      console.error("❌ FCM Direct Token Error:", uErr);
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