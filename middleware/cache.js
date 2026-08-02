const redis = require("../config/redis");

module.exports = (ttl = 10) => async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id : "guest";
    const key = `cache:${userId}:${req.originalUrl}`;

    const cached = await redis.get(key);

    if (cached) {
      console.log("⚡ Redis CACHE HIT:", key);
      return res.json(JSON.parse(cached));
    }

    const originalJson = res.json.bind(res);

    res.json = async (body) => {
      try {
        // ✅ FIXED for ioredis
        await redis.set(key, JSON.stringify(body), "EX", ttl);
      } catch (err) {
        console.error("Redis set error:", err);
      }

      return originalJson(body);
    };

    next();
  } catch (err) {
    console.error("Redis middleware error:", err);
    next();
  }
};




// const redis = require("../config/redis");

// module.exports = (ttl = 10) => async (req, res, next) => {
//   try {
//     // 🔐 Better key
//     const userId = req.user ? req.user.id : "guest";
//     const key = `cache:${userId}:${req.originalUrl}`;

//     const cached = await redis.get(key);

//     if (cached) {
//       console.log("⚡ Redis CACHE HIT:", key);
//       return res.json(JSON.parse(cached));
//     }

//     const originalJson = res.json.bind(res);

//     res.json = async (body) => {
//       try {
//         // await redis.set(key, JSON.stringify(body), {
//         //   EX: ttl, // seconds
//         // });

//         await redis.set(key, JSON.stringify(body));
//         await redis.expire(key, ttl);


//       } catch (err) {
//         console.error("Redis set error:", err);
//       }

//       return originalJson(body);
//     };

//     next();
//   } catch (err) {
//     console.error("Redis middleware error:", err);
//     next();
//   }
// };