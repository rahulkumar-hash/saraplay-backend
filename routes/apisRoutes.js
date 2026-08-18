const express = require("express");
const router = express.Router();
const AuthController = require("../controllers/api/AuthController");
const GameController = require("../controllers/api/GameController");
const WalletController = require("../controllers/api/WalletController");
const BidController = require("../controllers/api/BidController");
const WithdrawController = require("../controllers/api/WithdrawController");
const StarlineController = require("../controllers/api/StarlineController");
const GameResultController = require("../controllers/api/GameResultController");
const AutoGameResultController = require("../controllers/api/AutoGameResultController");
const cache = require("../middleware/cache");

const dbQuery = require("../utils/dbQuery");

const jwtAuth = require("../middleware/jwtAuth");

const paymentController = require("../controllers/paymentController");

router.post("/create-payment", paymentController.createPayment);
router.post("/payment-callback", paymentController.paymentCallback);

router.post("/auto-result-declare", AutoGameResultController.autoResultDeclare);



router.get("/getPaymentSettings", async (req, res) => {
    try {
        const result = await dbQuery(
            `SELECT upi_status, primexpay_status
             FROM main_setting
             WHERE id = $1`,
            [1]
        );

        if (result.rows.length === 0) {
            return res.json({
                status: "error",
                message: "Settings not found"
            });
        }

        const settings = result.rows[0];

        return res.json({
            status: "success",
            message: "Payment mode status",
            payment_modes: {
                upi: settings.upi_status == 1,
                primexpay: settings.primexpay_status == 1
            }
        });

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            status: "error",
            message: "Something went wrong"
        });
    }
});


// Public Routes

router.post("/user/register", AuthController.register);
router.post("/user/login", AuthController.login);
router.post("/user/number-verify", AuthController.number_verify);


router.post("/user/forget-password", AuthController.forgetPassword);
router.post("/user/update", jwtAuth, AuthController.updateProfile);

router.post("/login/mpin", jwtAuth, AuthController.verifyPin);


router.post("/user/logout", jwtAuth, AuthController.logout);

router.post("/user/change-password", jwtAuth, AuthController.changePassword);
router.get("/get-user-details", jwtAuth,cache(5), AuthController.getUserDetails);

router.post("/bid/place", jwtAuth, BidController.placedBid);
router.post("/jackpot-bid-history", jwtAuth, BidController.jackpotBidHistory);








// router.post("/user/update", jwtAuth, AuthController.updateFCM);



router.post("/user/change-mpin", jwtAuth, AuthController.changeMpin);
// router.get("/user/profile", jwtAuth, AuthController.getUserData);






// router.get("/wallet/balance", jwtAuth, WalletController.getWalletBalance);
// router.get("/wallet/transactions", jwtAuth, WalletController.getWalletTransactions);

router.post("/wallet/recharge", jwtAuth, WalletController.walletRecharge);
router.post("/wallet/transfer", jwtAuth, WalletController.fundTransfer);










// // User
router.post("/withdraw/request", jwtAuth, WithdrawController.withdrawRequest);
router.post("/withdraw/history", jwtAuth, WithdrawController.withdrawFundHistory);




// // Admin
// router.post("/admin/withdraw/process", jwtAuth, WithdrawController.processWithdraw);





router.get("/starline/games", jwtAuth, StarlineController.starlineGetGames);
router.post("/starline/placeBid", jwtAuth, StarlineController.starlinePlacedBid);


router.post("/starline/win-history", jwtAuth, StarlineController.starlineWinHistory);

router.get("/starline/rates", jwtAuth, StarlineController.starlineGameRates);

router.post("/starline/history", jwtAuth, StarlineController.starlineBidHistory);
router.post("/starline/game-status", jwtAuth, StarlineController.starlineGameStatus);
router.post("/starline/game-chart", jwtAuth, StarlineController.starlineGameChart);
router.get("/starline/result-chart", jwtAuth, StarlineController.starlineResultChart);














// // Admin
// router.post("/admin/starline/result", jwtAuth, StarlineController.declareStarlineResult);






// // Admin Only
// router.post("/admin/game/result", jwtAuth, GameResultController.declareResult);












const UtilityController = require("../controllers/api/UtilityController");

