// backend/services/emailService.js
// Install: npm install nodemailer
// Add to backend/.env:
//   EMAIL_HOST=smtp.gmail.com
//   EMAIL_PORT=587
//   EMAIL_USER=your@gmail.com
//   EMAIL_PASS=your_app_password   ← use Gmail App Password, not real password
//   EMAIL_FROM="Medicine App <your@gmail.com>"

import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const FROM = process.env.EMAIL_FROM || 'Medicine App <noreply@medicine.app>';

// Generic send helper
async function sendMail(to, subject, html) {
  if (!process.env.EMAIL_USER) {
    console.log(`[EmailService] Email not configured — skipping: ${subject} → ${to}`);
    return;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    console.log(`[EmailService] ✅ Sent: "${subject}" → ${to}`);
  } catch (err) {
    console.error(`[EmailService] ❌ Failed: ${err.message}`);
  }
}

// ─── Templates ────────────────────────────────────────────────────────────────

export async function sendOrderConfirmation(user, order, pharmacy) {
  const itemsList = (order.items || []).map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0">${i.medicine?.name || 'Medicine'}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right">₹${i.price}</td>
    </tr>`
  ).join('');

  await sendMail(user.email, `✅ Order Confirmed — #${order.orderNumber}`, `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
      <h2 style="color:#1976d2">Order Confirmed!</h2>
      <p>Hi ${user.name},<br>Your order <strong>#${order.orderNumber}</strong> has been placed successfully.</p>
      <h3>Items Ordered</h3>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">Medicine</th>
          <th style="padding:8px;text-align:center">Qty</th>
          <th style="padding:8px;text-align:right">Price</th>
        </tr></thead>
        <tbody>${itemsList}</tbody>
      </table>
      <p style="text-align:right;margin-top:8px"><strong>Total: ₹${order.totalAmount || order.total}</strong></p>
      <p>📍 <strong>Pharmacy:</strong> ${pharmacy.name}, ${pharmacy.address?.city}</p>
      <p style="color:#888;font-size:12px">You'll receive another email when your order status updates.</p>
    </div>
  `);
}

export async function sendOrderStatusUpdate(user, order, pharmacy) {
  const statusMessages = {
    confirmed: { emoji: '✅', text: 'Your order has been confirmed by the pharmacy.' },
    processing: { emoji: '🔄', text: 'Your order is being processed and packed.' },
    ready: { emoji: '📦', text: 'Your order is ready for pickup/delivery!' },
    out_for_delivery: { emoji: '🚚', text: 'Your order is out for delivery.' },
    delivered: { emoji: '🎉', text: 'Your order has been delivered. Enjoy!' },
    cancelled: { emoji: '❌', text: 'Your order has been cancelled.' }
  };

  const info = statusMessages[order.status] || { emoji: 'ℹ️', text: `Order status: ${order.status}` };

  await sendMail(user.email, `${info.emoji} Order #${order.orderNumber} — ${order.status.toUpperCase()}`, `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
      <h2>${info.emoji} Order Update</h2>
      <p>Hi ${user.name},</p>
      <p>${info.text}</p>
      <p><strong>Order:</strong> #${order.orderNumber}<br>
         <strong>Pharmacy:</strong> ${pharmacy.name}<br>
         <strong>Status:</strong> ${order.status.toUpperCase()}</p>
      <p style="color:#888;font-size:12px">Thank you for using Medicine App.</p>
    </div>
  `);
}

export async function sendPrescriptionReviewResult(user, prescription, order) {
  const approved = prescription.status === 'approved';
  await sendMail(user.email,
    approved ? '✅ Prescription Approved — Order Confirmed' : '❌ Prescription Rejected',
    `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
      <h2>${approved ? '✅ Prescription Approved!' : '❌ Prescription Rejected'}</h2>
      <p>Hi ${user.name},</p>
      ${approved
        ? `<p>Your prescription for order <strong>#${order.orderNumber}</strong> has been approved. Your order is now confirmed and being processed.</p>`
        : `<p>Unfortunately, your prescription for order <strong>#${order.orderNumber}</strong> was rejected.</p>
           ${prescription.rejectionReason ? `<p><strong>Reason:</strong> ${prescription.rejectionReason}</p>` : ''}
           <p>Please contact the pharmacy or upload a clearer prescription.</p>`
      }
    </div>
  `);
}

export async function sendLowStockAlert(pharmacyOwnerEmail, pharmacyName, items) {
  const rows = items.map(i =>
    `<tr><td style="padding:8px">${i.medicine?.name}</td><td style="padding:8px;text-align:right;color:#c62828;font-weight:bold">${i.quantity}</td></tr>`
  ).join('');

  await sendMail(pharmacyOwnerEmail, `⚠️ Low Stock Alert — ${pharmacyName}`, `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#333">
      <h2>⚠️ Low Stock Warning</h2>
      <p>The following medicines at <strong>${pharmacyName}</strong> are running low (< 10 units):</p>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:#fff3e0">
          <th style="padding:8px;text-align:left">Medicine</th>
          <th style="padding:8px;text-align:right">Units Left</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please restock soon to avoid going out of stock.</p>
    </div>
  `);
}
