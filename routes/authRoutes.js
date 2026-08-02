const express = require("express");
const rateLimit = require("express-rate-limit");
const csrf = require("csurf");
const db = require("../config/db");
const router = express.Router();
const LoginController = require("../controllers/LoginController");
const allowOnlyServer  = require("../middleware/validIp");
const bcrypt = require('bcrypt');
const path = require("path");

/* ✅ SESSION BASED CSRF (NO COOKIE CONFIG) */
// const csrfProtection = csrf();
const csrfProtection = csrf({
   cookie: true
});

/* rate limiter */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});


/* login page */


router.get('/webapi/jodi-chart/:id', async (req, res) => {
    const gameId = req.params.id;

    try {
        let game = await db.query(
            `SELECT * FROM game WHERE id = $1`,
            [gameId]
        );

        let results = await db.query(`
            SELECT result_date, open_digit, close_digit 
            FROM declear_result 
            WHERE close_result='Declared' 
            AND game_id=$1 
            ORDER BY result_date ASC
        `, [gameId]);

        let formatted = results.rows.map(r => ({
            date: r.result_date,
            jodi: r.open_digit + r.close_digit
        }));

        res.json({
            game: game.rows[0],
            results: formatted
        });

    } catch (err) {
        console.error(err); // 👈 add this
        res.status(500).json({ error: err.message });
    }
});



router.post('/webapi/reset-password', async (req, res) => {

  const { user_id, password } = req.body;

  try {

    const hashed = await bcrypt.hash("12345678", 10);
    await db.query(
      `UPDATE users SET password = $1 WHERE id = $2`,
      [hashed, user_id]
    );

    res.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (err) {
    console.error(err);
    res.json({
      success: false,
      message: "Error resetting password"
    });
  }

});






router.get('/webapi/pana-chart/:id', async (req, res) => {
    const gameId = req.params.id;

    try {
        let game = await db.query(
            `SELECT * FROM game WHERE id = $1`,
            [gameId]
        );

        let results = await db.query(`
            SELECT result_date, open_pana, close_pana, open_digit, close_digit
            FROM declear_result
            WHERE close_result='Declared'
            AND game_id=$1
            ORDER BY result_date ASC
        `, [gameId]);

        let formatted = results.rows.map(r => ({
            date: r.result_date,
            open_pana: r.open_pana,
            close_pana: r.close_pana,
            jodi: r.open_digit + r.close_digit
        }));

        res.json({
            game: game.rows[0],
            results: formatted
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});






router.get("/webapi/settings", async (req, res) => {
  const result = await db.query("SELECT * FROM site_settings LIMIT 1");
  const result1 = await db.query("SELECT * FROM contact_settings LIMIT 1");

  res.json({
    status: true,
    theam: result.rows[0],
    data: result1.rows[0]
  });
});

// router.get("/", csrfProtection, LoginController.loginPage);

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/chart", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

router.get("/login", csrfProtection, LoginController.loginPage);

/* login submit */
router.post("/api/login",csrfProtection,loginLimiter,LoginController.loginApi);


module.exports = router;
