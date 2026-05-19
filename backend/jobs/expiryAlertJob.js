// backend/jobs/expiryAlertJob.js
// Install: npm install node-cron
// Import and call startExpiryAlertJob() in server.js after connectDB()

import cron from 'node-cron';
import Stock from '../models/Stock.js';
import Alert from '../models/Alert.js';
import Pharmacy from '../models/Pharmacy.js';
import logger from '../utils/logger.js';

const THRESHOLDS = [30, 60, 90]; // days before expiry

async function checkExpiringStock() {
  logger.info('🕐 [ExpiryJob] Checking for expiring stock...');
  const now = new Date();

  for (const days of THRESHOLDS) {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    // Find stock expiring within `days` days but not yet expired
    const expiringItems = await Stock.find({
      expiryDate: { $gte: now, $lte: cutoff },
      quantity: { $gt: 0 }
    }).populate('medicine', 'name').populate('pharmacy', 'owner');

    for (const item of expiringItems) {
      const daysLeft = Math.ceil((new Date(item.expiryDate) - now) / (1000 * 60 * 60 * 24));

      // Avoid duplicate alerts — check if one already exists for this stock + threshold
      const existing = await Alert.findOne({
        type: 'expiry_reminder',
        'metadata.stockId': item._id,
        'metadata.threshold': days,
        createdAt: { $gte: new Date(now - 1000 * 60 * 60 * 24) } // created in last 24h
      });

      if (existing) continue;

      await Alert.create({
        user: item.pharmacy.owner,
        type: 'expiry_reminder',
        title: `⚠️ Medicine Expiring in ${daysLeft} Days`,
        message: `${item.medicine.name} (Batch: ${item.batchNumber || 'N/A'}) — ${item.quantity} units expire on ${new Date(item.expiryDate).toLocaleDateString('en-IN')}. Take action before it cannot be sold.`,
        isActive: true,
        metadata: {
          stockId: item._id,
          medicineId: item.medicine._id,
          threshold: days,
          daysLeft,
          expiryDate: item.expiryDate
        }
      });

      logger.info(`📅 [ExpiryJob] Alert created: ${item.medicine.name} expires in ${daysLeft} days`);
    }
  }

  logger.info('✅ [ExpiryJob] Done.');
}

export function startExpiryAlertJob() {
  // Runs every day at 8:00 AM
  cron.schedule('0 8 * * *', checkExpiringStock, { timezone: 'Asia/Kolkata' });

  // Also run once on startup to catch any missed alerts
  checkExpiringStock().catch(logger.error);

  logger.info('🕐 Expiry alert job scheduled (daily at 8:00 AM IST)');
}
