import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export default function Cart() {
  const navigate = useNavigate();
  const { 
    cartItems, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    getCartTotal,
    getItemsByPharmacy 
  } = useCart();
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);

  const itemsByPharmacy = getItemsByPharmacy();
  const pharmacyIds = Object.keys(itemsByPharmacy);

  const handleQuantityChange = (itemId, pharmacyId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId, pharmacyId);
    } else {
      updateQuantity(itemId, pharmacyId, newQuantity);
    }
  };

  const handleCheckout = (pharmacyId) => {
    setSelectedPharmacy(pharmacyId);
    navigate(`/patient/checkout?pharmacy=${pharmacyId}`);
  };

  if (cartItems.length === 0) {
    return (
      <div className="cart-page">
        <div className="page-header">
          <h1>Shopping Cart</h1>
        </div>
        <div className="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="empty-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121 0 2.09-.77 2.348-1.863l1.784-7.5H5.25l-.384 1.44M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <h3>Your cart is empty</h3>
          <p>Add medicines from pharmacies to get started</p>
          <Link to="/search" className="btn btn-primary">Search Medicines</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="page-header">
        <h1>Shopping Cart</h1>
        <p>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in cart</p>
      </div>

      <div className="cart-content">
        <div className="cart-items">
          {pharmacyIds.map(pharmacyId => {
            const pharmacyItems = itemsByPharmacy[pharmacyId];
            const pharmacyInfo = pharmacyItems[0]?.pharmacy;
            const pharmacyTotal = pharmacyItems.reduce(
              (sum, item) => sum + (item.price * item.quantity), 0
            );

            return (
              <div key={pharmacyId} className="pharmacy-cart-group">
                <div className="pharmacy-header">
                  <div className="pharmacy-info">
                    <h3>{pharmacyInfo?.name || 'Pharmacy'}</h3>
                    <p>{pharmacyInfo?.address?.street}, {pharmacyInfo?.address?.city}</p>
                  </div>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      pharmacyItems.forEach(item => removeFromCart(item.medicine._id, pharmacyId));
                    }}
                  >
                    Clear
                  </button>
                </div>

                <div className="items-list">
                  {pharmacyItems.map(item => (
                    <div key={`${item.medicine._id}-${pharmacyId}`} className="cart-item">
                      <div className="item-image">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                        </svg>
                      </div>
                      <div className="item-details">
                        <h4>{item.medicine.name}</h4>
                        <p className="item-meta">
                          {item.medicine.manufacturer} | {item.medicine.dosageForm}
                        </p>
                        <p className="item-price">₹{item.price.toFixed(2)} each</p>
                      </div>
                      <div className="quantity-controls">
                        <button 
                          className="qty-btn"
                          onClick={() => handleQuantityChange(item.medicine._id, pharmacyId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="quantity">{item.quantity}</span>
                        <button 
                          className="qty-btn"
                          onClick={() => handleQuantityChange(item.medicine._id, pharmacyId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxQuantity}
                        >
                          +
                        </button>
                      </div>
                      <div className="item-total">
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        <button 
                          className="remove-btn"
                          onClick={() => removeFromCart(item.medicine._id, pharmacyId)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pharmacy-footer">
                  <div className="pharmacy-subtotal">
                    <span>Subtotal ({pharmacyItems.length} items)</span>
                    <span className="amount">₹{pharmacyTotal.toFixed(2)}</span>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleCheckout(pharmacyId)}
                  >
                    Checkout from {pharmacyInfo?.name || 'this pharmacy'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="cart-summary">
          <div className="summary-card">
            <h3>Cart Summary</h3>
            <div className="summary-details">
              <div className="summary-row">
                <span>Total Items</span>
                <span>{cartItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="summary-row">
                <span>From Pharmacies</span>
                <span>{pharmacyIds.length}</span>
              </div>
              <div className="summary-row total">
                <span>Grand Total</span>
                <span>₹{getCartTotal().toFixed(2)}</span>
              </div>
            </div>
            <p className="summary-note">
              Note: You need to checkout separately from each pharmacy.
            </p>
            <button 
              className="btn btn-outline btn-full"
              onClick={clearCart}
            >
              Clear Entire Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
