// const pool = require("../../config/db");

const dbQuery = require("../../utils/dbQuery");

exports.getUserWalletBalance = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // ✅ Get latest wallet balance
    const walletQuery = await dbQuery(
      `SELECT txn_clbal 
       FROM wallet 
       WHERE user_id = $1
       ORDER BY id DESC 
       LIMIT 1`,
      [userId]
    );

    if (walletQuery.rows.length === 0) {
      return res.json({
        status: false,
        message: "Insufficient Balance",
        balance: "0"
      });
    }

    const balance = parseFloat(walletQuery.rows[0].txn_clbal || 0).toFixed(2);

    return res.json({
      status: true,
      message: "Data Found",
      balance: balance
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  }
};







exports.walletCreditTransaction = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    // const user_id = '54740';

    const body = req.body || {};
    let page = parseInt(body.page) || 1;
    let limit = parseInt(body.limit) || 10;

    if (page <= 0) page = 1;
    if (limit <= 0 || limit > 100) limit = 10;

    const offset = (page - 1) * limit;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Invalid User"
      });
    }

    // 📊 Total Count
    const countQuery = await dbQuery(
      `SELECT COUNT(*) FROM wallet
       WHERE user_id=$1
       AND txn_crdt != '0'
       AND (
            txn_comment='Direct Credit By Admin'
            OR txn_comment='Wallet Topup via Payment'
       )`,
      [user_id]
    );

    const totalRecords = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // 📄 Data Query
    const walletData = await dbQuery(
      `SELECT * FROM wallet
       WHERE user_id=$1
       AND txn_crdt != '0'
       AND (
            txn_comment='Direct Credit By Admin'
            OR txn_comment='Wallet Topup via Payment'
       )
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    if (walletData.rows.length === 0) {
      return res.json({
        status: false,
        message: "No Transaction Found",
        data: []
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: page,
        per_page: limit,
        total_records: totalRecords,
        total_pages: totalPages
      },
      data: walletData.rows
    });

  } catch (error) {
    console.error("Wallet Credit Transaction Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};





exports.walletDebitTransaction = async (req, res) => {
  try {

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized"
      });
    }

    const user_id = req.user.id;
    // const user_id = '54740';
    

    const body = req.body || {};
    let page = parseInt(body.page) || 1;
    let limit = parseInt(body.limit) || 10;

    if (page <= 0) page = 1;
    if (limit <= 0 || limit > 100) limit = 10;

    const offset = (page - 1) * limit;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id=$1",
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: "Invalid User"
      });
    }

    // 📊 Total Count
    const countQuery = await dbQuery(
      `SELECT COUNT(*) FROM wallet
       WHERE user_id=$1
       AND txn_dbdt != '0'`,
      [user_id]
    );

    const totalRecords = parseInt(countQuery.rows[0].count);
    const totalPages = Math.ceil(totalRecords / limit);

    // 📄 Data Query
    const walletData = await dbQuery(
      `SELECT * FROM wallet
       WHERE user_id=$1
       AND txn_dbdt != '0'
       ORDER BY id DESC
       LIMIT $2 OFFSET $3`,
      [user_id, limit, offset]
    );

    if (walletData.rows.length === 0) {
      return res.json({
        status: false,
        message: "No Transaction Found",
        data: []
      });
    }

    return res.json({
      status: true,
      message: "Data Found",
      pagination: {
        current_page: page,
        per_page: limit,
        total_records: totalRecords,
        total_pages: totalPages
      },
      data: walletData.rows
    });

  } catch (error) {
    console.error("Wallet Debit Transaction Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
};
































































































































































exports.getFundTransferHistory = async (req, res) => {
  const userId = req.user.id;

  const result = await dbQuery(
    `SELECT 
       ft.*,
       u1.name AS sender_name,
       u2.name AS receiver_name
     FROM fund_transfer ft
     LEFT JOIN user u1 ON ft.from_user = u1.id
     LEFT JOIN user u2 ON ft.to_user = u2.id
     WHERE ft.from_user=$1 OR ft.to_user=$1
     ORDER BY ft.id DESC`,
    [userId]
  );

  res.json({
    status: true,
    message: "Fund Transfer History Found",
    data: result.rows
  });
};




exports.getWithdrawHistory = async (req, res) => {
  const userId = req.user.id;

  const result = await dbQuery(
    `SELECT * FROM withdraw_requests
     WHERE user_id=$1
     ORDER BY id DESC`,
    [userId]
  );

  res.json({
    status: true,
    message: "Withdraw History Found",
    data: result.rows
  });
};




exports.walletTransaction = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, type } = req.body || {};

    if (!userId) {
      return res.json({
        status: false,
        message: "Missing Parameters"
      });
    }

    const currentPage = parseInt(page);
    const perPage = parseInt(limit);
    const offset = (currentPage - 1) * perPage;

    // ✅ Check user exists
    const userCheck = await dbQuery(
      "SELECT id FROM users WHERE id = $1",
      [userId]
    );

    if (userCheck.rows.length === 0) {
      return res.json({
        status: false,
        message: "Invalid User"
      });
    }

    // ✅ Build filter dynamically - default = both debit & credit
    let typeFilter = "";
    const queryParams = [userId];

    if (type && ["debit", "credit"].includes(type.toLowerCase())) {
      typeFilter = `AND type = $${queryParams.length + 1}`;
      queryParams.push(type.toLowerCase());
    }
    // agar type nahi bheja ya invalid bheja -> filter hi nahi lagega -> sab aayega

    // ✅ Total count
    const countQuery = await dbQuery(
      `SELECT COUNT(*) FROM wallet WHERE user_id = $1 ${typeFilter}`,
      queryParams
    );

    const total = parseInt(countQuery.rows[0].count);

    if (total === 0) {
      return res.json({
        status: false,
        message: "No Transaction Found"
      });
    }

    // ✅ Paginated transactions (debit + credit both by default)
    const walletQuery = await dbQuery(
      `SELECT *
       FROM wallet
       WHERE user_id = $1 ${typeFilter}
       ORDER BY id DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, perPage, offset]
    );

    return res.json({
      status: true,
      message: "Data Found",
      page: currentPage,
      limit: perPage,
      total,
      totalPages: Math.ceil(total / perPage),
      result: walletQuery.rows
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Server Error"
    });
  }
};