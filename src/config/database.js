const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

// Ouvre la connexion et synchronise les tables avec les modèles Sequelize
const connectDB = async () => {
  await sequelize.authenticate();
  console.log('[User DB] Connexion PostgreSQL OK');
  await sequelize.sync({ alter: true });
  console.log('[User DB] Tables synchronisées');
};

module.exports = { sequelize, connectDB };
