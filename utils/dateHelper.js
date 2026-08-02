const moment = require("moment");

exports.formatResultDate = (date) => {
  return moment(date).format("DD MMM YYYY");
};