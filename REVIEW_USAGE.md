# Review Feature Usage

## Overview
The Review feature in this application is used in two contexts:

### 1. **Pharmacy Reviews** (Product/Service Reviews)
These are ratings and comments from users about pharmacies.

#### Backend Implementation:
- **Model**: [backend/models/Review.js](backend/models/Review.js)
  - Stores user reviews for pharmacies
  - Fields: `user`, `pharmacy`, `order`, `rating` (1-5), `comment`, `isVerifiedPurchase`
  - One review per order (unique constraint on `order`)

- **Controller**: [backend/controllers/review.controller.js](backend/controllers/review.controller.js)
  - `createReview()` - Create a review for a pharmacy
  - `getReviewsForPharmacy()` - Get all reviews for a specific pharmacy with pagination

- **Routes**: [backend/routes/review.routes.js](backend/routes/review.routes.js)
  - `POST /reviews` - Create new review (requires auth)
  - `GET /reviews/pharmacy/:id` - Get reviews for pharmacy

#### Frontend Implementation:
- Reviews are displayed on **Pharmacy Detail Pages**
- Users can submit ratings and comments after order delivery
- Verified purchase badge shows when review is from an actual customer

---

### 2. **Prescription Reviews** (Pharmacy Review Process)
Pharmacies review prescriptions uploaded by customers before fulfilling orders.

#### Frontend Component:
- **File**: [frontend/src/pages/pharmacy/PrescriptionReview.jsx](frontend/src/pages/pharmacy/PrescriptionReview.jsx)
- **Features**:
  - Pharmacists can view pending prescriptions
  - Approve or reject prescriptions
  - Add rejection reason if rejected
  - Filter by status: pending, approved, rejected, all
  - Shows prescription image, patient details, and order information

#### Backend Implementation:
- **Routes**: [backend/routes/prescription.routes.js](backend/routes/prescription.routes.js)
  - `PATCH /prescriptions/:id/review` - Pharmacy reviews prescription
- **Model**: Uses existing Prescription model with `status` and `rejectionReason` fields

---

## Summary

| Feature | Type | Used By | Purpose |
|---------|------|---------|---------|
| **Pharmacy Reviews** | User Reviews | Patients | Rate and review pharmacy service |
| **Prescription Reviews** | Internal Review | Pharmacists | Approve/reject prescription before fulfillment |

## Integration Points

1. **After Order Delivery**: 
   - Customer can leave a review for the pharmacy
   - Review appears on pharmacy profile

2. **During Order Processing**:
   - Pharmacy staff reviews uploaded prescriptions
   - Can approve or request changes
   - Rejection reason sent to customer

