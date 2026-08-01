require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initSockets } = require('./sockets');

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:3100', credentials: true },
});
initSockets(io);
app.set('io', io);

const PORT = process.env.PORT || 4100;
server.listen(PORT, () => {
  console.log(`Libertine API listening on http://localhost:${PORT}`);
});
