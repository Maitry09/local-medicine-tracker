# API Reference & Backend Updates Required

## 🔌 API Endpoints Used

### Pharmacy API
```javascript
// Get pharmacy by ID (with settings)
GET /pharmacies/:id
Response: {
  data: {
    pharmacy: {
      _id, name, address, phone, email,
      defaultDiscount,      // NEW: Percentage (0-100)
      defaultDeliveryFee,   // NEW: Amount in ₹
      // ... other fields
    }
  }
}

// Get my pharmacy details
GET /pharmacies/my/details

// Update my pharmacy (settings)
PUT /pharmacies/my/update
Body: {
  defaultDiscount: 15,
  defaultDeliveryFee: 50
}
```

### Review API
```javascript
// Create a review
POST /reviews
Body: {
  pharmacyId: "...",
  orderId: "...",
  rating: 5,        // 1-5 stars
  comment: "..."
}

// Get reviews for pharmacy
GET /reviews/pharmacy/:id
```

### Stock API
```javascript
// Get my pharmacy stock
GET /stock
Params: { limit, page, ... }
```

### Order API
```javascript
// Get pharmacy orders
GET /orders/pharmacy/orders
Params: { limit, page, status, ... }
```

---

## 🗄️ Database Schema Updates

### Pharmacy Model - Add These Fields

```javascript
// In pharmacy.model.js
const pharmacySchema = new Schema({
  // ... existing fields
  
  // NEW FIELDS for settings
  defaultDiscount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    description: 'Default discount percentage applied to all orders'
  },
  defaultDeliveryFee: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Default delivery fee in rupees'
  },
  
  // ... other fields
});
```

### Order Model - Ensure These Fields Exist

```javascript
// In order.model.js
const orderSchema = new Schema({
  // ... existing fields
  
  // Should already exist, verify they do:
  subtotal: {
    type: Number,
    required: true,
    description: 'Sum of all items (before discount and delivery fee)'
  },
  discount: {
    type: Number,
    default: 0,
    description: 'Discount amount in rupees'
  },
  discountPercent: {
    type: Number,
    default: 0,
    description: 'Discount percentage applied'
  },
  deliveryFee: {
    type: Number,
    default: 0,
    description: 'Delivery fee in rupees'
  },
  total: {
    type: Number,
    required: true,
    description: 'Final amount = subtotal - discount + deliveryFee'
  },
  
  // ... other fields
});
```

---

## 🔧 Backend Changes Needed

### 1. **Pharmacy Controller** - Update My Pharmacy Endpoint
```javascript
// PUT /pharmacies/my/update
export const updateMyPharmacy = asyncHandler(async (req, res) => {
  const { defaultDiscount, defaultDeliveryFee, ...otherUpdates } = req.body;
  
  const updates = { ...otherUpdates };
  
  // Validate discount
  if (defaultDiscount !== undefined) {
    if (defaultDiscount < 0 || defaultDiscount > 100) {
      return sendError(res, 400, 'Discount must be between 0 and 100');
    }
    updates.defaultDiscount = defaultDiscount;
  }
  
  // Validate delivery fee
  if (defaultDeliveryFee !== undefined) {
    if (defaultDeliveryFee < 0) {
      return sendError(res, 400, 'Delivery fee cannot be negative');
    }
    updates.defaultDeliveryFee = defaultDeliveryFee;
  }
  
  const pharmacy = await Pharmacy.findByIdAndUpdate(
    req.pharmacyId,
    updates,
    { new: true }
  );
  
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');
  
  sendSuccess(res, 200, { pharmacy }, 'Pharmacy updated successfully');
});
```

### 2. **Order Controller** - Apply Settings When Creating Order
```javascript
// POST /orders
export const createOrder = asyncHandler(async (req, res) => {
  const { pharmacyId, items, deliveryType, ...orderData } = req.body;
  
  // Get pharmacy settings
  const pharmacy = await Pharmacy.findById(pharmacyId);
  if (!pharmacy) return sendError(res, 404, 'Pharmacy not found');
  
  // Calculate subtotal
  let subtotal = 0;
  for (let item of items) {
    subtotal += item.price * item.quantity;
  }
  
  // Apply pharmacy's default discount
  const discountPercent = pharmacy.defaultDiscount || 0;
  const discount = (subtotal * discountPercent) / 100;
  
  // Apply delivery fee only if delivery type is 'delivery'
  const deliveryFee = deliveryType === 'delivery' ? (pharmacy.defaultDeliveryFee || 0) : 0;
  
  // Calculate final total
  const total = subtotal - discount + deliveryFee;
  
  // Create order with calculated values
  const order = await Order.create({
    ...orderData,
    pharmacyId,
    items,
    deliveryType,
    subtotal,
    discount,
    discountPercent,
    deliveryFee,
    total,
    status: 'pending',
    userId: req.userId
  });
  
  sendSuccess(res, 201, { order }, 'Order created successfully');
});
```

