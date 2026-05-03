import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

export function useStockSocket(medicineId) {
  const socketRef = useRef(null);
  const [liveStock, setLiveStock] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!medicineId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('watch_medicine', medicineId);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('stock_update', (data) => {
      setLiveStock(prev => ({
        ...prev,
        [data.pharmacyId]: {
          quantity: data.quantity,
          price: data.price,
          isAvailable: data.isAvailable
        }
      }));
    });

    return () => {
      socket.emit('unwatch_medicine', medicineId);
      socket.disconnect();
    };
  }, [medicineId]);

  return { liveStock, connected };
}
