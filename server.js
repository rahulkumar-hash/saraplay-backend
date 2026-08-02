const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis").default;
const redisClient = require("./config/redis");

const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");

require("dotenv").config({
    path: __dirname + "/.env"
});

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const apisRoutes = require("./routes/apisRoutes");

const errorHandler = require("./middleware/errorHandler");
const pool = require("./config/db");

const app = express();

process.env.TZ = process.env.TZ || "Asia/Kolkata";


// ================= GLOBAL ERROR =================
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Rejection:", err);
});


// ================= BASIC =================
app.disable("x-powered-by");

app.set("trust proxy", 1);


// ================= VIEW =================
app.set("view engine", "ejs");

app.set(
    "views",
    path.join(__dirname, "views")
);


// ================= MIDDLEWARE =================
app.use(expressLayouts);

app.use(cors());

app.use(
    compression({
        level: 6,
        threshold: 1024
    })
);

app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(cookieParser());


// ================= STATIC =================
app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);

app.use(
    "/assets",
    express.static(
        path.join(
            __dirname,
            "public/assets"
        )
    )
);


// ================= REDIS SESSION =================
const store = new RedisStore({
    client: redisClient,
    prefix: "sess:"
});

app.use(
    session({

        store,

        name: "sara.sid",

        secret:
            process.env.SESSION_SECRET ||
            "secret",

        resave: false,

        saveUninitialized: false,

        rolling: true,

        cookie: {

            httpOnly: true,

            secure: false,

            sameSite: "lax",

            maxAge:
                1000 *
                60 *
                60
        }
    })
);


// ================= DEBUG =================
app.use((req, res, next) => {

    console.log(
        "👉",
        req.method,
        req.url
    );

    console.log(
        "SessionID:",
        req.sessionID
    );

    next();
});


// ================= SETTINGS CACHE =================
let cachedSetting = null;

let lastFetchTime = 0;

app.use(
    async (
        req,
        res,
        next
    ) => {

        try {

            if (
                req.originalUrl.startsWith(
                    "/api"
                )
            ) {
                return next();
            }

            const now =
                Date.now();

            if (
                !cachedSetting ||
                now -
                    lastFetchTime >
                    60000
            ) {

                const result =
                    await pool.query(
                        `
                        SELECT *
                        FROM site_settings
                        LIMIT 1
                    `
                    );

                cachedSetting =
                    result
                        .rows[0] ||
                    {};

                lastFetchTime =
                    now;
            }

            res.locals.setting =
                cachedSetting;

        } catch (err) {

            console.error(
                "❌ Settings Error:",
                err
            );

            res.locals.setting =
                {};
        }

        next();
    }
);


// ================= ROUTES =================
app.use(
    "/",
    authRoutes
);

app.use(
    "/admin",
    adminRoutes
);

app.use(
    "/api",
    apisRoutes
);


// ================= ERROR =================
app.use(
    errorHandler
);


// ================= SERVER =================
const PORT =
    process.env.PORT ||
    3300;

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Server running on port ${PORT}`
        );

        console.log(
            "✅ Redis Connected"
        );
    }
);