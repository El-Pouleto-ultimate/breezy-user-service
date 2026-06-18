require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3002;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`[user-service] :${PORT}`)))
  .catch(err => { console.error(err); process.exit(1); });