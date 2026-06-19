const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Relation de suivi entre deux utilisateurs
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
  // Contrainte unique en base pour empêcher de suivre deux fois la même personne
  indexes: [
    { unique: true, fields: ['follower_id', 'followed_id'] }
  ]
});

module.exports = Follow;
