import React, { useState, useEffect } from 'react';
import {
  Link,
  useNavigate
} from 'react-router-dom';

import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { pharmacyAPI } from '../../services/api';
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
  const { user } = useAuth();
  const [deliveryType, setDeliveryType] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pharmacySettings, setPharmacySettings] = useState({});
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    pincode: user?.address?.pincode || ''
  });

  useEffect(() => {
    if (user?.address) {
      setDeliveryAddress({
        street: user.address.street || '',
        city: user.address.city || '',
        state: user.address.state || '',
        pincode: user.address.pincode || ''
      });
    }
  }, [user]);

  // Fetch pharmacy settings for discounts and delivery fees
  useEffect(() => {
    const fetchPharmacySettings = async () => {
      const settings = {};
      const uniquePharmacies = [...new Set(cartItems.map(item => item.pharmacyId))];
      
      for (const pharmacyId of uniquePharmacies) {
        try {
          const res = await pharmacyAPI.getById(pharmacyId);
          const pharmacy = res.data?.data?.pharmacy || res.data?.pharmacy;
          if (pharmacy) {
            settings[pharmacyId] = {
              discount: pharmacy.defaultDiscount || 0,
              deliveryFee: pharmacy.defaultDeliveryFee || 0
            };
          }
        } catch (err) {
          console.error(`Failed to fetch pharmacy ${pharmacyId}:`, err);
          settings[pharmacyId] = { discount: 0, deliveryFee: 0 };
        }
      }
      setPharmacySettings(settings);
    };

    if (cartItems.length > 0) {
      fetchPharmacySettings();
    }
  }, [cartItems]);

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

  const calculatePharmacyTotal = (pharmacyId, items) => {
    const subtotal = items.reduce((s, it) => s + ((it.price || 0) * it.quantity), 0);
    const discount = pharmacySettings[pharmacyId]?.discount || 0;
    const deliveryFee = deliveryType === 'delivery' ? (pharmacySettings[pharmacyId]?.deliveryFee || 0) : 0;
    const discountAmount = (subtotal * discount) / 100;
    return subtotal - discountAmount + deliveryFee;
  };

  const getCartTotalWithFees = () => {
    let total = 0;
    Object.entries(groupedItems).forEach(([pharmacyId, pharmacy]) => {
      total += calculatePharmacyTotal(pharmacyId, pharmacy.items);
    });
    return total;
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Razorpay SDK');
        resolve(false);
      };
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
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

    if (deliveryType === 'delivery') {
      if (
        !deliveryAddress.street.trim() ||
        !deliveryAddress.city.trim() ||
        !deliveryAddress.state.trim() ||
        !deliveryAddress.pincode.trim()
      ) {
        error('Delivery address and pincode are required for home delivery');
        return;
      }
    }

    const existingOrders =
      JSON.parse(
        localStorage.getItem('orders')
      ) || [];
      // Create per-pharmacy orders
      const ordersToPlace = Object.entries(groupedItems).map(
        ([pharmacyId, pharmacy]) => {
          const subtotal = pharmacy.items.reduce((s, it) => s + ((it.price || 0) * it.quantity), 0);
          const discountPercent = pharmacySettings[pharmacyId]?.discount || 0;
          const discountAmount = (subtotal * discountPercent) / 100;
          const deliveryFee = deliveryType === 'delivery' ? (pharmacySettings[pharmacyId]?.deliveryFee || 0) : 0;
          const total = subtotal - discountAmount + deliveryFee;

          return {
            pharmacyId,
            items: pharmacy.items.map(item => ({
              medicineId: item.medicineId,
              quantity: item.quantity,
              price: item.price || 0
            })),
            subtotal,
            discount: discountAmount,
            discountPercent,
            deliveryFee: deliveryType === 'delivery' ? deliveryFee : 0,
            total,
            deliveryType,
            paymentMethod,
            deliveryAddress: deliveryType === 'delivery' ? deliveryAddress : undefined
          };
        }
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
          medicineId: item.medicineId || item.medicine,
          quantity: item.quantity,
          price: Math.round(item.price)
        })),
        deliveryType,
        paymentMethod,
        deliveryAddress: od.deliveryAddress || null,
        paymentStatus,
        razorpayPaymentId,
        discount: od.discount || 0,
        deliveryCharge: od.deliveryFee || 0
      };

      await api.post('/orders', payload);
    }

    success('Order placed successfully');

    clearCart();

    navigate('/orders');

  } catch (err) {

    console.error(err);

    error(
      err.response?.data?.message ||
      'Failed to place order'
    );
  }
};

      if (paymentMethod === 'razorpay') {
        const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
        if (!razorpayKey) {
          error('Payment configuration error: Razorpay key not found');
          return;
        }

        const loaded = await loadRazorpayScript();
        if (!loaded) {
          error('Razorpay SDK failed to load');
          return;
        }

        const options = {
          key: razorpayKey,
          amount: Math.round(getCartTotalWithFees() * 100),
          currency: 'INR',
          name: 'Medicine Tracker',
          description: 'Medicine Order Payment',
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.phone || ''
          },
          handler: async function(response) {
            try {
              await finalizeOrders(ordersToPlace, 'paid', response.razorpay_payment_id);
            } catch (err) {
              // error already shown in placeOrder
            }
          },
          modal: {
            ondismiss: () => {
              error('Payment cancelled');
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

          <div className="summary-row">
            <span>Subtotal</span>
            <span>
              ₹{Math.round(getCartTotal())}
            </span>
          </div>

          {Object.entries(groupedItems).map(([pharmacyId, pharmacy]) => {
            const settings = pharmacySettings[pharmacyId];
            if (!settings) return null;
            
            const subtotal = pharmacy.items.reduce((s, it) => s + ((it.price || 0) * it.quantity), 0);
            const discountAmount = (subtotal * (settings.discount || 0)) / 100;
            const deliveryFee = deliveryType === 'delivery' ? (settings.deliveryFee || 0) : 0;

            return (
              <div key={pharmacyId}>
                {discountAmount > 0 && (
                  <div className="summary-row discount-row">
                    <span>Discount ({settings.discount}%)</span>
                    <span>-₹{Math.round(discountAmount)}</span>
                  </div>
                )}
                {deliveryFee > 0 && deliveryType === 'delivery' && (
                  <div className="summary-row fee-row">
                    <span>Delivery Fee</span>
                    <span>+₹{Math.round(deliveryFee)}</span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="summary-row total-row">
            <span>Total</span>
            <span>
              ₹{Math.round(getCartTotalWithFees())}
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

          {deliveryType === 'delivery' && (
            <div className="address-fields">
              <h3>Delivery Address</h3>
              <div className="form-group">
                <label>Street Address *</label>
                <input
                  type="text"
                  placeholder="Enter street address"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                  required
                  className="form-control"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    placeholder="Enter city"
                    value={deliveryAddress.city}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                    required
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    placeholder="Enter state"
                    value={deliveryAddress.state}
                    onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                    required
                    className="form-control"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Pincode *</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit pincode"
                  value={deliveryAddress.pincode}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, pincode: e.target.value })}
                  required
                  className="form-control"
                  pattern="\d{6}"
                />
              </div>
            </div>
          )}

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