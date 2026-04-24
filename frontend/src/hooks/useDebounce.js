import { useState, useEffect } from 'react';

/**
 * Delays updating a value until the user stops changing it.
 * Prevents excessive API calls on every keystroke.
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Milliseconds to wait (use 300 for search inputs)
 * @returns {any} - The debounced value (updates only after delay)
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 300);
 *   useEffect(() => { fetchData(debouncedQuery); }, [debouncedQuery]);
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set a timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // If value changes before delay completes, cancel the previous timer
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;