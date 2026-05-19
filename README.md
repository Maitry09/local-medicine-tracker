# 🏥 MediFind - Local Medicine Availability Tracker

A full-stack MERN application that helps patients find medicines at nearby pharmacies in real-time. The platform connects patients with local pharmacies, enabling prescription uploads, stock alerts, online ordering, and real-time inventory tracking.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [User Roles](#user-roles)
- [Database Models](#database-models)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### For Patients
- 🔍 **Search Medicines** - Find medicines across multiple pharmacies
- 📍 **Location-based Search** - Discover nearby pharmacies with available stock
- 📋 **Prescription Upload** - Upload and manage prescriptions digitally
- 🛒 **Online Ordering** - Place orders for home delivery or pickup
- 🔔 **Stock Alerts** - Get notified when out-of-stock medicines become available
- 💊 **Medicine Comparison** - Compare prices across different pharmacies
- 💳 **Secure Payments** - Integrated Razorpay payment gateway
- ⭐ **Reviews & Ratings** - Rate pharmacies and leave feedback
- 📊 **Order History** - Track past orders and prescriptions
- 💾 **Save Medicines** - Bookmark frequently needed medicines
- ⏰ **Medicine Reminder** - Give reminder for taking medicines at a time

### For Pharmacies
- 📦 **Stock Management** - Real-time inventory control with expiry tracking
- 📨 **Order Management** - Process and fulfill patient orders
- 📊 **Analytics Dashboard** - Track sales, revenue, and popular medicines
- 🔔 **Low Stock Alerts** - Automated notifications for inventory management
- 📋 **Prescription Review** - Verify and approve patient prescriptions
- ⚙️ **Profile Management** - Update pharmacy details, hours, and contact info
- 📈 **Performance Metrics** - View order statistics and customer ratings

### For Admins
- 👥 **User Management** - Manage patients and pharmacy accounts
- 🏪 **Pharmacy Verification** - Approve and verify pharmacy registrations
- 💊 **Medicine Database** - Maintain master medicine catalog
- 📋 **Prescription Oversight** - Monitor prescription uploads and approvals
- 📊 **System Analytics** - Platform-wide statistics and insights
- 🔧 **Order Management** - Handle disputes and order issues

## 🛠️ Tech Stack

### Frontend
- **React 18.2** - UI library
- **React Router DOM 6.21** - Client-side routing
- **Vite 5.0** - Build tool and dev server
- **Axios** - HTTP client
- **Socket.io-client** - Real-time updates
- **Recharts** - Data visualization

### Backend
- **Node.js** - Runtime environment
- **Express 4.18** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose 8.0** - ODM
- **Socket.io** - WebSocket for real-time features
- **JWT** - Authentication
- **Bcrypt** - Password hashing

### Additional Services
- **Razorpay** - Payment processing
- **Cloudinary** - Image/document storage
- **Nodemailer** - Email notifications
- **Node-cron** - Scheduled tasks (expiry alerts)
- **Multer** - File upload handling

### Security & Middleware
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - API rate limiting
- **Express Mongo Sanitize** - NoSQL injection prevention
- **Express Validator** - Input validation

## 📁 Project Structure

```
medfinder/
├── backend/                  # Backend API
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   └── cloudinaryConfig.js
│   ├── controllers/         # Route controllers
│   │   ├── admin.controller.js
│   │   ├── alert.controller.js
│   │   ├── auth.controller.js
│   │   ├── medicine.controller.js
│   │   ├── order.controller.js
│   │   ├── payment.controller.js
│   │   ├── pharmacy.controller.js
│   │   ├── prescription.controller.js
│   │   ├── review.controller.js
│   │   ├── stock.controller.js
│   │   └── user.controller.js
│   ├── middleware/          # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── validation.middleware.js
│   ├── models/              # Mongoose models
│   │   ├── Alert.js
│   │   ├── Cart.js
│   │   ├── Medicine.js
│   │   ├── Notification.js
│   │   ├── Order.js
│   │   ├── Payment.js
│   │   ├── Pharmacy.js
│   │   ├── Prescription.js
│   │   ├── Review.js
│   │   ├── SavedMedicine.js
│   │   ├── Stock.js
│   │   └── User.js
│   ├── routes/              # API routes
│   ├── services/            # Business logic services
│   │   ├── emailService.js
│   │   └── smsService.js
│   ├── jobs/                # Scheduled jobs
│   │   └── expiryAlertJob.js
│   ├── utils/               # Utility functions
│   │   ├── errorHandler.js
│   │   ├── jwt.js
│   │   └── logger.js
│   ├── seed.js              # Database seeder
│   ├── server.js            # Entry point
│   └── package.json
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── context/         # React Context (Auth, etc.)
│   │   ├── hooks/           # Custom hooks
│   │   ├── layouts/         # Layout components
│   │   ├── pages/           # Page components
│   │   │   ├── auth/       # Login, Register
│   │   │   ├── patient/    # Patient dashboard & features
│   │   │   ├── pharmacy/   # Pharmacy dashboard & features
│   │   │   └── admin/      # Admin dashboard & features
│   │   ├── services/        # API service layer
│   │   ├── styles/          # CSS files
│   │   ├── App.jsx          # Root component
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json             # Root package.json (workspaces)
├── db.md                    # Database seed credentials
└── README.md                # This file
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (v6 or higher) - [Download](https://www.mongodb.com/try/download/community)
- **npm** or **pnpm** - Package manager
- **Git** - Version control

Optional but recommended:
- **MongoDB Compass** - GUI for MongoDB
- **Postman** - API testing

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd medicine-tracker
```

### 2. Install Dependencies

#### Option A: Install all at once (recommended)
```bash
npm run install:all
```

#### Option B: Install separately
```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Set Up MongoDB

Start your MongoDB server:

```bash
# On Linux/Mac
sudo systemctl start mongod

# On Windows
net start MongoDB

# Or using MongoDB Compass - just open the application
```

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following environment variables:

```env
# Server Configuration
NODE_ENV=development
PORT=5002

# Database
MONGODB_URI=mongodb://localhost:27017/medicine_tracker

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Razorpay (for payments)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Email Configuration (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_specific_password
EMAIL_FROM=noreply@medfinder.com

# SMS Configuration (optional)
SMS_API_KEY=your_sms_api_key
SMS_SENDER_ID=MEDFND
```

### 5. Seed the Database (Optional)

Populate the database with sample data:

```bash
cd backend
node seed.js
```

This will create:
- 1 Admin account
- 5 Pharmacy accounts
- 10 Patient accounts
- Sample medicines and stock data

**Default credentials after seeding:**
- **Admin:** admin@medifind.com / admin123
- **Pharmacy:** rajesh.apollo@gmail.com / pharmacy123
- **Patient:** amit.patel@gmail.com / patient123

*(See `db.md` for complete list)*

## 🏃 Running the Application

### Development Mode

#### Option A: Run both frontend and backend together
```bash
# From root directory
npm run dev
```

#### Option B: Run separately in different terminals

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health Check:** http://localhost:5002/api/health
- **API Documentation:** http://localhost:5002/api-docs

### Production Mode

#### Build the frontend:
```bash
npm run build
```

#### Start the server:
```bash
npm start
```

### 🐳 Docker Deployment (Recommended)

The project includes Docker configuration for easy deployment:

```bash
# Start all services (MongoDB, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

**Docker services:**
- **mongodb:** Database on port 27017
- **backend:** API on port 5000
- **frontend:** React app on port 5173

To deploy to production with Docker:
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production stack
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```
### 🔐 Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | ❌ | Register new user |
| POST | `/auth/login` | ❌ | User login |
| POST | `/auth/refresh-token` | ❌ | Refresh JWT access token |
| POST | `/auth/forgot-password` | ❌ | Request password reset email |
| POST | `/auth/reset-password` | ❌ | Reset password using token |
| POST | `/auth/logout` | ✅ | User logout |
| GET | `/auth/me` | ✅ | Get current logged-in user |
| PUT | `/auth/profile` | ✅ | Update current user's profile |
| PUT | `/auth/change-password` | ✅ | Change authenticated user's password |

---

### 💊 Medicine Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/medicines/search` | ❌ | Search medicines by name, category, etc. |
| GET | `/medicines/categories` | ❌ | Get all medicine categories |
| GET | `/medicines/:id` | ❌ | Get medicine details by ID |
| GET | `/medicines/:id/availability` | ❌ | Check medicine stock availability across pharmacies |
| GET | `/medicines/:id/pharmacies` | ❌ | Get pharmacies that stock a specific medicine |
| POST | `/medicines` | ✅ Admin | Create a new medicine |
| PUT | `/medicines/:id` | ✅ Admin | Update medicine details |
| DELETE | `/medicines/:id` | ✅ Admin | Delete a medicine |

---

### 🏪 Pharmacy Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/pharmacies` | ❌ | Get all approved pharmacies |
| GET | `/pharmacies/:id` | ❌ | Get pharmacy details by ID |
| GET | `/pharmacies/:id/stock` | ❌ | Get all stock items for a pharmacy |
| GET | `/pharmacies/:id/medicines` | ❌ | Get medicines available at a pharmacy |
| POST | `/pharmacies/register` | ✅ Pharmacy | Register a new pharmacy profile |
| GET | `/pharmacies/my/details` | ✅ Pharmacy | Get own pharmacy details |
| PUT | `/pharmacies/my/update` | ✅ Pharmacy | Update own pharmacy profile |
| PATCH | `/pharmacies/:id/verify` | ✅ Admin | Verify/approve a pharmacy |
| PATCH | `/pharmacies/:id/reject` | ✅ Admin | Reject a pharmacy registration |
| PATCH | `/pharmacies/:id/disable` | ✅ Admin | Disable a pharmacy |
| DELETE | `/pharmacies/:id` | ✅ Admin | Delete a pharmacy |

---

### 📦 Stock Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/stock` | ✅ Pharmacy/Admin | Get own pharmacy's stock list |
| POST | `/stock` | ✅ Pharmacy/Admin | Add a new stock item |
| PUT | `/stock/:id` | ✅ Pharmacy/Admin | Update a stock item |
| DELETE | `/stock/:id` | ✅ Pharmacy/Admin | Delete a stock item |
| POST | `/stock/bulk` | ✅ Pharmacy/Admin | Bulk update multiple stock items |

---

### 🛒 Cart Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | ✅ Patient | Get patient's current cart |
| POST | `/cart/add` | ✅ Patient | Add an item to the cart |
| PUT | `/cart/item/:itemId` | ✅ Patient | Update quantity of a cart item |
| DELETE | `/cart/item/:itemId` | ✅ Patient | Remove an item from the cart |
| DELETE | `/cart/clear` | ✅ Patient | Clear the entire cart |

---

### 📋 Order Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/orders/my-orders` | ✅ Patient | Get authenticated patient's orders |
| POST | `/orders` | ✅ Patient | Create a new order |
| PATCH | `/orders/:id/cancel` | ✅ Patient | Cancel an order |
| GET | `/orders/pharmacy/orders` | ✅ Pharmacy/Admin | Get orders assigned to the pharmacy |
| PATCH | `/orders/:id/status` | ✅ Pharmacy/Admin | Update order status (confirmed, dispatched, delivered) |
| PATCH | `/orders/:id/payment-status` | ✅ Pharmacy/Admin | Mark COD cash as collected |
| GET | `/orders/admin/all` | ✅ Admin | Get all orders platform-wide |
| GET | `/orders/:id` | ✅ | Get a specific order by ID |

---

### 📄 Prescription Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/prescriptions/upload` | ✅ Patient | Upload a prescription image/PDF |
| GET | `/prescriptions/my` | ✅ Patient | Get patient's own prescriptions and pharmacy responses |
| GET | `/prescriptions/pharmacy` | ✅ Pharmacy | View all prescriptions (pharmacy perspective) |
| GET | `/prescriptions/admin` | ✅ Admin | View all prescriptions (admin perspective) |
| GET | `/prescriptions/:id` | ✅ | Get prescription details (patient/pharmacy/admin) |
| POST | `/prescriptions/:id/respond` | ✅ Pharmacy | Submit medicine suggestions for a prescription |
| PATCH | `/prescriptions/:id/review` | ✅ Pharmacy | Approve or reject a prescription |

---

### 💳 Payment Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/payments/webhook` | ❌ | Razorpay webhook handler (signature-verified) |
| GET | `/payments/config` | ❌ | Get Razorpay public key for frontend |
| POST | `/payments/create-order` | ✅ | Create a Razorpay payment order |
| POST | `/payments/verify` | ✅ | Verify a completed Razorpay payment |
| GET | `/payments/details/:paymentId` | ✅ | Get payment details by ID |
| GET | `/payments/user/all` | ✅ | Get all payments for the authenticated user |
| POST | `/payments/refund` | ✅ | Initiate a payment refund |

---

### 🔔 Alert Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/alerts` | ✅ | Get all alerts for the authenticated user |
| GET | `/alerts/triggered/count` | ✅ | Get count of triggered (unread) alerts |
| POST | `/alerts` | ✅ | Create a new stock alert for a medicine |
| PUT | `/alerts/:id` | ✅ | Update an existing alert |
| PATCH | `/alerts/:id/acknowledge` | ✅ | Acknowledge a triggered alert |
| DELETE | `/alerts/:id` | ✅ | Delete an alert |

---

### 🔔 Notification Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | ✅ | Get all notifications for the authenticated user |
| GET | `/notifications/unread-count` | ✅ | Get count of unread notifications |
| PATCH | `/notifications/:id/read` | ✅ | Mark a notification as read |
| PATCH | `/notifications/mark-all-read` | ✅ | Mark all notifications as read |
| DELETE | `/notifications/:id` | ✅ | Delete a notification |
| POST | `/notifications/sms` | ✅ | Send an SMS medicine reminder |

---

### ⭐ Review Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/reviews` | ❌ | Get all reviews (public) |
| GET | `/reviews/pharmacy/:id` | ❌ | Get reviews for a specific pharmacy |
| GET | `/reviews/my-reviews` | ✅ | Get all reviews written by the authenticated user |
| POST | `/reviews` | ✅ | Create a new review |
| PUT | `/reviews/:id` | ✅ | Update a review |
| DELETE | `/reviews/:id` | ✅ | Delete a review |

---

### 💾 Saved Medicines Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/saved-medicines` | ✅ Patient | Get all saved/bookmarked medicines |
| POST | `/saved-medicines` | ✅ Patient | Save/bookmark a medicine |
| DELETE | `/saved-medicines/:id` | ✅ Patient | Remove a saved medicine |

---

### 👥 User Management Endpoints (Admin)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | ✅ Admin | Get all users |
| GET | `/users/:id` | ✅ Admin | Get a user by ID |
| PUT | `/users/:id` | ✅ Admin | Update a user's details |
| PATCH | `/users/:id/disable` | ✅ Admin | Disable a user account |
| PATCH | `/users/:id/enable` | ✅ Admin | Enable a user account |
| DELETE | `/users/:id` | ✅ Admin | Delete a user |

---

### 🛠️ Admin Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/admin/setup` | ❌ | One-time initial admin account setup |
| GET | `/admin/dashboard` | ✅ Admin | Get platform-wide dashboard statistics |
| GET | `/admin/pharmacies` | ✅ Admin | Get all pharmacies (admin view) |
| PUT | `/admin/pharmacies/:id` | ✅ Admin | Update any pharmacy profile |
| GET | `/admin/payments` | ✅ Admin | Get all payment records |
| GET | `/admin/activity` | ✅ Admin | Get platform activity/audit logs |
| POST | `/admin/admins` | ✅ Admin | Create additional admin users |
| POST | `/admin/seed-medicines` | ✅ Admin | Seed the medicine database |

---

### 🩺 Utility Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | ❌ | API health check |
| GET | `/test-db` | ❌ | Test MongoDB connection status |

---

## 👥 User Roles

### 1. Patient
- Search and find medicines
- Upload prescriptions
- Place orders
- Set stock alerts
- Write reviews
- Track order history

### 2. Pharmacy
- Manage inventory/stock
- Process orders
- Review prescriptions
- Update profile and settings
- View analytics
- Respond to reviews

### 3. Admin
- Manage all users
- Verify pharmacies
- Maintain medicine database
- Monitor all orders
- View platform statistics
- Handle disputes

## 🗄️ Database Models

### User
- Email, password, name
- Role (patient/pharmacy/admin)
- Address, phone
- Verification status

### Medicine
- Name, generic name, brand
- Category, form, strength
- Description, manufacturer
- Requires prescription flag

### Pharmacy
- Name, license number
- Owner details
- Address, location (lat/lng)
- Operating hours
- Contact info
- Verification status

### Stock
- Medicine reference
- Pharmacy reference
- Quantity, price
- Expiry date
- Timestamps

### Order
- User and pharmacy references
- Items array (medicine, quantity, price)
- Status (pending, confirmed, delivered, cancelled)
- Total amount
- Delivery/pickup details

### Prescription
- User reference
- Uploaded files (Cloudinary URLs)
- Status (pending, verified, rejected)
- Validity period

### Alert
- User and medicine references
- Notification preferences

### Review
- User and pharmacy references
- Rating (1-5)
- Comment
- Response from pharmacy

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth with 64-char random secret
- **Password Hashing** - Bcrypt with salt rounds
- **Rate Limiting** - Prevent abuse and DDoS attacks
- **CORS Protection** - Controlled cross-origin access
- **Helmet.js** - Security headers configured
- **Input Validation** - Frontend (React Hook Form/Yup) + Backend (Express Validator)
- **NoSQL Injection Prevention** - Mongo Sanitize middleware
- **Environment Variables** - Sensitive data protection (.env configured)
- **Security Audit** - Completed and vulnerabilities addressed
- **Error Boundaries** - React error boundaries implemented for graceful failures

## ⚡ Performance Optimizations

- **API Response Caching** - Redis/in-memory caching for frequently accessed data
- **Database Indexing** - Optimized queries with compound indexes
- **Code Splitting** - React lazy loading for faster initial load
- **Image Optimization** - Cloudinary with auto-format and compression
- **Gzip Compression** - Reduced payload sizes
- **Query Optimization** - Efficient MongoDB aggregation pipelines
- **Connection Pooling** - Optimized database connections

## 📚 Documentation

- **API Documentation** - Interactive Swagger/OpenAPI docs at `/api-docs`
- **Code Comments** - Comprehensive inline documentation
- **README** - Complete setup and usage guide
- **Environment Template** - `.env.example` with all required variables
- **Contributing Guide** - Guidelines for contributors

## 🐛 Common Issues & Solutions

### MongoDB Connection Error
```
Error: ECONNREFUSED 127.0.0.1:27017
```
**Solution:** Make sure MongoDB is running
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5002
```
**Solution:** Kill the process using the port
```bash
# Find process
lsof -i :5002
# Kill process
kill -9 <PID>
```

### CORS Error
**Solution:** Check that `FRONTEND_URL` in `.env` matches your frontend URL

### JWT Secret Missing
**Solution:** Add `JWT_SECRET` to your `.env` file

## 📝 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Test Coverage
- **Unit Tests:** Controllers, Services, Utilities
- **Integration Tests:** API endpoints, Database operations
- **E2E Tests:** Critical user flows
- **Code Coverage:** Target 80%+

### Test Database Connection
```bash
curl http://localhost:5002/api/test-db
```

### Test Health Endpoint
```bash
curl http://localhost:5002/api/health
```

### API Testing with Swagger
Visit `http://localhost:5002/api-docs` to interactively test all API endpoints.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

Maitry Chauhan - maitrychauhan30@gmail.com

## 🙏 Acknowledgments

- MongoDB for the database
- Express.js team
- React team
- Vite team
- All open-source contributors

## 📞 Support

For support, email or create an issue in the repository.

---

**Made with ❤️ for better healthcare accessibility**
