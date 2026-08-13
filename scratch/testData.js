const dbQuery = require("../utils/dbQuery");
const starlineController = require("../controllers/StarlineDeclareResultController");
const jackpotController = require("../controllers/JackpotDeclareResultController");

async function testData() {
  try {
    console.log("=== Testing Starline Data ===");
    const req1 = { body: { result_date: "2026-08-13", game_id: "7" } };
    const res1 = { json: data => console.log("Starline data response:", data) };
    await starlineController.data(req1, res1);

    console.log("\n=== Testing Jackpot Data ===");
    const req2 = { body: { date: "2026-08-13", game_id: "17" }, csrfToken: () => "test" };
    const res2 = { json: data => console.log("Jackpot data response:", data) };
    await jackpotController.getDeclareResults(req2, res2);

  } catch (err) {
    console.error("Error in testData:", err);
  } finally {
    process.exit();
  }
}

testData();