### 3. **Ensure Review Endpoint Exists**
```javascript
// Verify this exists in review.controller.js

export const createReview = asyncHandler(async (req, res) => {
  const { pharmacyId, orderId, rating, comment } = req.body;
  
  // Validation
  if (!rating || rating < 1 || rating > 5) {
    return sendError(res, 400, 'Rating must be between 1 and 5');
  }
  
  if (!comment || comment.trim().length < 10) {
    return sendError(res, 400, 'Comment must be at least 10 characters');
  }
  
  // Prevent duplicate reviews for same order
  if (orderId) {
    const existing = await Review.findOne({ order: orderId });
    if (existing) return sendError(res, 400, 'Review already exists for this order');
  }
  
  const review = await Review.create({
    user: req.userId,
    pharmacy: pharmacyId,
    order: orderId || null,
    rating,
    comment,
    isVerifiedPurchase: !!orderId // true if linked to an order
  });
  
  sendSuccess(res, 201, { review }, 'Review created successfully');
});
```

---

## ✅ Validation Rules

### Frontend Validation
```javascript
// Already implemented in PharmacySettings.jsx
- Discount: 0-100 (step 0.01)
- Delivery Fee: 0+ (step 1)
- Review Rating: 1-5 stars
- Review Comment: minimum 10 characters
```

### Backend Validation (Required)
```javascript
// In routes or middleware

// Pharmacy Settings
- defaultDiscount: number, 0-100, optional
- defaultDeliveryFee: number, >= 0, optional

// Review Creation
- rating: number, required, 1-5
- comment: string, required, min length 10
- pharmacyId: ObjectId, required
- orderId: ObjectId, optional but recommended
```

---

## 🔐 Authentication & Authorization

### Protected Endpoints

```javascript
// PharmacySettings - only for authenticated pharmacies
PUT /pharmacies/my/update
- Middleware: authMiddleware (user must be logged in)
- Check: user.role === 'pharmacy' (if role-based)
- Update: only their own pharmacy

// Create Review - authenticated users
POST /reviews
- Middleware: authMiddleware
- Requirement: orderId for verified purchases

// Get Pharmacy Orders - authenticated pharmacies
GET /orders/pharmacy/orders
- Middleware: authMiddleware
- Filter: orders.pharmacy === user.pharmacyId
```

---

## 📈 Performance Optimization

### Queries to Optimize
```javascript
// When creating order, consider indexing:
db.pharmacies.createIndex({ _id: 1 })
db.orders.createIndex({ pharmacy: 1, status: 1 })
db.reviews.createIndex({ pharmacy: 1, createdAt: -1 })

// For pagination in pharmacy orders:
db.orders.createIndex({ pharmacy: 1, createdAt: -1 })
```

---

## 🧪 Test Cases

### Test Pharmacy Settings
```bash
# Update pharmacy settings
PUT /pharmacies/my/update
{
  "defaultDiscount": 10,
  "defaultDeliveryFee": 50
}
# Expect: 200 with updated pharmacy object

# Verify order uses these values
POST /orders
# Expect: discount and deliveryFee calculated correctly
```

### Test Order Calculations
```bash
# Order with discount and delivery
POST /orders
{
  "items": [{ "price": 100, "quantity": 2 }],
  "deliveryType": "delivery"
}

# Expected total with 10% discount and ₹50 delivery:
# Subtotal: 200
# Discount: 20
# Delivery: 50
# Total: 230
```

### Test Review Creation
```bash
# Submit review
POST /reviews
{
  "pharmacyId": "...",
  "orderId": "...",
  "rating": 5,
  "comment": "Great service and fast delivery!"
}
# Expect: 201 with review created
```

---

## 📝 Migration Script (if adding fields to existing orders)

```javascript
// migrations/add-order-calculations.js
db.orders.updateMany({}, [
  {
    $set: {
      subtotal: { $sum: "$items.price" },  // Simplified, may need adjustment
      discountPercent: 0,
      discount: 0,
      deliveryFee: 0,
      total: "$total"  // Existing total as fallback
    }
  }
]);
```

---

## 🚀 Deployment Checklist

- [ ] Database: Add `defaultDiscount` and `defaultDeliveryFee` to Pharmacy model
- [ ] Database: Ensure Order model has all calculation fields
- [ ] Backend: Implement pharmacy settings update logic
- [ ] Backend: Update order creation to apply pharmacy discounts
- [ ] Backend: Review endpoint exists and validates correctly
- [ ] Frontend: PharmacySettings component integrated
- [ ] Frontend: Cart applies pharmacy fees correctly
- [ ] Frontend: OrderDetails shows correct totals
- [ ] Frontend: Review modal works on delivered orders
- [ ] Testing: All endpoints tested
- [ ] Testing: Discount/fee calculations verified
- [ ] Testing: Review creation works

