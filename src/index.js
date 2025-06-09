require('dotenv').config(); // ← load .env before anything else

const app = require('./app');
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
