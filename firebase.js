require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = require(
  process.env.FIREBASE_JSON || "./firebase.json"
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;