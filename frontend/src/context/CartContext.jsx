import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [pharmacyId, setPharmacyId] = useState(null);
  const [pharmacyInfo, setPharmacyInfo] = useState(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      const { items, pharmacyId, pharmacyInfo } = JSON.parse(savedCart);
      setItems(items || []);
      setPharmacyId(pharmacyId || null);
      setPharmacyInfo(pharmacyInfo || null);
    }
  }, []);

  // Save cart to localStorage on change
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify({ items, pharmacyId, pharmacyInfo }));
  }, [items, pharmacyId, pharmacyInfo]);

  const addItem = (item, pharmacy) => {
    // If cart has items from different pharmacy, ask to clear
    if (pharmacyId && pharmacyId !== pharmacy._id) {
      const confirm = window.confirm(
        'Your cart contains items from a different pharmacy. Would you like to clear it and add this item?'
      );
      if (!confirm) return false;
      clearCart();
    }

    setPharmacyId(pharmacy._id);
    setPharmacyInfo({
      _id: pharmacy._id,
      name: pharmacy.name,
      address: pharmacy.address
    });

    setItems(prev => {
      const existingIndex = prev.findIndex(i => i.medicineId === item.medicineId);
      
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        return updated;
      }
      
      return [...prev, item];
    });

    return true;
  };

  const updateQuantity = (medicineId, pharmacyId, quantity) => {
    if (quantity < 1) {
      removeFromCart(medicineId, pharmacyId);
      return;
    }

    setItems(prev => 
      prev.map(item => 
        item.medicineId === medicineId && item.pharmacyId === pharmacyId
          ? { ...item, quantity } 
          : item
      )
    );
  };

  const removeFromCart = (medicineId, pharmacyId) => {
    setItems(prev => {
      const filtered = prev.filter(item => 
        !(item.medicineId === medicineId && item.pharmacyId === pharmacyId)
      );
      if (filtered.length === 0) {
        setPharmacyId(null);
        setPharmacyInfo(null);
      }
      return filtered;
    });
  };

  const removeItem = (medicineId) => {
    setItems(prev => {
      const filtered = prev.filter(item => item.medicineId !== medicineId);
      if (filtered.length === 0) {
        setPharmacyId(null);
        setPharmacyInfo(null);
      }
      return filtered;
    });
  };

  const clearCart = () => {
    setItems([]);
    setPharmacyId(null);
    setPharmacyInfo(null);
    localStorage.removeItem('cart');
  };

  const getSubtotal = () => {
    return items.reduce((total, item) => {
      const itemPrice = item.price - (item.price * (item.discount || 0) / 100);
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  const getTax = () => {
    return getSubtotal() * 0.05;
  };

  const getTotal = (deliveryCharge = 0) => {
    return getSubtotal() + getTax() + deliveryCharge;
  };

  const getCartTotal = () => {
    return getSubtotal();
  };

  const getItemCount = () => {
    return items.reduce((count, item) => count + item.quantity, 0);
  };

  const getItemsByPharmacy = () => {
    const grouped = {};
    items.forEach(item => {
      const pId = item.pharmacyId;
      if (!grouped[pId]) {
        grouped[pId] = [];
      }
      grouped[pId].push(item);
    });
    return grouped;
  };

  const value = {
    items,
    cartItems: items,
    pharmacyId,
    pharmacyInfo,
    addItem,
    updateQuantity,
    removeFromCart,
    removeItem,
    clearCart,
    getSubtotal,
    getTax,
    getTotal,
    getCartTotal,
    getItemCount,
    getItemsByPharmacy,
    isEmpty: items.length === 0
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
