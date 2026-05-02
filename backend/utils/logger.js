// Environment-aware logger
// In development: all logs print
// In production: only warn/error print, debug/info are suppressed

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  // Info — only in development
  info: (...args) => {
    if (isDev) console.log('[INFO]', ...args);
  },

  // Debug — only in development
  debug: (...args) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },

  // Warning — always shown
  warn: (...args) => {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },

  // Error — always shown
  error: (...args) => {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },

  // HTTP request — only in development
  http: (method, path, extra = {}) => {
    if (isDev) {
      console.log(`[HTTP] ${method} ${path}`, extra);
    }
  }
};

export default logger;