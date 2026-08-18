const express = require("express");
const router = express.Router();
const csrf = require("csurf");
const ResultController = require("../controllers/ResultController");
const UsersController = require("../controllers/UserController");
const AdminController = require("../controllers/AdminController");
const authMiddleware = require("../middleware/authMiddleware");
const UserBidController = require("../controllers/UserBidController");
const CustomerSellController = require("../controllers/CustomerSellController");
const WinningReportController = require("../controllers/WinningReportController");
const TransferPointController = require("../controllers/TransferPointController");
const ManageGameController = require("../controllers/ManageGameController");
const GameRateController = require("../controllers/GameRateController");
const StarlineGameController = require("../controllers/StarlineGameController");
const StarlineGameRateController = require("../controllers/StarlineGameRateController");
const ManageJackpotGamesController = require("../controllers/ManageJackpotGamesController");
const JackpotBidHistoryController = require("../controllers/JackpotBidHistoryController");
const JackpotDeclareResultController = require("../controllers/JackpotDeclareResultController");
const JackpotResultHistoryController = require("../controllers/JackpotResultHistoryController");
const JackpotWinningReportController = require("../controllers/JackpotWinningReportController");
const StarlineBidHistoryController = require("../controllers/StarlineBidHistoryController");
const StarlineDeclareResultController = require("../controllers/StarlineDeclareResultController");
const StarlineResultHistoryController = require("../controllers/StarlineResultHistoryController");
const StarlineSellReportController = require("../controllers/StarlineSellReportController");
const StarlineWinningReportController = require("../controllers/StarlineWinningReportController");
const mainSettingController = require("../controllers/mainSettingController");
const NumberPagesController = require("../controllers/NumberPagesController");
const ContactSettingController = require("../controllers/ContactSettingController");
const PlayGuideController = require("../controllers/PlayGuideController");
const NoticeController = require("../controllers/NoticeController");
const ProfileController = require("../controllers/ProfileController");
const upload = require("../middleware/upload");
const fileupload = require("../middleware/upload");



const csrfProtection = csrf({
   cookie: true
});
// const csrfProtection = csrf();
router.get("/dashboard", csrfProtection,authMiddleware, AdminController.dashboard);
// router.post("/get_today_totalbid", csrfProtection,authMiddleware, AdminController.getTodayTotalBid);
router.get("/logo-color-setting",csrfProtection,authMiddleware,AdminController.logoColorSetting);
router.post("/logo-color-setting",csrfProtection, authMiddleware,fileupload.single("logo"), AdminController.logoColorSettingSave);


router.post('/get_todaybid_details', csrfProtection,authMiddleware, AdminController.getTodayBidDetails);
router.post('/get_today_totalbid', csrfProtection,authMiddleware, AdminController.getTodayTotalBid);


// User 
router.post('/user/status-update',csrfProtection,authMiddleware, UsersController.updateUserStatus);

router.get("/Users", csrfProtection,authMiddleware, UsersController.index);
router.post("/users/data",csrfProtection,authMiddleware, UsersController.getUsersData);
router.get('/SingleUser/:id', csrfProtection,authMiddleware,UsersController.singleUser);
router.get('/single-user/:id', csrfProtection,authMiddleware,UsersController.singleUser);
router.get('/singleUserBidHis/:id', csrfProtection,authMiddleware,UsersController.singleUserBidHis);
router.get(
'/wallet-history/:id',
csrfProtection,
authMiddleware,
UsersController.walletHistory
);

router.get("/winning-history/:userId", csrfProtection,authMiddleware,UsersController.winningHistory);

router.post("/user-delete", csrfProtection, authMiddleware, UsersController.deleteUser);

router.post("/change-user-pin",csrfProtection,authMiddleware,UsersController.changeUserPin);






// Add Fund
router.post(
  "/user-add-fund",
  csrfProtection,
  authMiddleware,
  UsersController.addFund
);

// Withdraw Fund
router.post(
  "/user-withdraw-fund",
  csrfProtection,
  authMiddleware,
  UsersController.withdrawFund
);

router.post(
  "/admin-withdraw-list",
  csrfProtection,
  authMiddleware,
  UsersController.getWithdrawList
);

