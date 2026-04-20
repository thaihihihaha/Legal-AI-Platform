import app from './src/app.js';

const PORT = process.env.APP_PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server đang chạy tại cổng http://localhost:${PORT}`);
});
