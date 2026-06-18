const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Follow = sequelize.define('Follow', {
  follower_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  followed_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'follows',
  underscored: true,
  updatedAt: false,
  indexes: [
    { unique: true, fields: ['follower_id', 'followed_id'] }
  ]
});

module.exports = Follow;