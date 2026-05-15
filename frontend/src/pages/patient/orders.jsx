export default function Orders() {

  const orders =
    JSON.parse(localStorage.getItem('orders')) || [];

  return (
    <div style={{ padding: '24px' }}>

      <h1>My Orders</h1>

      {orders.length === 0 ? (
        <p>No orders found</p>
      ) : (

        orders.map((order) => (

          <div
            key={order.id}
            style={{
              background: 'white',
              padding: '20px',
              marginBottom: '20px',
              borderRadius: '12px'
            }}
          >

            <h3>
              Order #{order.id}
            </h3>

            {order.items.map((item) => (
              <div
                key={item._id}
                style={{ marginTop: '10px' }}
              >
                {item.name} × {item.quantity}
                = ₹{item.price * item.quantity}
              </div>
            ))}

            <h2>
              Total: ₹{order.total}
            </h2>

          </div>
        ))
      )}

    </div>
  );
}