// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
const {
  sendSingleNotification,
  sendMultiNotification,
  sendAll
} = require("../utils/sendNotification");

/* =========================
   LIST PAGE
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT *
      FROM notice
      ORDER BY id DESC limit 100
    `);

    console.log(result);

    res.render("notice/index", {
      title: "Notice Management",
      layout: "layouts/admin",
      data: result.rows,
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("Notice index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   ADD NOTICE (AJAX)
========================= */
exports.store = async (req, res) => {
  try {
    const { title, des, ndate } = req.body;

    if (!title || !des) {
      return res.json({ res: "error", msg: "Data required" });
    }

    const noticeDate = new Date(ndate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    const createdAt = new Date().toLocaleString("en-GB");

    await dbQuery(`
      INSERT INTO notice (title, des, notice_date, date)
      VALUES ($1, $2, $3, $4)
    `, [title, des, noticeDate, createdAt]);

    // Also trigger FCM broadcast notification when notice is added
    try {
      await sendAll("all", title, des);
    } catch (fcmErr) {
      console.error("FCM Notice Broadcast Error:", fcmErr);
    }

    res.json({
      res: "success",
      msg: "Notice Added Successfully"
    });

  } catch (err) {
    console.error("Notice store error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};


/* =========================
   DELETE NOTICE
========================= */
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await dbQuery(
      `DELETE FROM notice WHERE id=$1`,
      [id]
    );

    res.json({
      res: "success",
      msg: "Notice deleted successfully"
    });

  } catch (err) {
    console.error("Notice delete error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};


/* =========================
   SEND NOTIFICATION PAGE
========================= */
exports.sendNotificationPage = async (req, res) => {
  try {
    res.render("notice/send-notification", {
      title: "Send Notification",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });
  } catch (err) {
    console.error("SendNotification page error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   USER LIVE SEARCH
========================= */
exports.searchUser = async (req, res) => {
  try {
    const q = req.query.q || "";

    const result = await dbQuery(
      `
      SELECT id, name, mobile
      FROM "users"
      WHERE name ILIKE $1 OR mobile ILIKE $1
      ORDER BY id DESC
      LIMIT 10
      `,
      [`%${q}%`]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("User search error:", err);
    res.json([]);
  }
};


/* =========================
   SEND NOTIFICATION (POST)
========================= */

exports.sendNotification = async (req, res) => {

  try {

    const { user_id, send_all, title, body } = req.body;

    if (!title || !body) {
      return res.json({
        res: "error",
        msg: "Title & Description required"
      });
    }

    /* =====================================
       🔔 SEND TO ALL USERS
    ===================================== */
    if (send_all == 1 || user_id === "all" || !user_id) {

      // ✅ Save DB
      await dbQuery(
        `
        INSERT INTO public.notifications (user_id, title, body, created_at)
        SELECT id, $1, $2, NOW()
        FROM "users"
        `,
        [title, body]
      );

      const response = await sendAll(
        "all",
        title,
        body
      );

      console.log("Firebase All Response:", response);

    }

    /* =====================================
       🔔 SEND TO SINGLE USER
    ===================================== */
    else {

      // ✅ Save DB
      await dbQuery(
        `
        INSERT INTO public.notifications
        (user_id, title, body, created_at)
        VALUES ($1, $2, $3, NOW())
        `,
        [user_id, title, body]
      );

      // ✅ Get User Token
      const userResult = await dbQuery(
        `
        SELECT fcm_token
        FROM "users"
        WHERE id = $1
        LIMIT 1
        `,
        [user_id]
      );

      if (
        userResult.rows.length > 0 &&
        userResult.rows[0].fcm_token
      ) {

        // ✅ Firebase send
        const response = await sendSingleNotification(
          userResult.rows[0].fcm_token,
          title,
          body
        );

        console.log("Firebase Single Response:", response);
      } else {
        // Fallback broadcast to topic 'all' if user fcm_token is not set in DB
        const response = await sendAll(
          "all",
          title,
          body
        );
        console.log("Firebase Fallback Response:", response);
      }
    }

    return res.json({
      res: "success",
      msg: "Notification sent successfully"
    });

  } catch (err) {

    console.error("SendNotification error:", err);
    return res.json({
      res: "error",
      msg: "Failed to send notification"
    });

  }
};