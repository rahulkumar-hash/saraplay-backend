'use strict';


module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("admin_login_logs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      admin_id: Sequelize.INTEGER,
      email: Sequelize.STRING,
      ip_address: Sequelize.STRING,
      user_agent: Sequelize.TEXT,
      status: Sequelize.STRING,
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("admin_login_logs");
  }
};

