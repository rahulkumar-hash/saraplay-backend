const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,

    max: 50,
    min: 10,

    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,

    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
});

pool.on("connect", () => {
    console.log("🟢 DB Connected");
});

pool.on("error", (err) => {
    console.error("❌ PG Pool Error:", err);
});

// setInterval(() => {
//     console.log({
//         total: pool.totalCount,
//         idle: pool.idleCount,
//         waiting: pool.waitingCount,
//     });
// }, 10000);

module.exports = pool;
// const { Pool } = require("pg");
// require("dotenv").config();
// const pool = new Pool({
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   database: process.env.DB_NAME,

//   max: 15, // 🔥 limit connections
//   idleTimeoutMillis: 10000, // 🔥 idle auto close (10 sec)
//   connectionTimeoutMillis: 2000,
// });

// // ✅ Track connections
// let totalConnections = 0;

// pool.on("connect", () => {
//   totalConnections++;
//   console.log("🟢 New DB Connection:", totalConnections);
// });

// pool.on("remove", () => {
//   totalConnections--;
//   console.log("🔴 Connection Closed:", totalConnections);
// });

// // ❌ Error handler
// pool.on("error", (err) => {
//   console.error("❌ PG Pool Error:", err);
// });

// module.exports = pool;