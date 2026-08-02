// const pool = require("../config/db");
const dbQuery = require("../utils/dbQuery");





exports.dashboard = async (req, res) => {
  
  try {

    const gamesData = await dbQuery("SELECT id, name FROM game ORDER BY id ASC");

    const totalUsers = await dbQuery(`
      SELECT COUNT(*) 
      FROM users 
      WHERE delete_status = 'false'
    `);

     const unapproved = await dbQuery(`
      SELECT COUNT(*) 
      FROM users 
      WHERE status = 'false' and delete_status = 'false'
    `);

     const approved = await dbQuery(`
      SELECT COUNT(*) 
      FROM users 
      WHERE status = 'true' and delete_status = 'false'
    `);

    const todayUsers = await dbQuery(`
      SELECT COUNT(*) 
      FROM users 
      WHERE DATE(date)=CURRENT_DATE 
      AND delete_status = 'false'
    `);

    const players = await dbQuery(`
      SELECT COUNT(DISTINCT w.user_id)
      FROM wallet w
      JOIN users u ON u.id = w.user_id
      WHERE DATE(w.txn_date)=CURRENT_DATE
      AND u.delete_status = 'false'
    `);

    // const players = await dbQuery(`
    //   SELECT COUNT(DISTINCT user_id) AS total_unique_users
    //   FROM user_bid
    //   WHERE game_date LIKE '%' || TO_CHAR(CURRENT_DATE, 'DD Mon YYYY') || '%'
    // `);

// const players = await dbQuery(`
//       SELECT COUNT(DISTINCT ub.user_id) 
//       FROM user_bid ub
//       JOIN users u ON u.id = ub.user_id
//       WHERE u.delete_status = 'false' 
//     `);


    // and DATE(ub.date)=CURRENT_DATE 

    const activeToday = await dbQuery(`
      SELECT COUNT(DISTINCT w.user_id)
      FROM wallet w
      JOIN users u ON u.id = w.user_id
      WHERE DATE(w.txn_date)=CURRENT_DATE 
       AND DATE(u.date) = CURRENT_DATE
      AND (w.txn_comment = 'Wallet Topup via Payment' OR w.txn_comment = 'Online UPI Credit From App')
      AND u.delete_status = 'false'
    `);

    // const autoDeposit = await dbQuery(`
    //   SELECT w.*, u.name
    //   FROM wallet w
    //   LEFT JOIN users u ON u.id = w.user_id
    //   WHERE w.txn_comment='Wallet Topup via Payment'
    //   AND u.delete_status = 'false'
    //   ORDER BY w.id DESC
    //   LIMIT 20
    // `);

    // console.log(autoDeposit.rows);

const autoDeposit = await dbQuery(`
    SELECT 
        w.*, 
        u.name

    FROM wallet w

    LEFT JOIN users u 
        ON u.id = w.user_id

    WHERE (w.txn_comment = 'Wallet Topup via Payment' OR w.txn_comment = 'Online UPI Credit From App')

    AND u.delete_status = 'false'

    AND w.txn_date::timestamp >= CURRENT_DATE

    AND w.txn_date::timestamp < CURRENT_DATE + INTERVAL '1 day'

    ORDER BY w.id DESC

    LIMIT 20
`); 

      // console.log(autoDeposit.rows);


    res.render("dashboard/index", {
      layout: "layouts/admin",
      title: "Dashboard",
      admin: req.session.admin,
      csrfToken: req.csrfToken(),
      games: gamesData.rows,
      counts: {
        totalUsers: totalUsers.rows[0].count,
        todayUsers: todayUsers.rows[0].count,
        approved: approved.rows[0].count,
        unapproved: unapproved.rows[0].count,
        players: players.rows[0].count??0,
        activeToday: activeToday.rows[0].count
      },
      autoDeposit: autoDeposit.rows
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Server Error");
  }
};












/* Logout */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};






/* Logo & Color Setting Page */
exports.logoColorSetting = async (req, res) => {
  let setting = {};

  try {
    const result = await dbQuery(
      "SELECT * FROM site_settings LIMIT 1"
    );
    setting = result.rows[0] || {};
  } catch (err) {
    console.log(err);
  }

  res.render("settings/logo_color", {
    layout: "layouts/admin",
    title: "Logo & Color Settings",
    csrfToken: req.csrfToken(),
    admin: req.session.admin,
    setting
  });
};





/* Save Logo & Color Settings */
exports.logoColorSettingSave = async (req, res) => {
  try {
    const { primary_color, secondary_color } = req.body;

    // ✅ multer se file yahan milegi
    const logo = req.file ? req.file.filename : null;

    await dbQuery(
      `
      INSERT INTO site_settings (id, logo, primary_color, secondary_color)
      VALUES (1, $1, $2, $3)
      ON CONFLICT (id)
      DO UPDATE SET
        logo = COALESCE($1, site_settings.logo),
        primary_color = $2,
        secondary_color = $3
      `,
      [logo, primary_color, secondary_color]
    );

    res.json({
      status: true,
      message: "Settings updated successfully"
    });

  } catch (err) {
    console.log(err);
    res.json({
      status: false,
      message: "Something went wrong"
    });
  }
};















exports.getTodayBidDetails = async (req, res) => {
  try {
    console.log(req.body);
    const { game_id, session } = req.body;

    if (!game_id || !session) {
      return res.json({ status: false, msg: "Missing params" });
    }

    // FIXED DATE FORMAT
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = new Date();

    const today = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    
    console.log("DATE:", today);

    const result = await dbQuery(`
      SELECT 
        pana,
        SUM(points) as total_points,
        COUNT(*) as total_bids
      FROM user_bid
      WHERE game_id = $1
      AND session = $2
      AND game_date = $3
      GROUP BY pana
    `, [game_id, session, today]);

    let data = {};
    for (let i = 0; i <= 9; i++) {
      data['Ank' + i] = 0;
      data['points' + i] = 0;
    }

    result.rows.forEach(r => {
      let num = r.pana;
      data['Ank' + num] = Number(r.total_bids);
      data['points' + num] = Number(r.total_points);
    });

    res.json(data);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
};




 


exports.getTodayTotalBid = async (req, res) => {
  try {
    const { game_id = 'all', game_date, apicount = 0 } = req.body;

    // ================= DATE FORMAT (PHP SAME) =================
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = game_date ? new Date(game_date) : new Date();

    const date = `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const dateYMD = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    console.log("DATE:", date);
    console.log("DATE YMD:", dateYMD);

    // ================= SAFE SUM FUNCTION =================
    const safeSum = (col) => `SUM(${col}::numeric)`;

    // ================= TOTAL BID =================
    let total_bid = 0;

    console.log(game_id);


    if (game_id === 'all') {
      const r = await dbQuery(`
        SELECT ${safeSum('points')} as total_bid
        FROM user_bid
        WHERE game_date = $1
      `, [date]);

      total_bid = +r.rows[0].total_bid || 0;

    } else {
      const r = await dbQuery(`
        SELECT ${safeSum('points')} as total_bid
        FROM user_bid
        WHERE game_date = $1 AND game_id = $2
      `, [date, game_id]);

      total_bid = +r.rows[0].total_bid || 0;
    }

    console.log(total_bid);
    // ================= TOTAL WIN =================
    let total_win = 0;

    if (game_id === 'all') {
      const r = await dbQuery(`
        SELECT ${safeSum('amount')} as total_win
        FROM win_history
        WHERE game_date = $1
      `, [date]);

      total_win = +r.rows[0].total_win || 0;

    } else {
      const r = await dbQuery(`
        SELECT ${safeSum('amount')} as total_win
        FROM win_history
        WHERE game_date = $1 AND game_id = $2
      `, [date, game_id]);

      total_win = +r.rows[0].total_win || 0;
    }

    

     console.log(total_win);

    // // ================= WITHDRAW =================
    const withdrawRes = await dbQuery(`
      SELECT ${safeSum('amount')} as total_withdraw
      FROM withdraw_request
      WHERE status='Pending'
      AND DATE(date)=$1
    `, [date]);

    const total_withdraw = +withdrawRes.rows[0].total_withdraw || 0;


     console.log(total_withdraw);

    // ================= FUNDS =================
    const fundRes = await dbQuery(`
      SELECT ${safeSum('txn_crdt')} as total
      FROM wallet
      WHERE txn_comment='Direct Credit By Admin'
      AND DATE(txn_date)=$1
    `, [date]);


    
    const upiRes = await dbQuery(`
      SELECT ${safeSum('txn_crdt')} as total
      FROM wallet
      WHERE (txn_comment = 'Wallet Topup via Payment' OR txn_comment = 'Online UPI Credit From App')
      AND DATE(txn_date)=$1
    `, [date]);

    const add_fund = +fundRes.rows[0].total || 0;
    const total_deposit = +upiRes.rows[0].total || 0;

    // ================= LOSS =================
    const total_loss = total_bid - total_win;

     console.log(total_loss);

    // ================= TODAY USERS =================
    // const todayUsersRes = await dbQuery(`
    //   SELECT COUNT(*) FROM user
    //   WHERE DATE(date) = $1
    // `, [dateYMD]);

    // const totalUserstoday2 = +todayUsersRes.rows[0].count || 0;

    // const playersRes = await dbQuery(`
    //   SELECT COUNT(DISTINCT user_id)
    //   FROM user_bid
    //   WHERE game_date LIKE $1
    // `, [date + '%']);

    // const totalUserstoday1 = +playersRes.rows[0].count || 0;

    // ================= FINAL RESPONSE =================
    res.json({
      total_bid,
      total_win,
      total_withdraw,
      total_loss,
      total_deposit,
      add_fund
    });


  } catch (err) {
    console.log("ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

