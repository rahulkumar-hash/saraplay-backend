const db = require("../config/db");

// =============================
// Close Markets
// =============================
const closeMarkets = async () => {
  const currentTime = new Date().toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });

  console.log("🕒 Current Time:", currentTime);

  const result = await db.query(`
    UPDATE game
    SET market_status = 'false'
    WHERE market_status = 'true'
    AND TO_TIMESTAMP(close_time, 'HH12:MI AM')::time
        <= TO_TIMESTAMP($1, 'HH12:MI AM')::time
  `, [currentTime]);

  console.log(`✅ Closed Markets: ${result.rowCount}`);
};

// =============================
// Reset Markets
// =============================
const resetMarkets = async () => {

  console.log("🚀 Reset Cron Running:", new Date());

  const today = new Date()
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toLowerCase();

  console.log("📅 Today:", today);

  await db.query(`
    UPDATE game
    SET market_status = 'true'
  `);

  const result = await db.query(`
    UPDATE game
    SET market_status = 'false'
    WHERE 
      closing_day IS NOT NULL
      AND TRIM(closing_day) <> ''
      AND LOWER(REPLACE(closing_day,' ',''))
      LIKE '%' || $1 || '%'
  `,[today]);

  console.log(`✅ Closed By Day: ${result.rowCount}`);
};

// =============================
// Runner
// =============================
const run = async () => {

  try {

    const type = process.argv[2];

    console.log("🟢 Cron Type:", type);

    if(type === "close"){

      await closeMarkets();

    } else if(type === "reset"){

      await resetMarkets();

    } else {

      console.log("❌ Invalid Cron Type");
    }

  } catch(err){

    console.error("❌ Error:", err);

  } finally {

    console.log("✅ Cron Finished");

    // // close pg pool
    // await db.end();

    process.exit(0);
  }
};

run();