import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const timeoutsRef = useRef(new Map());

  useEffect(() => {
    return () => {
      // Clear all timeouts on unmount
      timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.current.clear();
    };
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    // Clear timeout if exists
    if (timeoutsRef.current.has(id)) {
      clearTimeout(timeoutsRef.current.get(id));
      timeoutsRef.current.delete(id);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutsRef.current.clear();
    // Clear all notifications
    setNotifications([]);
  }, []);

  const addNotification = useCallback(
    (message, type = 'info', duration = 5000) => {
      const id = Date.now() + Math.random();

      setNotifications((prev) => [...prev, { id, message, type }]);

      if (duration > 0) {
        // Clear any previous timeout for this notification type (to prevent stacking)
        const timeoutId = setTimeout(() => {
          removeNotification(id);
        }, duration);
        timeoutsRef.current.set(id, timeoutId);
      }

      return id;
    },
    [removeNotification]
  );

  const success = useCallback(
    (message, duration) => addNotification(message, 'success', duration),
    [addNotification]
  );

  const error = useCallback(
    (message, duration) => addNotification(message, 'danger', duration),
    [addNotification]
  );

  const warning = useCallback(
    (message, duration) => addNotification(message, 'warning', duration),
    [addNotification]
  );

  const info = useCallback(
    (message, duration) => addNotification(message, 'info', duration),
    [addNotification]
  );

  const showNotification = useCallback(
    (message, type = 'info', duration = 5000) =>
      addNotification(message, type, duration),
    [addNotification]
  );

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showNotification,
    success,
    error,
    warning,
    info,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Toast Container */}
      <div className="notification-container">
        {notifications.map(({ id, message, type }) => (
          <div
            key={id}
            className={`notification notification-${type}`}
            onClick={() => removeNotification(id)}
          >
            <span>{message}</span>
            <button
              className="notification-close"
              onClick={(e) => {
                e.stopPropagation();
                removeNotification(id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};