const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user',
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  followers_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  following_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'user_profiles',
  underscored: true,
});

module.exports = UserProfile;