router.get("/apk-update",jwtAuth, cache(60), UtilityController.getApkUpdate);
router.post("/notification/update",jwtAuth, UtilityController.updateNotificationStatus);
router.get("/notification/get", jwtAuth,cache(10), UtilityController.getNotifications);
router.get("/notification/list", jwtAuth, UtilityController.getUserNotifications);
router.post("/notification/mark-read", jwtAuth, UtilityController.markNotificationRead);
router.post("/notification/mark-all-read", jwtAuth, UtilityController.markAllNotificationsRead);
router.delete("/notification/delete/:id", jwtAuth, UtilityController.deleteNotification);
router.delete("/notification/delete-all", jwtAuth, UtilityController.deleteAllNotifications);
router.get("/notification/preferences", jwtAuth, UtilityController.getNotificationPreferences);
router.post("/notification/preferences", jwtAuth, UtilityController.updateNotificationPreferences);
router.post("/fcm/update", jwtAuth,UtilityController.updateFcm);
router.get("/user/verify",jwtAuth,UtilityController.verifyUser);










// Game APIs


router.get("/games",  cache(15), GameController.getGames);
router.get("/games/details", jwtAuth, GameController.getGameDetails);
router.get("/how-to-play",jwtAuth, GameController.getHowToPlay);
router.post("/win/history", jwtAuth, GameController.winHistory);
router.post("/bid/history", jwtAuth, GameController.bidHistory);
router.get("/game/rates", jwtAuth, GameController.gameRates);
router.post("/declear-digit", jwtAuth,GameController.declearDigit);

router.post('/check-game-session', jwtAuth,GameController.checkGameSession);
router.post("/new-win-history", jwtAuth, GameController.newWinHistory);


// router.get("/games/advanced", jwtAuth, GameController.getGamesAdvanced);


router.get("/game/chart-list", jwtAuth, GameController.gameChartList);
router.get("/game/jodi-chart", jwtAuth, GameController.getGameJodiChart);
router.post("/game/jodi-chart", jwtAuth, GameController.getGameJodiChart);
router.get("/game/panel-chart", jwtAuth, GameController.getGamePanelChart);
router.post("/game/panel-chart", jwtAuth, GameController.getGamePanelChart);









const WalletReportController = require("../controllers/api/WalletReportController");
router.get("/wallet/balance-detail", jwtAuth,cache(5), WalletReportController.getUserWalletBalance);
router.get("/wallet/transactions/all", jwtAuth, WalletReportController.walletTransaction);
router.post("/wallet/transactions/credit", jwtAuth, WalletReportController.walletCreditTransaction);
router.post("/wallet/transactions/debit", jwtAuth, WalletReportController.walletDebitTransaction);

// router.get("/wallet/fund-transfer-history", jwtAuth, WalletReportController.getFundTransferHistory);
// router.get("/withdraw/history-detail", jwtAuth, WalletReportController.getWithdrawHistory);





const PaymentController = require("../controllers/api/PaymentController");
router.post("/payment/add-bank", jwtAuth, PaymentController.addBank);
router.post("/payment/add-phonepe", jwtAuth, PaymentController.addPhonepe);
router.post("/payment/add-gpay", jwtAuth, PaymentController.addGooglePay);
router.post("/payment/add-paytm", jwtAuth, PaymentController.addPaytm);
router.get("/payment/details", jwtAuth, PaymentController.getPaymentDetails);
router.get("/payment/get-bank", jwtAuth, PaymentController.getBankDetails);






const AppController = require("../controllers/api/AppController");

router.get("/app/banner", jwtAuth, cache(60), AppController.getBanner);

router.get("/app/limitations", jwtAuth,cache(30), AppController.getAppLimitations);
router.get("/app/maintenance", jwtAuth,AppController.getAppMaintenance);
// router.get("/app/referal-code", jwtAuth, AppController.getReferalCode);










const JackpotController = require("../controllers/api/JackpotController");

router.get("/jackpot/games", jwtAuth, JackpotController.getJackpotGames);
router.post("/jackpot/place-bids", jwtAuth, JackpotController.addBulkBids);
router.post("/jackpot/bid-history", jwtAuth, JackpotController.jackpotBidHistory);
router.post("/jackpot/win-history", jwtAuth, JackpotController.jackpotWinHistory);
router.post("/jackpot/game-chart", jwtAuth, JackpotController.jackpotGameChart);
router.get("/jackpot/result-chart", jwtAuth, JackpotController.jackpotResultChart);


















// Protected Route Example
// router.get("/user/dashboard", jwtAuth, (req, res) => {
//   res.json({
//     message: "Welcome to Admin Dashboard",
//     admin: req.admin,
//   });
// });




module.exports = router;
