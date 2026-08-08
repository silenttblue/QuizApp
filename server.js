/**
 * QuiZapp entry point
 *
 * Why a separate server.js?
 * - Creates the HTTP server and attaches Socket.io
 * - Keeps Express app configuration (app.js) testable and portable
 * - Starts listening only after MongoDB is connected
 */
require('dotenv').config();

const http = require('http');
const app = require('./server/app');
const connectDB = require('./server/config/db');
const { initSocket } = require('./server/sockets/socketHandler');

const PORT = process.env.PORT || 3000;

async function start() {
  await connectDB();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`QuiZapp running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
