import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  useEffect(() => {
    if (user?.address) {
      setDeliveryAddress(user.address);
    }
  }, [user]);

  const handleQuantityChange = (itemId, pharmacyId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId, pharmacyId);
    } else {
      updateQuantity(itemId, pharmacyId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      showNotification('Please login to proceed with checkout', 'warning');
      navigate('/login', { state: { from: { pathname: '/cart' } } });
      return;
    }

    if (!deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
      showNotification('Please fill in the delivery address', 'error');
      return;
    }

    navigate('/checkout', { state: { deliveryAddress } });
  };

  // Group items by pharmacy
  const groupedItems = cartItems.reduce((acc, item) => {
    const pharmacyId = item.pharmacyId;
    if (!acc[pharmacyId]) {
      acc[pharmacyId] = {
        pharmacyName: item.pharmacyName,
        items: [],
      };
    }
    acc[pharmacyId].items.push(item);
    return acc;
  }, {});

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <h2>Your cart is empty</h2>
        <p>Looks like you haven&apos;t added any medicines yet.</p>
        <Link to="/search" className="btn btn-primary">
          Search Medicines
        </Link>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <button onClick={clearCart} className="btn btn-outline btn-sm">
          Clear Cart
        </button>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {Object.entries(groupedItems).map(([pharmacyId, { pharmacyName, items }]) => (
            <div key={pharmacyId} className="pharmacy-group">
              <div className="pharmacy-header">
                <h3>{pharmacyName}</h3>
              </div>
              {items.map((item) => (
                <div key={`${item.medicineId}-${item.pharmacyId}`} className="cart-item">
                  <div className="item-image">
                    <img src={item.image || '/medicine-placeholder.png'} alt={item.name} />
                  </div>
                  <div className="item-details">
                    <h4>{item.name}</h4>
                    <p className="item-manufacturer">{item.manufacturer}</p>
                    <p className="item-price">Rs. {item.price.toFixed(2)}</p>
                  </div>
                  <div className="item-quantity">
                    <button
                      onClick={() => handleQuantityChange(item.medicineId, item.pharmacyId, item.quantity - 1)}
                      className="qty-btn"
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.medicineId, item.pharmacyId, item.quantity + 1)}
                      className="qty-btn"
                    >
                      +
                    </button>
                  </div>
                  <div className="item-total">
                    <p>Rs. {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.medicineId, item.pharmacyId)}
                    className="remove-btn"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="cart-summary">
          <div className="delivery-address">
            <h3>Delivery Address</h3>
            <div className="form-group">
              <input
                type="text"
                placeholder="Street Address"
                value={deliveryAddress.street}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="City"
                  value={deliveryAddress.city}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="State"
                  value={deliveryAddress.state}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="PIN Code"
                value={deliveryAddress.pincode}
                onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
              />
            </div>
          </div>

          <div className="summary-card">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Subtotal ({cartItems.length} items)</span>
              <span>Rs. {getCartTotal().toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>Rs. 40.00</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>Rs. {(getCartTotal() + 40).toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} className="btn btn-primary btn-block">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
