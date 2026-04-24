import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { orderAPI, paymentAPI } from '../services/api';

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const deliveryAddress = location.state?.deliveryAddress;
  
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  const [loading, setLoading] = useState(false);

  // Group items by pharmacy for separate orders
  const groupedItems = cartItems.reduce((acc, item) => {
    const pharmacyId = item.pharmacyId;
    if (!acc[pharmacyId]) {
      acc[pharmacyId] = {
        pharmacyName: item.pharmacyName,
        pharmacyId,
        items: [],
        total: 0,
      };
    }
    acc[pharmacyId].items.push(item);
    acc[pharmacyId].total += item.price * item.quantity;
    return acc;
  }, {});

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPayment = async (order, razorpayOrderId) => {
    const res = await loadRazorpayScript();
    
    if (!res) {
      showNotification('Razorpay SDK failed to load', 'error');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.totalAmount * 100,
      currency: 'INR',
      name: 'MedFinder',
      description: `Order #${order._id}`,
      order_id: razorpayOrderId,
      handler: async (response) => {
        try {
          await paymentAPI.verifyPayment({
            orderId: order._id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
          });
          
          showNotification('Payment successful!', 'success');
          clearCart();
          navigate('/orders', { state: { success: true } });
        } catch (error) {
          showNotification('Payment verification failed', 'error');
        }
      },
      prefill: {
        name: deliveryAddress?.name || '',
        email: deliveryAddress?.email || '',
        contact: deliveryAddress?.phone || '',
      },
      theme: {
        color: '#0ea5e9',
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handlePlaceOrder = async () => {
    if (!deliveryAddress) {
      showNotification('Please provide delivery address', 'error');
      navigate('/cart');
      return;
    }

    setLoading(true);

    try {
      // Create orders for each pharmacy
      const orderPromises = Object.values(groupedItems).map(async (group) => {
        const orderData = {
          pharmacy: group.pharmacyId,
          items: group.items.map((item) => ({
            medicine: item.medicineId,
            quantity: item.quantity,
            price: item.price,
          })),
          deliveryAddress,
          paymentMethod,
        };

        const response = await orderAPI.createOrder(orderData);
        return response.data;
      });

      const orders = await Promise.all(orderPromises);

      if (paymentMethod === 'razorpay') {
        // For simplicity, process first order with Razorpay
        const firstOrder = orders[0];
        const paymentResponse = await paymentAPI.createRazorpayOrder(firstOrder.order._id);
        await handleRazorpayPayment(firstOrder.order, paymentResponse.data.razorpayOrderId);
      } else {
        // COD - orders are already created
        showNotification('Orders placed successfully!', 'success');
        clearCart();
        navigate('/orders', { state: { success: true } });
      }
    } catch (error) {
      showNotification(error.response?.data?.message || 'Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-content">
        <div className="checkout-main">
          <section className="checkout-section">
            <h2>Delivery Address</h2>
            <div className="address-card">
              <p>{deliveryAddress?.street}</p>
              <p>{deliveryAddress?.city}, {deliveryAddress?.state}</p>
              <p>PIN: {deliveryAddress?.pincode}</p>
            </div>
          </section>

          <section className="checkout-section">
            <h2>Payment Method</h2>
            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === 'razorpay' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <span className="option-title">Pay Online</span>
                  <span className="option-desc">Credit/Debit Card, UPI, Net Banking</span>
                </div>
              </label>
              <label className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === 'cod'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <span className="option-title">Cash on Delivery</span>
                  <span className="option-desc">Pay when you receive your order</span>
                </div>
              </label>
            </div>
          </section>

          <section className="checkout-section">
            <h2>Order Items</h2>
            {Object.entries(groupedItems).map(([pharmacyId, group]) => (
              <div key={pharmacyId} className="order-group">
                <h3 className="pharmacy-name">{group.pharmacyName}</h3>
                {group.items.map((item) => (
                  <div key={`${item.medicineId}-${item.pharmacyId}`} className="checkout-item">
                    <img src={item.image || '/medicine-placeholder.png'} alt={item.name} />
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p>Qty: {item.quantity}</p>
                    </div>
                    <p className="item-price">Rs. {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
                <div className="group-total">
                  <span>Subtotal:</span>
                  <span>Rs. {group.total.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="checkout-sidebar">
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Items Total</span>
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
            <button
              onClick={handlePlaceOrder}
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? 'Processing...' : paymentMethod === 'razorpay' ? 'Pay Now' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
