require('./db'); // initialize DB schema on startup
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Family Helper API listening on http://localhost:${PORT}`);
});
