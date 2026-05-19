export const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
};

export const validatePassword = (password) => {
  if (typeof password !== 'string') return false;
  return password.length >= 6;
};

export const validatePhone = (phone) => {
  if (!phone) return true;
  return /^[0-9]{10}$/.test(String(phone).trim());
};

export const validateRequired = (value) => {
  return String(value).trim().length > 0;
};
