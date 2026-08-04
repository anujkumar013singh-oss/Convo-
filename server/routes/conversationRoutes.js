import express from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { getIO, isUserOnline } from '../socket/index.js';

const router = express.Router();

router.use(authenticateToken);

// Helper function to create normalized 1:1 participantsKey
const getParticipantsKey = (id1, id2) => {
  return [id1.toString(), id2.toString()].sort().join(':');
};

// Helper to format a raw aggregation conversation document
function formatConvAgg(conv, currentUserId) {
  const recipient = (conv.participantDocs || []).find(
    (p) => p._id.toString() !== currentUserId.toString()
  );
  const lastMsg = conv.lastMessageDoc?.[0] || null;
  return {
    id: conv._id.toString(),
    recipientId: recipient ? recipient._id.toString() : '',
    participant: recipient
      ? {
          id: recipient._id.toString(),
          username: recipient.username,
          fullName: recipient.fullName || recipient.username,
          avatarUrl: recipient.avatarUrl || '',
          isOnline: isUserOnline(recipient._id),
          lastSeenAt: recipient.lastSeenAt,
          email: recipient.email || '',
          phone: recipient.phone || '',
          bio: recipient.bio || '',
          links: recipient.links || [],
        }
      : null,
    unreadCount: 0,
    acceptedBy: (conv.acceptedBy || []).map((id) => id.toString()),
    updatedAt: conv.lastMessageAt || conv.updatedAt,
    lastMessage: lastMsg
      ? {
          id: lastMsg._id.toString(),
          text: lastMsg.text || (lastMsg.attachment ? `[${(lastMsg.attachment.type || 'file').toUpperCase()}]` : ''),
          senderId: lastMsg.senderId ? lastMsg.senderId.toString() : '',
          createdAt: lastMsg.createdAt,
          status: lastMsg.status || 'sent',
        }
      : null,
  };
}

