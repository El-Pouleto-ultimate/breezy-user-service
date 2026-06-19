const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

require('./models/userProfile.model');
require('./models/follow.model');

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));
app.use('/users', require('./routes/user.routes'));

app.use((err, req, res, next) => {
  console.error('[user-service] Erreur non gérée:', err.message);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Erreur serveur.'
    }
  });
});

module.exports = app;
