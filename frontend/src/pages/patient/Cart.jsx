import React, { useState } from 'react';
import {
  Link,
  useNavigate
} from 'react-router-dom';

import { useCart } from '../../context/CartContext';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

import '../../styles/cartcss.css';

export default function Cart() {

  const navigate = useNavigate();

  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    getCartTotal
    } = useCart();
  const { success, error } = useNotification();
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const groupedItems = cartItems.reduce(
    (groups, item) => {

      if (!groups[item.pharmacyId]) {

        groups[item.pharmacyId] = {
          pharmacyName:
            item.pharmacyName,
          items: []
        };
      }

      groups[item.pharmacyId]
        .items
        .push(item);

      return groups;

    },
    {}
  );

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const placeOrder = async (orderData) => {

    try {

      const res = await api.post('/orders', orderData);
      return res.data;

    } catch (err) {

      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Failed to place order';
      error(msg);
      throw err;
    }
  };

  const handleCheckout = async () => {

    const existingOrders =
      JSON.parse(
        localStorage.getItem('orders')
      ) || [];
      // Create per-pharmacy orders
      const ordersToPlace = Object.entries(groupedItems).map(
        ([pharmacyId, pharmacy]) => ({
          pharmacyId,
          items: pharmacy.items.map(item => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            price: item.price || 0
          })),
          total: pharmacy.items.reduce((s, it) => s + ((it.price || 0) * it.quantity), 0),
          deliveryType,
          paymentMethod
        })
      );

      // Razorpay
      // helper to place orders and finalize locally
      const finalizeOrders = async (
  orders,
  paymentStatus,
  razorpayPaymentId
) => {

  try {

    for (const od of orders) {

      const payload = {

        pharmacyId: od.pharmacyId,

        items: od.items.map(item => ({

        medicineId:
          item.medicineId ||
          item.medicine,

        quantity: item.quantity,

        price: Math.round(item.price)

      })),

        deliveryType,

        paymentMethod,

        paymentStatus,

        razorpayPaymentId
      };

      await api.post('/orders', payload);
    }

    success('Order placed successfully');

    clearCart();

    navigate('/patient/my-orders');

  } catch (err) {

    console.error(err);

    error(
      err.response?.data?.message ||
      'Failed to place order'
    );
  }
};

      if (paymentMethod === 'razorpay') {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          error('Razorpay SDK failed to load');
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY,
          amount: Math.round(getCartTotal() * 100),
          currency: 'INR',
          name: 'Medicine Tracker',
          description: 'Medicine Order Payment',
          handler: async function(response) {
            try {
              await finalizeOrders(ordersToPlace, 'paid', response.razorpay_payment_id);
            } catch (err) {
              // error already shown in placeOrder
            }
          }
        };

        const razor = new window.Razorpay(options);
        razor.open();
        return;
      }

      // COD: place orders per pharmacy
      try {
        await finalizeOrders(ordersToPlace, 'pending');
      } catch (err) {
        // Errors handled in placeOrder
      }
  };

  if (!cartItems.length) {

    return (
      <div className="cart-page">

        <div className="empty-cart">

          <h2>
            Your cart is empty
          </h2>

          <Link
            to="/search"
            className="checkout-btn"
          >
            Search Medicines
          </Link>

        </div>

      </div>
    );
  }

  return (

    <div className="cart-page">

      <div className="cart-header">

        <h1>Shopping Cart</h1>

        <button
          className="clear-cart-btn"
          onClick={clearCart}
        >
          Clear Cart
        </button>

      </div>

      <div className="cart-layout">

        <div className="cart-items">

          {Object.entries(groupedItems)
            .map(
              ([pharmacyId, pharmacy]) => (

              <div
                key={pharmacyId}
                className="pharmacy-section"
              >

                <div className="pharmacy-header">

                  <h2>
                    {pharmacy.pharmacyName}
                  </h2>

                  <span>
                    {pharmacy.items.length}
                    {' '}items
                  </span>

                </div>

                {pharmacy.items.map(
                  (item) => (

                  <div
                    key={item._id}
                    className="cart-card"
                  >

                    <div className="cart-info">

                      <h3>
                        {item.name}
                      </h3>

                      <p className="price">
                        ₹{Number(item.price || 0).toFixed(2)}
                      </p>

                    </div>

                    <div className="qty-wrapper">

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() =>
                          updateQuantity(
                            item.medicineId,
                            item.pharmacyId,
                            item.quantity - 1
                          )
                        }
                      >
                        -
                      </button>

                      <span className="qty-count">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        className="qty-btn"
                        onClick={() =>
                          updateQuantity(
                            item.medicineId,
                            item.pharmacyId,
                            item.quantity + 1
                          )
                        }
                      >
                        +
                      </button>

                    </div>

                    <button
                      className="remove-btn"
                      onClick={() =>
                        removeFromCart(
                          item.medicineId,
                          item.pharmacyId
                        )
                      }
                    >
                      Remove
                    </button>

                  </div>
                ))}

              </div>
            ))}

        </div>

        <div className="summary-card">

          <h2>Order Summary</h2>

          <div className="summary-row">
            <span>Total Items</span>
            <span>
              {cartItems.length}
            </span>
          </div>

          <div className="summary-row total-row">
            <span>Total</span>
            <span>
              ₹{Math.round(getCartTotal())}
            </span>
          </div>
          <div className="checkout-options">

          <h3>Delivery Type</h3>

          <select
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
          >
            <option value="pickup">Pickup</option>
            <option value="delivery">Home Delivery</option>
          </select>

          <h3>Payment Method</h3>

          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="cod">Cash on Delivery</option>
            <option value="razorpay">Razorpay</option>
          </select>

          <div>
            <span className="delivery-badge">
              {deliveryType}
            </span>

            <span className="payment-badge">
              {paymentMethod}
            </span>
          </div>

        </div>

          <button
            className="checkout-btn"
            onClick={handleCheckout}
          >
            Checkout
          </button>

        </div>

      </div>

    </div>
  );
}