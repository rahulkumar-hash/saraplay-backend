const express = require("express");


const session = require("express-session");
// const RedisStore = require("connect-redis").default;
// const RedisStore = require("connect-redis");

// const RedisStore = require("connect-redis")(session);
const RedisStore = require("connect-redis").default;

const redisClient = require("./config/redis");






const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const compression = require("compression");
require("dotenv").config({ path: __dirname + "/.env" });
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const apisRoutes = require("./routes/apisRoutes");
const errorHandler = require("./middleware/errorHandler");
const pool = require("./config/db");

const app = express();

process.env.TZ = process.env.TZ || "Asia/Kolkata";


// ================= 🔥 GLOBAL ERROR =================
process.on("uncaughtException", (err) => console.error("❌ Uncaught:", err));
process.on("unhandledRejection", (err) => console.error("❌ Rejection:", err));


// ================= 🔥 BASIC SETTINGS =================
app.disable("x-powered-by");
app.set("trust proxy", 1);


// ================= 🔥 VIEW =================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


// ================= 🔥 MIDDLEWARE =================
app.use(expressLayouts);
app.use(cors());

// 🔥 COMPRESSION (BIG BOOST)
app.use(compression({ level: 6, threshold: 1024 }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());


// ================= 🔥 STATIC =================
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "public/assets")));


// ================= 🔥 SESSION =================
// app.use(
//   session({
//     name: "sara.sid",
//     secret: process.env.SESSION_SECRET || "dev_secret",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false,
//       sameSite: "lax",
//       maxAge: 1000 * 60 * 60,
//     },
//   })
// );


const store = new RedisStore({
  client: redisClient,
  prefix: "sess:",
  disableTouch: true,
});

app.use(
  session({
    store: store,
    name: "sara.sid",
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60,
    },
  })
);

// ================= 🔥 DEBUG LOG (SAFE) =================
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log("👉", req.method, req.url);
    next();
  });
}


// ================= 🔥 SETTINGS CACHE =================
let cachedSetting = null;
let lastFetchTime = 0;


// app.use(async (req, res, next) => {
//   try {
//     if (req.originalUrl.startsWith("/api")) return next();

//     const now = Date.now();

//     if (!cachedSetting || now - lastFetchTime > 15000) {
//       const result = await pool.query("SELECT * FROM site_settings LIMIT 1");
//       cachedSetting = result.rows[0] || {};
//       lastFetchTime = now;
//     }

//     res.locals.setting = cachedSetting;
//   } catch (err) {
//     res.locals.setting = {};
//   }

//   next();
// });
app.use(async (req, res, next) => {
  try {
    // ❗ admin skip
    if (
      req.originalUrl.startsWith("/api") ||
      req.originalUrl.startsWith("/admin")
    ) {
      return next();
    }

    const now = Date.now();

    if (!cachedSetting || now - lastFetchTime > 60000) {
      const result = await pool.query(
        "SELECT * FROM site_settings LIMIT 1"
      );
      cachedSetting = result.rows[0] || {};
      lastFetchTime = now;
    }

    res.locals.setting = cachedSetting;
  } catch (err) {
    console.error("Settings error:", err);
    res.locals.setting = {};
  }

  next();
});

// ================= 🔥 HIGH SPEED CACHE =================
const cache = new Map();
const MAX_CACHE = 2000;

app.use((req, res, next) => {
  const url = req.originalUrl;

  if (
    req.method !== "GET" ||
    url.includes("login") ||
    url.includes("fcm") ||
    url.includes("verify") ||
    url.includes("bid")
  ) {
    return next();
  }

  const key = req.method + url;
  const now = Date.now();

  if (cache.has(key)) {
    const { data, expiry } = cache.get(key);

    if (now < expiry) {
      return res.send(data);
    } else {
      cache.delete(key);
    }
  }

  let ttl = 10000;
  if (url.includes("wallet")) ttl = 5000;
  if (url.includes("games")) ttl = 15000;
  if (url.includes("apk")) ttl = 60000;

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    if (cache.size > MAX_CACHE) cache.clear();

    cache.set(key, {
      data: body,
      expiry: Date.now() + ttl,
    });

    return originalJson(body);
  };

  next();
});


// ================= 🔥 CACHE CLEAN =================
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now > value.expiry) cache.delete(key);
  }
}, 15000);


