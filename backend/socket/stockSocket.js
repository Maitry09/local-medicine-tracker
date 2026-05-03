// backend/socket/stockSocket.js
// Install: npm install socket.io
// In server.js: import { initSocket, getIO } from './socket/stockSocket.js';
// After: const server = app.listen(PORT, ...) → add: initSocket(server);

import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client joins a "medicine room" to get updates for a specific medicine
    socket.on('watch_medicine', (medicineId) => {
      socket.join(`medicine:${medicineId}`);
    });

    socket.on('unwatch_medicine', (medicineId) => {
      socket.leave(`medicine:${medicineId}`);
    });

    // Client joins pharmacy room
    socket.on('watch_pharmacy', (pharmacyId) => {
      socket.join(`pharmacy:${pharmacyId}`);
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

// Call this from stock.controller.js after any quantity change:
// emitStockUpdate(medicineId, pharmacyId, { quantity, price, isAvailable })
export function emitStockUpdate(medicineId, pharmacyId, stockData) {
  if (!io) return;
  io.to(`medicine:${medicineId}`).emit('stock_update', {
    medicineId,
    pharmacyId,
    ...stockData,
    timestamp: new Date().toISOString()
  });
}
