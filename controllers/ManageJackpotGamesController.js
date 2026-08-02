// const pool = require("../config/db");

const dbQuery = require("../utils/dbQuery");
/* =========================
   MANAGE JACKPOT GAMES
========================= */

exports.index = async (req, res) => {
  try {
    res.render("manageJackpotGames/index", {
      title: "Manage Jackpot Games",
      layout: "layouts/admin",
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("ManageJackpotGames index error:", err);
    res.status(500).send("Server Error");
  }
};


exports.getGames = async (req, res) => {
  try {
    const result = await dbQuery(
      "SELECT * FROM jackpot ORDER BY id DESC"
    );

    res.json({
      status: true,  
      csrfToken: req.csrfToken(),
      data: result.rows      // 🔥 must be array
    });

  } catch (err) {
    console.error(err);
    res.json({ status: false, data: [] });
  }
};


exports.add = async (req, res) => {
  try {
    const { id, name, close_time } = req.body;

    if (!name || !close_time) {
      return res.json({
        res: "error",
        csrfToken: req.csrfToken(),
        msg: "Data require"
      });
    }

    const formattedTime = close_time; // HH:mm already

    if (id) {
      await dbQuery(
        `UPDATE jackpot SET name=$1, close_time=$2 WHERE id=$3`,
        [name, formattedTime, id]
      );

      return res.json({
        res: "success",
        csrfToken: req.csrfToken(),
        msg: "Updated Success",
        url: "../manage-jackpot-games"
      });
    } else {
      await dbQuery(
        `INSERT INTO jackpot (name, close_time) VALUES ($1, $2)`,
        [name, formattedTime]
      );

      return res.json({
        res: "success",
        msg: "Added Success",
        csrfToken: req.csrfToken(),
        url: "manage-jackpot-games"
      });
    }

  } catch (err) {
    console.error("ManageJackpotGames save error:", err);
    res.json({
      res: "error",
      csrfToken: req.csrfToken(),
      msg: "Something went wrong"
    });
  }
};


exports.edit = async (req, res) => {
  try {
    const id = req.params.id;

    const result = await dbQuery(
      `SELECT * FROM jackpot WHERE id=$1`,
      [id]
    );

    res.render("manageJackpotGames/edit", {
      title: "Update Jackpot Game",
      layout: "layouts/admin",
      data: result.rows[0],
      csrfToken: req.csrfToken(),
      admin: req.session.admin
    });

  } catch (err) {
    console.error("ManageJackpotGames edit error:", err);
    res.status(500).send("Server Error");
  }
};


exports.update = async(req,res)=>{
  const {id,name,close_time}=req.body;
  await dbQuery(
    `UPDATE jackpot SET name=$1,close_time=$2 WHERE id=$3`,
    [name,close_time,id]
  );
  res.json({res:'success',csrfToken: req.csrfToken(),msg:'Updated'});
};

exports.status = async(req,res)=>{
  await dbQuery(
    `UPDATE jackpot SET status=$1 WHERE id=$2`,
    [req.body.value,req.body.id]
  );
  res.json({res:'success',csrfToken: req.csrfToken(),msg:'Status updated'});
};

exports.delete = async(req,res)=>{
  await dbQuery(
    `DELETE FROM jackpot WHERE id=$1`,
    [req.body.id]
  );
  res.json({res:'success',csrfToken: req.csrfToken(),msg:'Deleted'});
};