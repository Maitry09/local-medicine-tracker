import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount
} from '../controllers/notification.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { sendSmsReminder } from '../controllers/sms.controller.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/sms', sendSmsReminder);
router.patch('/:id/read', markAsRead);
router.patch('/mark-all-read', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;