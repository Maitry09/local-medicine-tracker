import Notification from '../models/Notification.js';
import { asyncHandler, sendSuccess, sendError } from '../utils/errorHandler.js';

// Get my notifications
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;

  const query = { user: req.userId };
  if (unreadOnly === 'true') query.isRead = false;

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ user: req.userId, isRead: false });

  sendSuccess(res, 200, {
    notifications,
    unreadCount,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    }
  }, 'Notifications fetched');
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) return sendError(res, 404, 'Notification not found');
  sendSuccess(res, 200, { notification }, 'Notification marked as read');
});

// Mark all as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
  sendSuccess(res, 200, null, 'All notifications marked as read');
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.userId });
  sendSuccess(res, 200, null, 'Notification deleted');
});

// Get unread count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ user: req.userId, isRead: false });
  sendSuccess(res, 200, { count }, 'Unread count fetched');
});