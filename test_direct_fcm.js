const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = require("./firebase.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const targetToken = "dsLvE-ZkQ9yJk4Ib2mtrG4:APA91bEj_i7EI3Q2dDFa2t6gAiFqpyKyPX3ao-45BokTIldSN6bBnQjZMzCEXTE8FUUXeTFdaUkShunc0LNYezd2bK6nu-uzwTFVehlQDgpFv2W2tNNuDWY";

async function sendDirect() {
  console.log("Sending direct test notification to token:", targetToken);
  
  const message = {
    token: targetToken,
    notification: {
      title: "Hello Major Direct 👑",
      body: "Testing direct FCM token delivery!"
    },
    data: {
      title: "Hello Major Direct 👑",
      body: "Testing direct FCM token delivery!",
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
  console.log("Successfully sent message:", response);
}

sendDirect().catch(console.error);
