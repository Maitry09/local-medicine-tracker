import Notification from '../models/Notification.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';
import { sendSms } from '../services/smsService.js';

export const sendSmsReminder = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return sendError(res, 400, 'Reminder message is required');
  }

  const phone = req.user?.phone;
  if (!phone) {
    return sendError(res, 400, 'Phone number not configured for this user');
  }

  try {
    await sendSms({ to: phone, body: message });

    await Notification.create({
      user: req.userId,
      title: 'Medicine Reminder',
      message,
      type: 'general',
      meta: { via: 'sms' }
    });

    sendSuccess(res, 200, null, 'SMS reminder sent successfully');
  } catch (error) {
    sendError(res, 500, error.message || 'Failed to send SMS reminder');
  }
});
