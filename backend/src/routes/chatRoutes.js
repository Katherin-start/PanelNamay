const express = require('express');
const multer = require('multer');
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const {
  getChatMessages,
  sendMessage,
  uploadChatAttachment,
  getChatContacts,
  getUnreadMessagesCount,
  markMessagesAsRead,
  deleteMessageForMe,
  clearChat,
} = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// 💬 RUTAS DE CHAT
router.get('/messages/:userId', authMiddleware, getChatMessages);
router.post('/messages', authMiddleware, sendMessage);
router.post('/messages/mark-as-read', authMiddleware, markMessagesAsRead);
router.post('/upload', authMiddleware, upload.single('file'), uploadChatAttachment);
router.get('/contacts', authMiddleware, getChatContacts);
router.get('/unread-count', authMiddleware, getUnreadMessagesCount);

// 🗑️ RUTAS DE ELIMINACIÓN
router.post('/messages/delete', authMiddleware, deleteMessageForMe);
router.post('/clear', authMiddleware, clearChat);

module.exports = router;
