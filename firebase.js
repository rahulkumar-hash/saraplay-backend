require("dotenv").config();
const admin = require("firebase-admin");

const serviceAccount = require(process.env.FIREBASE_JSON);
console.log("FIREBASE_JSON:", process.env.FIREBASE_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;