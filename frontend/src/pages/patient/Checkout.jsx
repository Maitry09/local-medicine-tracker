import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pharmacyId = searchParams.get('pharmacy');
  const { user } = useAuth();
  const { getItemsByPharmacy, clearPharmacyCart } = useCart();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [newAddress, setNewAddress] = useState({
    type: 'home',
    street: '',
    city: '',
    state: '',
    pincode: '',
    landmark: ''
  });
  const [useNewAddress, setUseNewAddress] = useState(false);

  const itemsByPharmacy = getItemsByPharmacy();
  const pharmacyItems = pharmacyId ? itemsByPharmacy[pharmacyId] : [];
  const pharmacyInfo = pharmacyItems?.[0]?.pharmacy;

  useEffect(() => {
    if (!pharmacyId || !pharmacyItems?.length) {
      navigate('/patient/cart');
    }
    if (user?.addresses?.length > 0) {
      setSelectedAddress(user.addresses[0]);
    } else {
      setUseNewAddress(true);
    }
  }, [pharmacyId, pharmacyItems, navigate, user]);

  const subtotal = pharmacyItems?.reduce(
    (sum, item) => sum + (item.price * item.quantity), 0
  ) || 0;
  const deliveryFee = deliveryType === 'delivery' ? (subtotal > 500 ? 0 : 40) : 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    const address = useNewAddress ? newAddress : selectedAddress;
    
    if (deliveryType === 'delivery' && (!address?.street || !address?.city || !address?.pincode)) {
      alert('Please provide a complete delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        pharmacy: pharmacyId,
        items: pharmacyItems.map(item => ({
          medicine: item.medicine._id,
          quantity: item.quantity,
          price: item.price
        })),
        deliveryType,
        paymentMethod,
        deliveryAddress: deliveryType === 'delivery' ? address : null
      };

      if (paymentMethod === 'online') {
        const { data: orderResponse } = await api.post('/orders', orderData);
        const orderId = orderResponse.data.order._id;

        const { data: paymentData } = await api.post('/payments/create-order', {
          orderId,
          amount: total
        });

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: paymentData.data.amount,
          currency: 'INR',
          name: 'MediFind',
          description: `Order from ${pharmacyInfo?.name}`,
          order_id: paymentData.data.razorpayOrderId,
          handler: async (response) => {
            try {
              await api.post('/payments/verify', {
                orderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              });
              clearPharmacyCart(pharmacyId);
              navigate(`/patient/orders/${orderId}`);
            } catch (error) {
              alert('Payment verification failed. Please contact support.');
            }
          },
          prefill: {
            name: user?.name,
            email: user?.email,
            contact: user?.phone
          },
          theme: {
            color: '#10B981'
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        const { data } = await api.post('/orders', orderData);
        clearPharmacyCart(pharmacyId);
        navigate(`/patient/orders/${data.data.order._id}`);
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!pharmacyItems?.length) {
    return null;
  }

  return (
    <div className="checkout-page">
      <div className="page-header">
        <h1>Checkout</h1>
        <p>Complete your order from {pharmacyInfo?.name}</p>
      </div>

      <div className="checkout-content">
        <div className="checkout-main">
          <div className="checkout-steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>
              <span className="step-number">1</span>
              <span className="step-label">Delivery</span>
            </div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Payment</span>
            </div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Review</span>
            </div>
          </div>

          {step === 1 && (
            <div className="checkout-section">
              <h2>Delivery Options</h2>
              <div className="delivery-options">
                <label className={`option-card ${deliveryType === 'delivery' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="delivery"
                    checked={deliveryType === 'delivery'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <div className="option-content">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                    <span>Home Delivery</span>
                    <small>{subtotal > 500 ? 'Free' : '₹40'}</small>
                  </div>
                </label>
                <label className={`option-card ${deliveryType === 'pickup' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="deliveryType"
                    value="pickup"
                    checked={deliveryType === 'pickup'}
                    onChange={(e) => setDeliveryType(e.target.value)}
                  />
                  <div className="option-content">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                    </svg>
                    <span>Store Pickup</span>
                    <small>Free</small>
                  </div>
                </label>
              </div>

              {deliveryType === 'delivery' && (
                <div className="address-section">
                  <h3>Delivery Address</h3>
                  
                  {user?.addresses?.length > 0 && !useNewAddress && (
                    <div className="saved-addresses">
                      {user.addresses.map((addr, idx) => (
                        <label 
                          key={idx} 
                          className={`address-card ${selectedAddress === addr ? 'selected' : ''}`}
                        >
                          <input
                            type="radio"
                            name="address"
                            checked={selectedAddress === addr}
                            onChange={() => setSelectedAddress(addr)}
                          />
                          <div className="address-content">
                            <span className="address-type">{addr.type}</span>
                            <p>{addr.street}</p>
                            <p>{addr.city}, {addr.state} {addr.pincode}</p>
                          </div>
                        </label>
                      ))}
                      <button 
                        className="btn btn-outline"
                        onClick={() => setUseNewAddress(true)}
                      >
                        + Add New Address
                      </button>
                    </div>
                  )}

                  {useNewAddress && (
                    <div className="new-address-form">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Address Type</label>
                          <select
                            value={newAddress.type}
                            onChange={(e) => setNewAddress({...newAddress, type: e.target.value})}
                          >
                            <option value="home">Home</option>
                            <option value="work">Work</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Street Address *</label>
                        <input
                          type="text"
                          value={newAddress.street}
                          onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                          placeholder="Enter street address"
                        />
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>City *</label>
                          <input
                            type="text"
                            value={newAddress.city}
                            onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                            placeholder="City"
                          />
                        </div>
                        <div className="form-group">
                          <label>State *</label>
                          <input
                            type="text"
                            value={newAddress.state}
                            onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                            placeholder="State"
                          />
                        </div>
                        <div className="form-group">
                          <label>Pincode *</label>
                          <input
                            type="text"
                            value={newAddress.pincode}
                            onChange={(e) => setNewAddress({...newAddress, pincode: e.target.value})}
                            placeholder="Pincode"
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Landmark (Optional)</label>
                        <input
                          type="text"
                          value={newAddress.landmark}
                          onChange={(e) => setNewAddress({...newAddress, landmark: e.target.value})}
                          placeholder="Near landmark"
                        />
                      </div>
                      {user?.addresses?.length > 0 && (
                        <button 
                          className="btn btn-outline"
                          onClick={() => setUseNewAddress(false)}
                        >
                          Use Saved Address
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="step-actions">
                <button className="btn btn-primary" onClick={() => setStep(2)}>
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="checkout-section">
              <h2>Payment Method</h2>
              <div className="payment-options">
                <label className={`option-card ${paymentMethod === 'online' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="online"
                    checked={paymentMethod === 'online'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <div className="option-content">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <span>Pay Online</span>
                    <small>UPI, Cards, Net Banking</small>
                  </div>
                </label>
                {deliveryType === 'delivery' && (
                  <label className={`option-card ${paymentMethod === 'cod' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    />
                    <div className="option-content">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                      </svg>
                      <span>Cash on Delivery</span>
                      <small>Pay when delivered</small>
                    </div>
                  </label>
                )}
              </div>

              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-primary" onClick={() => setStep(3)}>
                  Review Order
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="checkout-section">
              <h2>Review Order</h2>
              
              <div className="review-section">
                <h3>Items</h3>
                <div className="review-items">
                  {pharmacyItems.map(item => (
                    <div key={item.medicine._id} className="review-item">
                      <span className="item-name">{item.medicine.name}</span>
                      <span className="item-qty">x{item.quantity}</span>
                      <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <h3>Delivery</h3>
                <p>
                  {deliveryType === 'delivery' 
                    ? `Home Delivery to ${(useNewAddress ? newAddress : selectedAddress)?.street}, ${(useNewAddress ? newAddress : selectedAddress)?.city}`
                    : `Store Pickup at ${pharmacyInfo?.name}`
                  }
                </p>
              </div>

              <div className="review-section">
                <h3>Payment</h3>
                <p>{paymentMethod === 'online' ? 'Pay Online (Razorpay)' : 'Cash on Delivery'}</p>
              </div>

              <div className="step-actions">
                <button className="btn btn-outline" onClick={() => setStep(2)}>
                  Back
                </button>
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : `Place Order - ₹${total.toFixed(2)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-sidebar">
          <div className="order-summary-card">
            <h3>Order Summary</h3>
            <div className="pharmacy-name">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
              </svg>
              {pharmacyInfo?.name}
            </div>

            <div className="items-preview">
              {pharmacyItems.slice(0, 3).map(item => (
                <div key={item.medicine._id} className="preview-item">
                  <span>{item.medicine.name} x{item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {pharmacyItems.length > 3 && (
                <p className="more-items">+{pharmacyItems.length - 3} more items</p>
              )}
            </div>

            <div className="summary-totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery Fee</span>
                <span>{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'Free'}</span>
              </div>
              <div className="summary-row total">
                <span>Total</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