router.post(
  "/admin-withdraw-update",
  csrfProtection,
  authMiddleware,
  UsersController.updateWithdrawStatus
);









// Result
router.get("/declear-result", csrfProtection,authMiddleware, ResultController.index);

router.delete("/delete-result/:id/:title", authMiddleware, ResultController.delete);

// router.post("/get_decleare_game", csrfProtection, authMiddleware,ResultController.getDeclareGame);
// router.post("/show_winner", csrfProtection, authMiddleware,ResultController.showWinner);
router.post("/get-result-history", authMiddleware,ResultController.getResultHistory);
router.get("/get-games-for-declare",authMiddleware,ResultController.getGamesForDeclare);
router.post(
"/get_decleare_game",
authMiddleware,
ResultController.getDeclareGame
)

router.post(
"/save_result",
authMiddleware,
ResultController.saveResult
)

router.post(
"/declare_result",
authMiddleware,
ResultController.declareResult
)

router.post(
"/show_winner",
authMiddleware,
ResultController.showWinner
)














// Bid
router.get("/user-bid-history",csrfProtection,authMiddleware,UserBidController.index);
router.post("/search-bid-history",csrfProtection,authMiddleware, UserBidController.search);


// SaleController
router.get("/customer-sell-report",csrfProtection,authMiddleware,CustomerSellController.index);
router.post("/customer-sell-report/search",csrfProtection,authMiddleware,CustomerSellController.search);


//  winning report
router.get("/winning-report",csrfProtection, WinningReportController.index);
router.post("/winning-report/search", csrfProtection, WinningReportController.search);


// transfer-point-report
router.get("/transfer-point-report",csrfProtection,TransferPointController.index);
router.post("/transfer-point-report/search",csrfProtection,TransferPointController.search);



const BidWinReportController = require("../controllers/BidWinReportController");

router.get("/bid-win-report",
  csrfProtection,
  BidWinReportController.index
);

router.post(
  "/get-win-report",
  csrfProtection,
  BidWinReportController.getWinReport
);




const WithdrawController = require("../controllers/WithdrawController");

router.get(
  "/withdraw-report",
  csrfProtection,
  WithdrawController.index
);

router.post(
  "/withdraw-report/search",
  csrfProtection,
  WithdrawController.search
);

// router.post(
//   "/accept-withdraw",
//   csrfProtection,
//   WithdrawController.approve
// );

router.post(
  "/reject-withdraw",
  csrfProtection,
  WithdrawController.reject
);





const AutoDepositController = require("../controllers/AutoDepositController");

router.get(
  "/auto-deposit-history",
  csrfProtection,
  AutoDepositController.index
);

router.post(
  "/auto-deposit-history/search",
  csrfProtection,
  AutoDepositController.search
);



const ManualDepositController = require("../controllers/ManualDepositController");

router.get(
  "/manual-deposit-history",
  csrfProtection,
  ManualDepositController.index
);

router.post(
  "/manual-deposit-history/search",
  csrfProtection,
  ManualDepositController.search
);



const FundRequestController = require("../controllers/FundRequestController");

/* =========================
   FUND REQUEST HISTORY
========================= */
router.get(
  "/fund-request-history",
  csrfProtection,
  authMiddleware,
  FundRequestController.index
);

router.post('/fund-request/data', FundRequestController.getFundData);
router.post('/fund-request/approve', csrfProtection, authMiddleware, FundRequestController.approve);
router.post('/fund-request/reject', csrfProtection, authMiddleware, FundRequestController.reject);




const MasterWithdrawController = require("../controllers/MasterWithdrawController");

/* =========================
   MASTER WITHDRAW REQUEST
========================= */
router.get(
  "/master-withdraw-request",
  csrfProtection,
  authMiddleware,
  MasterWithdrawController.index
);

router.post(
  "/master-accept-withdraw",
  csrfProtection,
  authMiddleware,
  MasterWithdrawController.accept
);

router.post(
  "/master-reject-withdraw",
  csrfProtection,
  authMiddleware,
  MasterWithdrawController.reject
);




