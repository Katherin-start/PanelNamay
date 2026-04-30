const express = require('express');
const router = express.Router();
const {
  getChatMessages,
  sendMessage,
  getChatContacts,
  getUnreadMessagesCount,
} = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// 💬 RUTAS DE CHAT
router.get('/messages/:userId', authMiddleware, getChatMessages);
router.post('/messages', authMiddleware, sendMessage);
router.get('/contacts', authMiddleware, getChatContacts);
router.get('/unread-count', authMiddleware, getUnreadMessagesCount);

module.exports = router;