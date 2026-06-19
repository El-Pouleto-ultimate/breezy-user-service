const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// Profil public d'un utilisateur, créé par synchronisation depuis l'auth-service
// L'id est imposé par l'auth-service (UUID identique), pas généré ici
const UserProfile = sequelize.define('UserProfile', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  // Rôle répliqué depuis l'auth-service pour les vérifications de permission
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin'),
    defaultValue: 'user',
  },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_banned: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Compteurs mis à jour en temps réel lors des follow/unfollow (via transaction)
  followers_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  following_count: { type: DataTypes.INTEGER, defaultValue: 0 },
}, {
  tableName: 'user_profiles',
  underscored: true,
});

module.exports = UserProfile;
