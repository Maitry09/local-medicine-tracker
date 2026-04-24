# MedFinder - Local Medicine Availability Tracker

A full-stack MERN application to find nearby pharmacies with specific medicines in stock in real-time.

## Features

### Customer Features
- Search medicines by name, generic name, or manufacturer
- Find nearby pharmacies with the medicine in stock
- View pharmacy details, operating hours, and distance
- Add medicines to cart from multiple pharmacies
- Place orders with Cash on Delivery or Online Payment (Razorpay)
- Track order status in real-time
- Set alerts for medicine availability

### Pharmacy Owner Features
- Register and manage pharmacy profile
- Manage medicine inventory (add, update, delete stock)
- View and process incoming orders
- Update order status (pending -> confirmed -> processing -> shipped -> delivered)
- View sales analytics

### Admin Features
- Dashboard with system-wide statistics
- Manage users (activate/deactivate/delete)
- Verify and manage pharmacies
- Add/edit/delete medicines in the master database
- View all orders and analytics

## Tech Stack

### Backend
- **Node.js** with **Express.js** - Server framework
- **MongoDB** with **Mongoose** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Razorpay** - Payment gateway
- **express-validator** - Input validation

### Frontend
- **React 18** with **Vite** - Build tool
- **React Router v6** - Routing
- **Axios** - HTTP client
- **Context API** - State management
- **CSS3** - Styling (no external UI library)

## Project Structure

```
medfinder/
├── backend/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   ├── auth.controller.js   # Authentication logic
│   │   ├── user.controller.js   # User management
│   │   ├── medicine.controller.js
│   │   ├── pharmacy.controller.js
│   │   ├── stock.controller.js
│   │   ├── order.controller.js
│   │   ├── payment.controller.js
│   │   ├── alert.controller.js
│   │   └── admin.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT & role-based auth
│   │   └── validation.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Medicine.js
│   │   ├── Pharmacy.js
│   │   ├── Stock.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   └── Alert.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   ├── medicine.routes.js
│   │   ├── pharmacy.routes.js
│   │   ├── stock.routes.js
│   │   ├── order.routes.js
│   │   ├── payment.routes.js
│   │   ├── alert.routes.js
│   │   └── admin.routes.js
│   ├── utils/
│   │   ├── jwt.js
│   │   └── errorHandler.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── CartContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── layouts/
│   │   │   ├── MainLayout.jsx
│   │   │   ├── AuthLayout.jsx
│   │   │   └── DashboardLayout.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── SearchMedicines.jsx
│   │   │   ├── MedicineDetails.jsx
│   │   │   ├── PharmacyList.jsx
│   │   │   ├── PharmacyDetails.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Orders.jsx
│   │   │   ├── OrderDetails.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── pharmacy/
│   │   │   │   ├── PharmacyDashboard.jsx
│   │   │   │   ├── PharmacyStock.jsx
│   │   │   │   ├── PharmacyOrders.jsx
│   │   │   │   └── PharmacyProfile.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminUsers.jsx
│   │   │       ├── AdminPharmacies.jsx
│   │   │       ├── AdminMedicines.jsx
│   │   │       └── AdminOrders.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios configuration & API calls
│   │   ├── styles/
│   │   │   └── index.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── package.json                  # Root package.json with workspaces
└── README.md
```

## Installation

### Prerequisites
- Node.js 18+ 
- MongoDB (local or Atlas)
- Razorpay account (for payments)

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd medfinder
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Configure Backend Environment**
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/medfinder
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

FRONTEND_URL=http://localhost:5173
```

4. **Configure Frontend Environment**
```bash
cd ../frontend
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

5. **Start Development Servers**
```bash
# From root directory
npm run dev
```

This starts both backend (port 5000) and frontend (port 5173) concurrently.

Or run separately:
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/refresh-token` | Refresh access token |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password/:token` | Reset password |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | Get all medicines (with search & filters) |
| GET | `/api/medicines/:id` | Get medicine details |
| GET | `/api/medicines/:id/availability` | Get nearby pharmacies with stock |

### Pharmacies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pharmacies` | Get all pharmacies |
| GET | `/api/pharmacies/nearby` | Get nearby pharmacies |
| GET | `/api/pharmacies/:id` | Get pharmacy details |
| GET | `/api/pharmacies/:id/stock` | Get pharmacy's stock |

### Stock (Pharmacy Owner)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stock` | Get my pharmacy's stock |
| POST | `/api/stock` | Add stock item |
| PUT | `/api/stock/:id` | Update stock item |
| DELETE | `/api/stock/:id` | Delete stock item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/orders` | Create new order |
| GET | `/api/orders/my-orders` | Get customer's orders |
| GET | `/api/orders/pharmacy` | Get pharmacy's orders |
| GET | `/api/orders/:id` | Get order details |
| PUT | `/api/orders/:id/status` | Update order status |
| POST | `/api/orders/:id/cancel` | Cancel order |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/create-razorpay-order` | Create Razorpay order |
| POST | `/api/payments/verify` | Verify Razorpay payment |
| POST | `/api/payments/webhook` | Razorpay webhook |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/alerts` | Create availability alert |
| GET | `/api/alerts/my-alerts` | Get my alerts |
| DELETE | `/api/alerts/:id` | Delete alert |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/dashboard` | Get dashboard stats |
| GET | `/api/admin/users` | Get all users |
| PUT | `/api/admin/users/:id/status` | Toggle user status |
| GET | `/api/admin/pharmacies` | Get all pharmacies |
| PUT | `/api/admin/pharmacies/:id/verify` | Verify pharmacy |
| POST | `/api/admin/medicines` | Add medicine |
| PUT | `/api/admin/medicines/:id` | Update medicine |
| DELETE | `/api/admin/medicines/:id` | Delete medicine |

## User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Customer** | Search medicines, view pharmacies, place orders, manage profile, set alerts |
| **Pharmacy** | All customer permissions + manage pharmacy profile, stock, process orders |
| **Admin** | All permissions + manage users, verify pharmacies, manage medicine database |

## Database Models

### User
- name, email, password, phone, role, address, isActive

### Medicine
- name, genericName, manufacturer, category, description, composition
- dosageForm, strength, prescriptionRequired, sideEffects, contraindications

### Pharmacy
- owner (ref: User), name, licenseNumber, phone, email, address
- location (GeoJSON), operatingHours, isOpen, isVerified, deliveryAvailable

### Stock
- pharmacy (ref), medicine (ref), quantity, price, lowStockThreshold
- expiryDate, batchNumber, lastUpdated

### Order
- customer (ref), pharmacy (ref), items[], deliveryAddress
- status, paymentMethod, paymentStatus, totalAmount

### Payment
- order (ref), amount, razorpayOrderId, razorpayPaymentId, status

### Alert
- user (ref), medicine (ref), location, radius, isActive

## Security Features

- JWT-based authentication with access & refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation with express-validator
- CORS configuration
- HTTP-only cookies for refresh tokens
- Rate limiting ready

## License

MIT
>>>>>>> 358d8bcf219a13dd065b8fc78f9e0c08dfd5176d
