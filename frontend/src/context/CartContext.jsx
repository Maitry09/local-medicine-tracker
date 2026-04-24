import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'medicine_tracker_cart';

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {

  // FIXED: Initialize cart from localStorage so it survives page refresh
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      // If localStorage is corrupted, start fresh
      console.error('Failed to load cart from storage:', err);
      return [];
    }
  });

  // FIXED: Persist cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Failed to save cart to storage:', err);
    }
  }, [cartItems]);

  const addToCart = (medicine, pharmacy, stockItem) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(
        item => item.medicineId === medicine._id && item.pharmacyId === pharmacy._id
      );

      if (existingIndex >= 0) {
        // Update quantity if already in cart
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      }

      // Add new item
      return [...prev, {
        id: `${medicine._id}_${pharmacy._id}`,
        medicineId: medicine._id,
        medicineName: medicine.name,
        genericName: medicine.genericName,
        pharmacyId: pharmacy._id,
        pharmacyName: pharmacy.name,
        price: stockItem.price,
        discount: stockItem.discount || 0,
        quantity: 1,
        maxQuantity: stockItem.quantity,
        prescriptionRequired: medicine.prescriptionRequired
      }];
    });
  };

  const removeFromCart = (itemId, pharmacyId) => {
    setCartItems(prev =>
      prev.filter(item => !(item.medicineId === itemId && item.pharmacyId === pharmacyId))
    );
  };

  const updateQuantity = (itemId, pharmacyId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId, pharmacyId);
      return;
    }
    setCartItems(prev =>
      prev.map(item =>
        item.medicineId === itemId && item.pharmacyId === pharmacyId
          ? { ...item, quantity: Math.min(newQuantity, item.maxQuantity) }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const discountedPrice = item.price - (item.price * item.discount / 100);
      return total + (discountedPrice * item.quantity);
    }, 0);
  };

  const getItemsByPharmacy = () => {
    return cartItems.reduce((groups, item) => {
      const key = item.pharmacyId;
      if (!groups[key]) groups[key] = { pharmacyName: item.pharmacyName, items: [] };
      groups[key].items.push(item);
      return groups;
    }, {});
  };

  const getTotalItems = () => cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getCartTotal,
      getItemsByPharmacy,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;