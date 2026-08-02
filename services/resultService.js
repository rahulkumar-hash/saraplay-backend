const pool = require("../config/db");

exports.getResultByGameDate = async (rdate, game_id) => {

  const result = await pool.query(
    `SELECT * FROM declear_result 
     WHERE result_date=$1 AND game_id=$2`,
    [rdate, game_id]
  );

  return result.rows[0] || null;
};


exports.insertOpenResult = async (rdate, game_id, pana, digit) => {

  await pool.query(`
    INSERT INTO declear_result
    (
      result_date,
      game_id,
      open_pana,
      open_digit
    )
    VALUES ($1,$2,$3,$4)
  `,[
    rdate,
    game_id,
    pana,
    digit
  ]);

};


exports.updateOpenResult = async (rdate, game_id, pana, digit) => {

  await pool.query(`
  UPDATE declear_result
  SET open_pana=$1, open_digit=$2
  WHERE result_date=$3 AND game_id=$4
  `,[pana,digit,rdate,game_id]);

};



exports.updateCloseResult = async (rdate, game_id, pana, digit) => {

  await pool.query(`
  UPDATE declear_result
  SET close_pana=$1,
      close_digit=$2
  WHERE result_date=$3 AND game_id=$4
  `,[pana,digit,rdate,game_id]);

};