// ================= 🔥 TIMEOUT =================
app.use((req, res, next) => {
  res.setTimeout(15000, () => {
    if (!res.headersSent) {
      res.status(408).send("Timeout");
    }
  });
  next();
});


// ================= 🔥 ROUTES =================
app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/api", apisRoutes);


// ================= 🔥 ERROR =================
app.use(errorHandler);


// ================= 🔥 SERVER =================
const PORT = process.env.PORT || 3300;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



















































































// const express = require("express");
// const session = require("express-session");
// const path = require("path");
// const expressLayouts = require("express-ejs-layouts");
// const cookieParser = require("cookie-parser");
// require("dotenv").config({ path: __dirname + "/.env" });
// const cors = require("cors");
// const bodyParser = require("body-parser");

// const authRoutes = require("./routes/authRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const apisRoutes = require("./routes/apisRoutes");
// const errorHandler = require("./middleware/errorHandler");
// const pool = require("./config/db");

// const app = express();

// process.env.TZ = process.env.TZ || "Asia/Kolkata";


// // ================= 🔥 GLOBAL ERROR HANDLING =================
// process.on("uncaughtException", (err) => {
//   console.error("❌ Uncaught Exception:", err);
// });

// process.on("unhandledRejection", (err) => {
//   console.error("❌ Unhandled Rejection:", err);
// });


// // ================= 🔥 VIEW =================
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));


// // ================= 🔥 MIDDLEWARE =================
// app.use(expressLayouts);
// app.use(cors());

// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // app.use(bodyParser.json());
// // app.use(bodyParser.urlencoded({ extended: true }));

// app.use(cookieParser());


// // ================= 🔥 STATIC =================
// app.use(express.static(path.join(__dirname, "public")));
// app.use("/assets", express.static(path.join(__dirname, "public/assets"))); // ✅ FIXED


// // ================= 🔥 SESSION =================
// app.use(
//   session({
//     name: "sara.sid",
//     secret: process.env.SESSION_SECRET || "dev_secret",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false,
//       sameSite: "lax",
//       maxAge: 1000 * 60 * 60,
//     },
//   })
// );


// // ================= 🔥 REQUEST DEBUG =================
// app.use((req, res, next) => {
//   console.log("👉 HIT:", req.method, req.url);
//   next();
// });





// // ================= 🔥 SETTINGS CACHE =================
// let cachedSetting = null;
// let lastFetchTime = 0;

// app.use(async (req, res, next) => {
//   try {
//     if (req.originalUrl.startsWith("/api")) {
//       return next();
//     }

//     const now = Date.now();

//     if (!cachedSetting || now - lastFetchTime > 10000) {
//       const result = await pool.query("SELECT * FROM site_settings LIMIT 1");
//       cachedSetting = result.rows[0] || {};
//       lastFetchTime = now;

//       console.log("🔥 DB HIT (settings cached)");
//     }

//     res.locals.setting = cachedSetting;
//   } catch (err) {
//     console.error("Settings error:", err);
//     res.locals.setting = {};
//   }

//   next();
// });


// // ================= 🔥 GLOBAL API CACHE =================

// const cache = new Map();

// app.use((req, res, next) => {
//   const url = req.originalUrl;

//   // ❌ skip sensitive APIs
//   if (
//     url.includes("login")
//   ) {
//     return next();
//   }

//   // ✅ only GET APIs cache karo (safe)
//   if (req.method !== "GET") {
//     return next();
//   }

//   const key = req.method + url;
//   const now = Date.now();

//   // cache hit
//   if (cache.has(key)) {
//     const { data, expiry } = cache.get(key);

//     if (now < expiry) {
//       console.log("⚡ CACHE HIT:", key);
//       // return res.json(data);
//       return res.send(data);
//     } else {
//       cache.delete(key);
//     }
//   }

//   // dynamic TTL (route wise)
//   let ttl = 10000; // default 5 sec

//   if (url.includes("wallet")) ttl = 5000; // fast changing
//   if (url.includes("user")) ttl = 5000;
//   if (url.includes("games")) ttl = 15000;
//   if (url.includes("apk")) ttl = 60000;

//   const originalJson = res.json.bind(res);

//   if (cache.size > 1000) {
//     console.log("⚠️ Cache cleared (limit reached)");
//     cache.clear();
//   }

//   res.json = (body) => {
//     cache.set(key, {
//       data: body,
//       expiry: Date.now() + ttl,
//     });

//     console.log("💾 CACHE SAVE:", key);

//     return originalJson(body);
//   };

