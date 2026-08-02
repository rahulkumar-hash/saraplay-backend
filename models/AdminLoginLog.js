module.exports = (sequelize, DataTypes) => {
  const AdminLoginLog = sequelize.define("AdminLoginLog", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("success", "failed"),
      allowNull: false
    }
  }, {
    tableName: "admin_login_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false
  });

  return AdminLoginLog;
};