// ── POST /api/conversations/start ──
router.post('/start', async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    const currentUserId = req.user._id;
    if (currentUserId.toString() === targetUserId) {
      return res.status(400).json({ error: 'Cannot start conversation with yourself' });
    }

    const targetUser = await User.findById(targetUserId).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const participantsKey = getParticipantsKey(currentUserId, targetUserId);

    let conv = await Conversation.findOne({ participantsKey }).lean();
    if (!conv) {
      conv = await Conversation.create({
        participants: [currentUserId, targetUserId],
        participantsKey,
        acceptedBy: [currentUserId],
        lastMessageAt: new Date(),
      });
      conv = conv.toObject();
    }

    // Manual lookup - single extra query only for user data (already have it)
    const recipient = {
      _id: targetUser._id,
      username: targetUser.username,
      fullName: targetUser.fullName || targetUser.username,
      avatarUrl: targetUser.avatarUrl || '',
      isOnline: Boolean(targetUser.isOnline),
      lastSeenAt: targetUser.lastSeenAt,
    };

    const formatted = {
      id: conv._id.toString(),
      recipientId: recipient._id.toString(),
      participant: {
        id: recipient._id.toString(),
        username: recipient.username,
        fullName: recipient.fullName,
        avatarUrl: recipient.avatarUrl,
        isOnline: recipient.isOnline,
        lastSeenAt: recipient.lastSeenAt,
      },
      unreadCount: 0,
      acceptedBy: (conv.acceptedBy || []).map((id) => id.toString()),
      updatedAt: conv.lastMessageAt || conv.updatedAt,
      lastMessage: null,
    };

    res.json({ conversation: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/conversations ──
// Uses $lookup aggregation pipeline for single DB round-trip (replaces slow .populate chain)
router.get('/', async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const conversations = await Conversation.aggregate([
      { $match: { participants: currentUserId } },
      { $sort: { lastMessageAt: -1 } },
      {
        $lookup: {
          from: 'users',
          localField: 'participants',
          foreignField: '_id',
          as: 'participantDocs',
          pipeline: [
            { $project: { username: 1, fullName: 1, avatarUrl: 1, isOnline: 1, lastSeenAt: 1, email: 1, phone: 1, bio: 1, links: 1 } },
          ],
        },
      },
      {
        $lookup: {
          from: 'messages',
          localField: 'lastMessage',
          foreignField: '_id',
          as: 'lastMessageDoc',
          pipeline: [
            { $project: { text: 1, attachment: 1, senderId: 1, createdAt: 1, status: 1 } },
          ],
        },
      },
      // Count unread messages (sent to current user, not yet read)
      {
        $lookup: {
          from: 'messages',
          let: { convId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$convId'] },
                    { $eq: ['$recipientId', currentUserId] },
                    { $in: ['$status', ['sent', 'delivered']] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'unreadDocs',
        },
      },
      {
        $addFields: {
          unreadCountAgg: { $ifNull: [{ $arrayElemAt: ['$unreadDocs.count', 0] }, 0] },
        },
      },
    ]);

    const formatted = conversations.map((conv) => {
      const base = formatConvAgg(conv, currentUserId);
      base.unreadCount = conv.unreadCountAgg || 0;
      return base;
    });

    res.json({ conversations: formatted });
  } catch (error) {
    console.error('[GET /conversations error]:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/conversations/:id/messages ──
router.get('/:id/messages', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized: Not a participant in this conversation' });
    }

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean();

    const formatted = messages.map((m) => ({
      id: m._id.toString(),
      conversationId: m.conversationId.toString(),
      senderId: m.senderId.toString(),
      recipientId: m.recipientId ? m.recipientId.toString() : '',
      text: m.text || '',
      attachment: m.attachment || null,
      replyTo: m.replyTo || null,
      createdAt: m.createdAt,
      status: m.status || 'sent',
    }));

    res.json({ messages: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/conversations/:id/messages/:messageId ──
router.delete('/:id/messages/:messageId', async (req, res) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Delete message permanently from MongoDB Atlas
    await Message.findByIdAndDelete(messageId);

    // Update lastMessage if the deleted message was the last one
    const remainingMsgs = await Message.find({ conversationId }).sort({ createdAt: -1 });
    const newestMsg = remainingMsgs[0];
    conversation.lastMessage = newestMsg ? newestMsg._id : null;
    if (newestMsg) {
      conversation.lastMessageAt = newestMsg.createdAt;
    }
    await conversation.save();

    // Broadcast deletion in real time via Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit('message:delete', { conversationId, messageId });
    } catch (e) {
      // Socket instance error fallback
    }

    res.json({ success: true, messageId, conversationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── DELETE /api/conversations/:id (Delete Entire Chat Permanently) ──
router.delete('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const conversation = await Conversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Permanently delete all messages and conversation document from MongoDB Atlas
    await Message.deleteMany({ conversationId });
    await Conversation.findByIdAndDelete(conversationId);

    // Broadcast conversation deletion in real time via Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit('conversation:delete', { conversationId });
    } catch (e) {
      // Socket instance error fallback
    }

    res.json({ success: true, conversationId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/conversations/:id/continue (Accept chat request and continue chatting) ──
router.post('/:id/continue', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => p.toString() === currentUserId.toString())) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Add current user to acceptedBy array if not already present
    if (!conversation.acceptedBy.some((id) => id.toString() === currentUserId.toString())) {
      conversation.acceptedBy.push(currentUserId);
      await conversation.save();
    }

    const acceptedByList = conversation.acceptedBy.map((id) => id.toString());

    // Broadcast update via Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit('conversation:accepted', {
        conversationId,
        acceptedBy: acceptedByList,
      });
    } catch (e) { /* ignore socket emit errors */ }

    res.json({ success: true, conversationId, acceptedBy: acceptedByList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/conversations/:id/block (Block target participant permanently) ──
router.post('/:id/block', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const targetUserId = conversation.participants.find((p) => p.toString() !== currentUserId.toString());
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target participant not found' });
    }

    // Add targetUserId to current user's blockedUsers array in MongoDB Atlas
    await User.findByIdAndUpdate(currentUserId, {
      $addToSet: { blockedUsers: targetUserId },
    });

    const updatedUser = await User.findById(currentUserId).lean();
    const blockedList = (updatedUser.blockedUsers || []).map((id) => id.toString());

    // Broadcast block event via Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit('user:blocked', {
        conversationId,
        blockedByUserId: currentUserId.toString(),
        blockedUserId: targetUserId.toString(),
      });
    } catch (e) { /* ignore socket emit errors */ }

    res.json({ success: true, conversationId, blockedUsers: blockedList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/conversations/:id/unblock (Unblock target participant) ──
router.post('/:id/unblock', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const targetUserId = conversation.participants.find((p) => p.toString() !== currentUserId.toString());
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target participant not found' });
    }

    // Remove targetUserId from current user's blockedUsers array
    await User.findByIdAndUpdate(currentUserId, {
      $pull: { blockedUsers: targetUserId },
    });

    const updatedUser = await User.findById(currentUserId).lean();
    const blockedList = (updatedUser.blockedUsers || []).map((id) => id.toString());

    // Broadcast unblock event via Socket.IO
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit('user:unblocked', {
        conversationId,
        unblockedByUserId: currentUserId.toString(),
        unblockedUserId: targetUserId.toString(),
      });
    } catch (e) { /* ignore socket emit errors */ }

    res.json({ success: true, conversationId, blockedUsers: blockedList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
