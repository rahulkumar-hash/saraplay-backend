// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");

/* =========================
   PAGE LOAD
========================= */
exports.index = async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT *
      FROM contact_settings
      WHERE id = 1
      LIMIT 1
    `);

    res.render("contactSetting/index", {
      title: "Contact Setting",
      layout: "layouts/admin",
      data: result.rows[0],
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("ContactSetting index error:", err);
    res.status(500).send("Server Error");
  }
};


/* =========================
   UPDATE (AJAX)
========================= */
exports.update = async (req, res) => {
  try {
    const {
      id,
      mobile,
      telegram,
      whatsapp,
      landline,
      landline2,
      email,
      email2,
      fb_link,
      twitter_link,
      youtube_link,
      google_plus,
      insta_link,
      latitude,
      longitude,
      address
    } = req.body;

    if (!id || !mobile || !email) {
      return res.json({ res: "error", msg: "Data required" });
    }

    await dbQuery(`
      UPDATE contact_settings SET
        mobile = $1,
        telegram = $2,
        whatsapp = $3,
        landline = $4,
        landline2 = $5,
        email = $6,
        email2 = $7,
        fb_link = $8,
        twitter_link = $9,
        youtube_link = $10,
        google_plus = $11,
        insta_link = $12,
        latitude = $13,
        longitude = $14,
        address = $15,
        date = NOW()
      WHERE id = $16
    `, [
      mobile,
      telegram,
      whatsapp,
      landline,
      landline2,
      email,
      email2,
      fb_link,
      twitter_link,
      youtube_link,
      google_plus,
      insta_link,
      latitude,
      longitude,
      address,
      id
    ]);

    res.json({
      res: "success",
      msg: "Updated Successfully"
    });

  } catch (err) {
    console.error("ContactSetting update error:", err);
    res.json({ res: "error", msg: "Something went wrong" });
  }
};
