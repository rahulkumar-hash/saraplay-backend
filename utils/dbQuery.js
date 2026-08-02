const pool = require("../config/db");

const dbQuery = async (text, params) => {
  const client = await pool.connect();

  try {
    const res = await client.query(text, params);
    return res;

  } catch (err) {
    throw err;

  } finally {
    client.release(); // 🔥 ALWAYS RELEASE
  }
};

module.exports = dbQuery;