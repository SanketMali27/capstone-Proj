import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [listingEvents, setListingEvents] = useState([]);

  const socket = useMemo(() => {
    if (!token) {
      return null;
    }

    return io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });
  }, [token]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    socket.on('notification', (payload) => {
      setNotifications((current) => [payload, ...current]);
    });

    socket.on('listing:update', (payload) => {
      setListingEvents((current) => [payload, ...current]);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, notifications, listingEvents, setNotifications, setListingEvents }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);

