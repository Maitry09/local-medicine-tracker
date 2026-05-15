import {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react';

const CartContext = createContext(null);

const CART_STORAGE_KEY = 'medicine_tracker_cart';

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);

      if (!saved) return [];

      const parsed = JSON.parse(saved);

      // ensure array
      if (!Array.isArray(parsed)) return [];

      // normalize + filter bad items
      return parsed
        .filter(item => item && (item._id || item.medicineId))
        .map(item => ({
          _id: item._id || item.medicineId,
          medicineId: item.medicineId || item._id,
          pharmacyId: item.pharmacyId || item.pharmacy?._id,
          pharmacyName: item.pharmacyName || item.pharmacy?.name || 'Pharmacy',
          medicine: item.medicine || {},
          name: item.name || item.medicine?.name || 'Medicine',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1,
          discount: Number(item.discount) || 0,
          maxQuantity: Number(item.maxQuantity) || 10
        }));

    } catch (err) {
      console.error('Failed to load cart:', err);
      return [];
    }
  });

  // ✅ SAVE CART
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartItems)
      );
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  }, [cartItems]);

  const addToCart = (item) => {

  const finalItem = {
    ...item,
    price: Math.round(Number(item.price || 0)),
    pharmacyPrice: Math.round(Number(item.price || 0))
  };

  setCartItems(prev => {

    const existingItem = prev.find(
      i => i._id === finalItem._id
    );

    if (existingItem) {
      return prev.map(i =>
        i._id === finalItem._id
          ? {
              ...i,
              quantity: i.quantity + finalItem.quantity
            }
          : i
      );
    }

    return [...prev, finalItem];
  });
};

  // ✅ REMOVE
  const removeFromCart = (  medicineId, pharmacyId) => {
    setCartItems(prev =>
      prev.filter(
        item =>
          !(item.medicineId === medicineId && item.pharmacyId === pharmacyId)
      )
    );
  };

  const updateQuantity = (
  medicineId,
  pharmacyId,
  newQuantity
) => {

  if (newQuantity < 1) {

    removeFromCart(
      medicineId,
      pharmacyId
    );

    return;
  }

  setCartItems((prev) =>

    prev.map((item) => {

      if (
        item.medicineId === medicineId &&
        item.pharmacyId === pharmacyId
      ) {

        return {

          ...item,

          quantity: Number(newQuantity),

          // KEEP SAME PRICE
          pharmacyPrice:
            Number(
              item.pharmacyPrice ||
              item.price ||
              0
            ),

          price:
            Number(
              item.pharmacyPrice ||
              item.price ||
              0
            )
        };
      }

      return item;
    })
  );
};

  // ✅ CLEAR CART
  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

const getCartTotal = () => {

  return cartItems.reduce(
    (total, item) => {

      const itemPrice =
        Number(
          item.pharmacyPrice ||
          item.price ||
          0
        );

      const quantity =
        Number(item.quantity || 1);

      return (
        total +
        Number(item.price || 0) * quantity
      );

    },
    0
  );
};

  const getItemsByPharmacy = () => {
    return cartItems.reduce((groups, item) => {
      const key = item.pharmacyId || 'unknown';

      if (!groups[key]) {
        groups[key] = {
          pharmacyName: item.pharmacyName || 'Pharmacy',
          items: []
        };
      }

      groups[key].items.push(item);

      return groups;
    }, {});
  };

  // ✅ TOTAL ITEMS
  const getTotalItems = () => {
    return cartItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0),
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems: Array.isArray(cartItems) ? cartItems : [],
        setCartItems,

        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,

        getCartTotal,
        getItemsByPharmacy,
        getTotalItems,
        getItemCount: getTotalItems
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;