//   next();
// });
// /*
// const cache = new Map();

// app.use((req, res, next) => {
//   if (
//     !req.originalUrl.startsWith("/admin") ||
//     req.originalUrl.includes("login")
//   ) {
//     return next();
//   }

//   if (req.method !== "GET" && req.method !== "POST") {
//     return next();
//   }

//   const key = req.method + req.originalUrl;
//   const now = Date.now();

//   if (cache.has(key)) {
//     const { data, expiry } = cache.get(key);

//     if (now < expiry) {
//       console.log("⚡ CACHE HIT:", key);
//       return res.json(data);
//     } else {
//       cache.delete(key);
//     }
//   }

//   const originalJson = res.json.bind(res);

//   res.json = (body) => {
//     cache.set(key, {
//       data: body,
//       expiry: Date.now() + 5000,
//     });

//     console.log("💾 CACHE SAVE:", key);

//     return originalJson(body);
//   };

//   next();
// });
// */


// // ================= 🔥 CACHE CLEAN =================
// setInterval(() => {
//   const now = Date.now();

//   for (const [key, value] of cache.entries()) {
//     if (now > value.expiry) {
//       cache.delete(key);
//     }
//   }

//   console.log("🧹 Cache cleaned");
// }, 10000);


// // ================= 🔥 ROUTES =================






// // ================= 🔥 REQUEST TIMEOUT =================
// app.use((req, res, next) => {
//   res.setTimeout(15000, () => {
//     console.log("⏰ Timeout:", req.url);
//     res.status(408).send("Request Timeout Please wait..");
//   });
//   next();
// });






// app.use("/", authRoutes);
// app.use("/admin", adminRoutes);
// app.use("/api", apisRoutes);


// // ================= 🔥 ERROR HANDLER =================
// app.use(errorHandler);


// // ================= 🔥 SERVER =================
// const PORT = 3300;

// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });

























































// const express = require("express");
// const session = require("express-session");
// const path = require("path");
// const expressLayouts = require("express-ejs-layouts");
// const cookieParser = require("cookie-parser");
// // require("dotenv").config();
// require("dotenv").config({ path: __dirname + "/.env" });
// const cors = require("cors");
// const authRoutes = require("./routes/authRoutes");
// const adminRoutes = require("./routes/adminRoutes");
// const apisRoutes = require("./routes/apisRoutes");
// const errorHandler = require("./middleware/errorHandler");
// const bodyParser = require("body-parser");
// const app = express();
// const pool = require("./config/db");

// process.env.TZ = process.env.TZ || "Asia/Kolkata";
// /* view */
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "views"));

// /* layouts */
// app.use(expressLayouts);

// /* body parsers */
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// /* cookies */
// app.use(cookieParser());
 
// /* static */
// app.use(express.static(path.join(__dirname, "public")));
// app.use("/assets", express.static(path.join(__dirname, "public/assets")));
// /* session */
// app.use(
//   session({
//     name: "sara.sid",
//     secret: process.env.SESSION_SECRET || "dev_secret",
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       httpOnly: true,
//       secure: false,        // localhost
//       sameSite: "lax",
//       maxAge: 1000 * 60 * 60
//     }
//   })
// );



// // app.use(async (req, res, next) => {
// //   try {
// //     const result = await pool.query("SELECT * FROM site_settings LIMIT 1");
// //     res.locals.setting = result.rows[0] || {};
// //   } catch (err) {
// //     console.log(err);
// //     res.locals.setting = {};
// //   }
// //   next();
// // });


// let cachedSetting = null;
// let lastFetchTime = 0;

// app.use(async (req, res, next) => {
//   try {
//     const now = Date.now();

//     // 10 sec cache
//     if (!cachedSetting || now - lastFetchTime > 10000) {
//       const result = await pool.query("SELECT * FROM site_settings LIMIT 1");
//       cachedSetting = result.rows[0] || {};
//       lastFetchTime = now;
//       console.log("🔥 DB HIT (settings)");
//     }

//     res.locals.setting = cachedSetting;

//   } catch (err) {
//     console.log(err);
//     res.locals.setting = {};
//   }
//   next();
// });




// /* routes */
// app.use("/", authRoutes);
// app.use("/admin", adminRoutes);
// app.use("/api", apisRoutes);

// /* error handler */
// app.use(errorHandler);




// app.listen(3300, () => {
//   console.log("✅ Server running Port : 3300");
// });