const WithdrawRequestController = require("../controllers/WithdrawRequestController");

/* =========================
   USER WITHDRAW REQUEST
========================= */
router.get(
  "/withdraw-request",
  csrfProtection,
  authMiddleware,
  WithdrawRequestController.index
);

router.post(
  "/withdraw-request/data",
  csrfProtection,
  authMiddleware,
  WithdrawRequestController.getData
);

router.post(
  "/accept-withdraw",
  csrfProtection,
  authMiddleware,
  WithdrawRequestController.accept
);

router.post(
  "/reject-withdraw",
  csrfProtection,
  authMiddleware,
  WithdrawRequestController.reject
);




const UserAddFundController = require("../controllers/UserAddFundController");

/* =========================
   USER ADD FUND
========================= */
router.get(
  "/user-add-fund",
  csrfProtection,
  authMiddleware,
  UserAddFundController.index
);

router.post(
  "/user-add-fund/users",
  csrfProtection,
  authMiddleware,
  UserAddFundController.getUsers
);

router.post(
  "/user-add-fund/submit",
  csrfProtection,
  authMiddleware,
  UserAddFundController.addFund
);







const BidRevertController = require("../controllers/BidRevertController");

/* =========================
   BID REVERT
========================= */
router.get(
  "/bid-revert",
  csrfProtection,
  authMiddleware,
  BidRevertController.index
);

router.post(
  "/bid-revert/search",
  csrfProtection,
  authMiddleware,
  BidRevertController.search
);

router.post(
  "/bid-revert/refund",
  csrfProtection,
  authMiddleware,
  BidRevertController.refund
);




/* =========================
   MANAGE GAME
========================= */
router.get("/manage-games", csrfProtection, authMiddleware, ManageGameController.index);
router.post("/manage-games/data", csrfProtection, authMiddleware, ManageGameController.getGames);
router.post("/manage-games/add", csrfProtection, authMiddleware,fileupload.none(), ManageGameController.addGame);
router.post("/manage-games/status", csrfProtection, authMiddleware, ManageGameController.updateStatus);
router.post("/manage-games/delete", csrfProtection, authMiddleware, ManageGameController.deleteGame);
router.post('/manage-games/get', csrfProtection,authMiddleware, ManageGameController.getGame);
router.post('/manage-games/update',csrfProtection,authMiddleware,fileupload.none(), ManageGameController.updateGame);
// End ManageGameController


/* =========================
   GAME RATES
========================= */
router.get("/game-rates", csrfProtection, authMiddleware,fileupload.none(), GameRateController.index);
router.post("/game-rates/update", csrfProtection, authMiddleware,fileupload.none(), GameRateController.update);


/* =========================
   STARLINE GAMES
========================= */
router.get("/manage-starline-games", csrfProtection, authMiddleware, StarlineGameController.index);
router.get("/manage-starline-games/data", csrfProtection, authMiddleware, StarlineGameController.getGames);
router.post("/manage-starline-games/data", csrfProtection, authMiddleware, StarlineGameController.getGames);
router.post("/manage-starline-games/add", csrfProtection, authMiddleware, fileupload.none(), StarlineGameController.addGame);
router.post("/manage-starline-games/update", csrfProtection, authMiddleware, fileupload.none(), StarlineGameController.updateGame);
router.post("/manage-starline-games/status", csrfProtection, authMiddleware, StarlineGameController.updateStatus);
router.post("/manage-starline-games/delete", csrfProtection, authMiddleware, fileupload.none(), StarlineGameController.deleteGame);

/* =========================
   STARLINE GAMES Rates
========================= */
router.get("/starline-game-rates", csrfProtection, authMiddleware, StarlineGameRateController.index);
router.post("/starline-game-rates/update", csrfProtection, authMiddleware, StarlineGameRateController.update);


/* =========================
   STARLINE BID HISTORY
========================= */
router.get("/starline-bid-history", csrfProtection, authMiddleware, StarlineBidHistoryController.index);
router.post("/starline-bid-history/data", csrfProtection, authMiddleware, StarlineBidHistoryController.data);
router.post("/starline-bid-history/games", csrfProtection, authMiddleware, StarlineBidHistoryController.games);



