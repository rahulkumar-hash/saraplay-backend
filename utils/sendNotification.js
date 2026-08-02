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
    };

    const response =
      await admin.messaging().send(message);

    return response;

  } catch (error) {

    console.error("Single Error:", error);

  }
};


/**
 * 🔹 Multiple Devices Notification (OLD)
 */
const sendMultiNotification = async (tokens, title, body) => {

  try {

    const message = {

      tokens,

      notification: {
        title,
        body,
      },

    };

    const response =
      await admin.messaging().sendMulticast(message);

    console.log("Success:", response.successCount);
    console.log("Failed:", response.failureCount);

    const failedTokens = [];

    response.responses.forEach((resp, idx) => {

      if (!resp.success) {

        failedTokens.push(tokens[idx]);

      }

    });

    return {
      success: response.successCount,
      failed: response.failureCount,
      failedTokens,
    };

  } catch (error) {

    console.error("Multi Error:", error);

  }
};



/**
 * 🔥 NEW BULK NOTIFICATION
 * Firebase Latest SDK Compatible
 * Max 500 Tokens
 */
// const sendBulkNotificationNew = async (
//   tokens,
//   title,
//   body
// ) => {

//   try {

//     const message = {

//       tokens,

//       notification: {
//         title,
//         body,
//       },

//     };

//     // ✅ NEW METHOD
//     const response =
//       await admin.messaging()
//       .sendEachForMulticast(message);

//     console.log(
//       "Bulk Success:",
//       response.successCount
//     );

//     console.log(
//       "Bulk Failed:",
//       response.failureCount
//     );

//     const failedTokens = [];

//     response.responses.forEach((resp, idx) => {

//       if (!resp.success) {

//         console.log(
//           "Firebase Error:",
//           resp.error
//         );

//         failedTokens.push(tokens[idx]);

//       }

//     });

//     return {
//       success: response.successCount,
//       failed: response.failureCount,
//       failedTokens,
//     };

//   } catch (error) {

//     console.error(
//       "Bulk Notification Error:",
//       error
//     );

//   }

// };

const sendBulkNotificationNew = async (
  tokens,
  title,
  body
) => {

  try {

    const promises = [];

    for (const token of tokens) {

      const message = {

        token,

        notification: {
          title,
          body,
        },

        android: {
          priority: "high",
        }

      };

      promises.push(
        admin.messaging().send(message)
      );

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

    return {
      success,
      failed
    };

  } catch (error) {

    console.log(
      "Bulk Notification Error:",
      error
    );

  }

};





const sendAll = async (
  topic,
  title,
  body
) => {

  try {

    const message = {

      topic: topic,

      notification: {
        title,
        body,
      },

      android: {
        priority: "high",
      },

      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },

    };

    const response =
      await admin.messaging().send(message);

    // console.log(
    //   "Topic Notification Sent:",
    //   response
    // );

    return response;

  } catch (error) {

    console.log(
      "Topic Notification Error:",
      error
    );

  }

};











module.exports = {

  sendSingleNotification,
  sendMultiNotification,
  sendBulkNotificationNew,
  sendAll

};