/* =========================
   STARLINE DECLARE RESULT
========================= */
router.get("/starline-declare-result", csrfProtection, authMiddleware, StarlineDeclareResultController.index);
router.get("/starline-declare-result/games", authMiddleware, StarlineDeclareResultController.getGamesForDeclare);
router.post("/starline-declare-result/games", authMiddleware, StarlineDeclareResultController.getGamesForDeclare);
router.post("/starline-declare-result/data", csrfProtection, authMiddleware, StarlineDeclareResultController.data);
router.post("/starline-declare-result/get-game", csrfProtection, authMiddleware, StarlineDeclareResultController.getDeclareGame);
router.post("/starline-declare-result/show-winner", csrfProtection, authMiddleware, StarlineDeclareResultController.showWinner);
router.post("/starline-declare-result/delete", csrfProtection, authMiddleware, StarlineDeclareResultController.deleteResult);
router.post("/starline-declare-result/save", csrfProtection, authMiddleware, StarlineDeclareResultController.saveResult);
router.post("/starline-declare-result/declare", csrfProtection, authMiddleware, StarlineDeclareResultController.declareResult);


/* =========================
   STARLINE RESULT HISTORY
========================= */

router.get("/starline-result-history", csrfProtection, authMiddleware, StarlineResultHistoryController.index);
router.post("/starline-result-history/data", csrfProtection, authMiddleware, StarlineResultHistoryController.data);



/* =========================
   STARLINE SELL REPORT
========================= */
router.get("/starline-sell-report", csrfProtection, authMiddleware, StarlineSellReportController.index);
router.post("/starline-sell-report/data", csrfProtection, authMiddleware, StarlineSellReportController.data);



/* =========================
   STARLINE WINNING REPORT
========================= */
router.get("/starline-winning-report", csrfProtection, authMiddleware, StarlineWinningReportController.index);
router.post("/starline-winning-report/data", csrfProtection, authMiddleware, StarlineWinningReportController.data);






/* =========================
   Jackpot GAMES
========================= */

router.get("/manage-jackpot-games", csrfProtection, authMiddleware, ManageJackpotGamesController.index);
router.post("/manage-jackpot-games/data", csrfProtection, authMiddleware, ManageJackpotGamesController.getGames);
router.post("/manage-jackpot-games/add", csrfProtection, authMiddleware, fileupload.none(), ManageJackpotGamesController.add);
router.post("/manage-jackpot-games/update", csrfProtection, authMiddleware, fileupload.none(), ManageJackpotGamesController.update);
router.post("/manage-jackpot-games/status", csrfProtection, authMiddleware, fileupload.none(), ManageJackpotGamesController.status);
router.post("/manage-jackpot-games/delete", csrfProtection, authMiddleware, fileupload.none(), ManageJackpotGamesController.delete);


/* =========================
   Jackpot GAMES Bid
========================= */

router.get("/jackpot-bid-history", csrfProtection, authMiddleware, JackpotBidHistoryController.index);
router.post("/jackpot-bid-history/data", csrfProtection, authMiddleware, JackpotBidHistoryController.data);




/* =========================
   Jackpot Declare Result
========================= */

router.get("/jackpot-declare-result", csrfProtection, authMiddleware, JackpotDeclareResultController.index);
router.get("/get-jackpot-games-for-declare", authMiddleware, JackpotDeclareResultController.getGamesForDeclare);
router.post("/get-jackpot-games-for-declare", authMiddleware, JackpotDeclareResultController.getGamesForDeclare);
router.post("/get-jackpot-declare-game", csrfProtection, authMiddleware, JackpotDeclareResultController.getDeclareGame);
router.post("/get-jackpot-declare-results", csrfProtection, authMiddleware, JackpotDeclareResultController.getDeclareResults);
router.post("/jackpot-save-result", csrfProtection, authMiddleware, JackpotDeclareResultController.saveResult);
router.post("/jackpot-declare-result", csrfProtection, authMiddleware, JackpotDeclareResultController.declareResult);
router.post("/show-jackpot-winner", csrfProtection, authMiddleware, JackpotDeclareResultController.showWinner);
router.post('/delete-jackpot-declare-result', csrfProtection, authMiddleware, JackpotDeclareResultController.delete);


/* =========================
   Jackpot Declare Result History
========================= */

router.get("/jackpot-result-history", csrfProtection, authMiddleware, JackpotResultHistoryController.index);
router.post("/jackpot-result-history/data", csrfProtection, authMiddleware, JackpotResultHistoryController.data);



/* =========================
   Jackpot Winning Report
========================= */
router.get("/jackpot-winning-report", csrfProtection, authMiddleware, JackpotWinningReportController.index);
router.post("/jackpot-winning-report/data", csrfProtection, authMiddleware, JackpotWinningReportController.data);


/* =========================
   Number Page
========================= */

router.get("/single-digit", csrfProtection,authMiddleware, NumberPagesController.singleDigit);
router.get("/jodi-digit", csrfProtection,authMiddleware, NumberPagesController.jodiDigit);
router.get("/single-pana", csrfProtection,authMiddleware, NumberPagesController.singlePana);
router.get("/double-pana", csrfProtection,authMiddleware, NumberPagesController.doublePana);
router.get("/tripple-pana",csrfProtection,authMiddleware, NumberPagesController.tripplePana);
router.get("/half-sangam", csrfProtection,authMiddleware, NumberPagesController.halfSangam);
router.get("/full-sangam", csrfProtection,authMiddleware, NumberPagesController.fullSangam);



/* =========================
   Setting
========================= */



router.get("/main-setting", csrfProtection,authMiddleware, mainSettingController.index);
router.post("/update-bank", csrfProtection,authMiddleware, upload.none(),mainSettingController.updateBank);
router.post("/update-upi", csrfProtection,authMiddleware,upload.none(), mainSettingController.updateUpi);
router.post("/update-maintenance", csrfProtection,authMiddleware, upload.none(),mainSettingController.updateMaintenance);
router.post("/update-values", csrfProtection,authMiddleware,upload.none(), mainSettingController.updateValues);

router.post("/update-applink", csrfProtection,authMiddleware,upload.none(), mainSettingController.updateApplink);
router.post("/main-setting-status", csrfProtection,authMiddleware,upload.none(), mainSettingController.toggleMaintenance);
router.post("/main-setting-status1", csrfProtection,authMiddleware,upload.none(), mainSettingController.toggleGlobalBetting);
router.post("/update-payment-settings",csrfProtection,authMiddleware,upload.none(),mainSettingController.updatePaymentSettings);



/* =========================
  contact Setting
========================= */


router.get("/contact-setting", csrfProtection, authMiddleware, ContactSettingController.index);
router.post("/contact-setting/update", csrfProtection, authMiddleware, ContactSettingController.update);


/* =========================
  play guide
========================= */

router.get("/play-guide", csrfProtection, authMiddleware, PlayGuideController.index);
router.post("/play-guide/update", csrfProtection, authMiddleware, PlayGuideController.update);


/* =========================
  notification
========================= */
router.get("/notice-management", csrfProtection, authMiddleware, NoticeController.index);
router.post("/notice-management/add", csrfProtection, authMiddleware, NoticeController.store);
router.get("/send-notification", csrfProtection, authMiddleware, NoticeController.sendNotificationPage);
router.get("/search-user", csrfProtection, authMiddleware, NoticeController.searchUser);
router.post("/send-notification", csrfProtection, authMiddleware, NoticeController.sendNotification);
router.post("/notice-management/delete/:id", csrfProtection, authMiddleware,NoticeController.delete);

/* =========================
  profile
========================= */

router.get("/manage-profile", authMiddleware, csrfProtection, ProfileController.manageProfile);
router.post("/update-profile", authMiddleware, upload.single("image"), ProfileController.updateProfile);
router.post("/change-password", authMiddleware, ProfileController.changePassword);
router.post("/change-pin", authMiddleware, ProfileController.changePin);




// Route ------------------------------------------------------------------------------------------------------>


router.get("/logout", csrfProtection,authMiddleware, AdminController.logout);
module.exports = router;
