import { Server } from 'socket.io';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Call from '../models/Call.js';
import { verifyAccessToken } from '../middleware/auth.js';

let io = null;
const userSockets = new Map(); // userId -> Set of socket.ids
const socketUsers = new Map(); // socket.id -> userId
const disconnectTimers = new Map(); // userId -> setTimeout timer

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      const token = rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : null;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('_id username email avatarUrl');
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error('[Socket Auth Middleware Error]:', err.message);
      next(new Error('Invalid socket authentication token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`[Socket Connected] User: ${socket.user.username} (ID: ${userId}) Socket: ${socket.id}`);

    // Map user to socket ID & join personal user room
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);
    socket.join(`user:${userId}`);

    // Cancel offline disconnect timer if user re-connects
    if (disconnectTimers.has(userId)) {
      clearTimeout(disconnectTimers.get(userId));
      disconnectTimers.delete(userId);
    }

    // Set online status in DB & broadcast presence
    const updatedOnlineUser = await User.findByIdAndUpdate(
      userId,
      { isOnline: true, lastSeenAt: new Date() },
      { returnDocument: 'after' }
    );
    io.emit('presence', {
      userId,
      isOnline: true,
      lastSeenAt: updatedOnlineUser?.lastSeenAt ? updatedOnlineUser.lastSeenAt.toISOString() : new Date().toISOString(),
    });

    // Auto-join user to all their conversation rooms
    try {
      const userConversations = await Conversation.find({ participants: userId }).select('_id');
      userConversations.forEach((conv) => {
        socket.join(`conversation:${conv._id.toString()}`);
      });
    } catch (err) {
      console.error('[Socket Room Join Error]:', err.message);
    }

    // ── EVENT: join:conversation ──
    socket.on('join:conversation', (conversationId) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // ── EVENT: message:send ──
    socket.on('message:send', async (msgData) => {
      try {
        const { conversationId, recipientId, text, attachment, replyTo, tempId, id } = msgData;

        if (!conversationId) return;

        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.some((p) => p.toString() === userId)) {
          return;
        }

        const targetRecipientId = recipientId || conv.participants.find((p) => p.toString() !== userId)?.toString();

        // Block check: Verify neither user has blocked the other in MongoDB Atlas
        if (targetRecipientId) {
          const senderUser = await User.findById(userId).select('blockedUsers');
          const recipientUser = await User.findById(targetRecipientId).select('blockedUsers');

          const isSenderBlocked = senderUser?.blockedUsers?.some((id) => id.toString() === targetRecipientId);
          const isRecipientBlocked = recipientUser?.blockedUsers?.some((id) => id.toString() === userId);

          if (isSenderBlocked || isRecipientBlocked) {
            socket.emit('message:error', {
              conversationId,
              tempId: tempId || id,
              error: 'Message not sent. One of the users in this chat has blocked the other.',
            });
            return;
          }
        }

        // Check if recipient is currently connected (online with active sockets)
        const recipientOnline = targetRecipientId && userSockets.has(targetRecipientId) && userSockets.get(targetRecipientId).size > 0;
        const initialStatus = recipientOnline ? 'delivered' : 'sent';

        // Create & save message in MongoDB
        const newMessage = await Message.create({
          conversationId,
          senderId: userId,
          recipientId: targetRecipientId,
          text: text || '',
          attachment: attachment || null,
          replyTo: replyTo || null,
          status: initialStatus,
          createdAt: new Date(),
        });

        // Update Conversation lastMessage & lastMessageAt
        conv.lastMessage = newMessage._id;
        conv.lastMessageAt = newMessage.createdAt;
        await conv.save();

        const formattedMsg = {
          id: newMessage._id.toString(),
          tempId: tempId || id || null,
          conversationId: newMessage.conversationId.toString(),
          senderId: newMessage.senderId.toString(),
          recipientId: newMessage.recipientId ? newMessage.recipientId.toString() : '',
          text: newMessage.text,
          attachment: newMessage.attachment,
          replyTo: newMessage.replyTo,
          createdAt: newMessage.createdAt.toISOString(),
          status: initialStatus,
        };

        // Broadcast message event to conversation room & both participants' user rooms
        io.to(`conversation:${conversationId}`).emit('message:receive', formattedMsg);
        io.to(`user:${userId}`).emit('message:receive', formattedMsg);
        if (targetRecipientId) {
          io.to(`user:${targetRecipientId}`).emit('message:receive', formattedMsg);
        }
      } catch (err) {
        console.error('[Socket message:send error]:', err.message);
      }
    });

    // ── EVENT: message:read ── Mark messages as read when user opens a conversation
    socket.on('message:read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;

        // Mark all messages in this conversation sent TO this user as 'read'
        const result = await Message.updateMany(
          { conversationId, recipientId: userId, status: { $in: ['sent', 'delivered'] } },
          { $set: { status: 'read' } }
        );

        if (result.modifiedCount > 0) {
          // Notify the sender that their messages have been read
          io.to(`conversation:${conversationId}`).emit('message:status', {
            conversationId,
            readByUserId: userId,
            status: 'read',
          });
        }
      } catch (err) {
        console.error('[Socket message:read error]:', err.message);
      }
    });

    // ── EVENT: typing ──
    socket.on('typing', async ({ conversationId, isTyping = true }) => {
      try {
        if (!conversationId) return;
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        const targetRecipientId = conv.participants.find((p) => p.toString() !== userId)?.toString();
        if (targetRecipientId) {
          const senderUser = await User.findById(userId).select('blockedUsers');
          const recipientUser = await User.findById(targetRecipientId).select('blockedUsers');

          const isSenderBlocked = senderUser?.blockedUsers?.some((id) => id.toString() === targetRecipientId);
          const isRecipientBlocked = recipientUser?.blockedUsers?.some((id) => id.toString() === userId);

          if (isSenderBlocked || isRecipientBlocked) {
            return; // Blocked user — suppress typing indicator
          }
        }

        socket.to(`conversation:${conversationId}`).emit('typing', {
          conversationId,
          userId,
          isTyping: Boolean(isTyping),
        });
      } catch (err) {
        console.error('[Socket typing error]:', err.message);
      }
    });

    // ── PART 4: WEBRTC & CALL SIGNALING EVENTS (ADDITIVE) ──
    socket.on('call:invite', async ({ conversationId, toUserId, callType }) => {
      try {
        if (!conversationId || !toUserId) return;
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;

        const isParticipant = conv.participants.some(
          (p) => (p._id || p).toString() === userId
        );
        if (!isParticipant) return;

        const newCall = await Call.create({
          conversationId,
          callerId: userId,
          calleeId: toUserId,
          callType: callType || 'audio',
          status: 'ringing',
        });

        const payload = {
          callId: newCall._id.toString(),
          conversationId,
          from: {
            id: userId,
            username: socket.user.username,
            avatarUrl: socket.user.avatarUrl || '',
          },
          callType: newCall.callType,
        };

        io.to(`user:${toUserId}`).emit('call:incoming', payload);
        io.to(`conversation:${conversationId}`).emit('call:incoming', payload);
      } catch (err) {
        console.error('[Socket call:invite error]:', err.message);
      }
    });

    socket.on('call:accept', async ({ callId }) => {
      try {
        if (!callId) return;
        const call = await Call.findById(callId);
        if (!call) return;

        call.status = 'accepted';
        call.startedAt = new Date();
        await call.save();

        const callerIdStr = call.callerId.toString();
        io.to(`user:${callerIdStr}`).emit('call:accepted', { callId });
        io.to(`conversation:${call.conversationId.toString()}`).emit('call:accepted', { callId });
      } catch (err) {
        console.error('[Socket call:accept error]:', err.message);
      }
    });

    socket.on('call:decline', async ({ callId }) => {
      try {
        if (!callId) return;
        const call = await Call.findById(callId);
        if (!call) return;

        call.status = 'declined';
        call.endedAt = new Date();
        await call.save();

        const callerIdStr = call.callerId.toString();
        io.to(`user:${callerIdStr}`).emit('call:declined', { callId });

        // Record missed call system message
        await Message.create({
          conversationId: call.conversationId,
          senderId: call.callerId,
          recipientId: call.calleeId,
          text: `Missed ${call.callType} call`,
          status: 'delivered',
        });
      } catch (err) {
        console.error('[Socket call:decline error]:', err.message);
      }
    });

    socket.on('call:cancel', async ({ callId }) => {
      try {
        if (!callId) return;
        const call = await Call.findById(callId);
        if (!call) return;

        call.status = 'cancelled';
        call.endedAt = new Date();
        await call.save();

        const calleeIdStr = call.calleeId.toString();
        io.to(`user:${calleeIdStr}`).emit('call:cancelled', { callId });
      } catch (err) {
        console.error('[Socket call:cancel error]:', err.message);
      }
    });

    socket.on('call:end', async ({ callId }) => {
      try {
        if (!callId) return;
        const call = await Call.findById(callId);
        if (!call || call.status === 'ended') return;

        const now = new Date();
        const start = call.startedAt || now;
        const durationSecs = Math.max(0, Math.floor((now - start) / 1000));

        call.status = 'ended';
        call.endedAt = now;
        call.durationSeconds = durationSecs;
        await call.save();

        const peerIdStr = call.callerId.toString() === userId ? call.calleeId.toString() : call.callerId.toString();
        io.to(`user:${peerIdStr}`).emit('call:ended', { callId, durationSeconds: durationSecs });
        socket.emit('call:ended', { callId, durationSeconds: durationSecs });

        // Format call duration text (e.g., "Audio call · 02:45")
        const mins = Math.floor(durationSecs / 60).toString().padStart(2, '0');
        const secs = (durationSecs % 60).toString().padStart(2, '0');
        const formattedType = call.callType === 'video' ? 'Video call' : 'Audio call';

        await Message.create({
          conversationId: call.conversationId,
          senderId: userId,
          recipientId: peerIdStr,
          text: `${formattedType} · ${mins}:${secs}`,
          status: 'delivered',
        });
      } catch (err) {
        console.error('[Socket call:end error]:', err.message);
      }
    });

    // ── WebRTC SDP & ICE Candidate Relays ──
    socket.on('webrtc:offer', ({ callId, sdp, toUserId }) => {
      if (toUserId && sdp) {
        io.to(`user:${toUserId}`).emit('webrtc:offer', { callId, sdp });
      }
    });

    socket.on('webrtc:answer', ({ callId, sdp, toUserId }) => {
      if (toUserId && sdp) {
        io.to(`user:${toUserId}`).emit('webrtc:answer', { callId, sdp });
      }
    });

    socket.on('webrtc:ice-candidate', ({ callId, candidate, toUserId }) => {
      if (toUserId && candidate) {
        io.to(`user:${toUserId}`).emit('webrtc:ice-candidate', { callId, candidate });
      }
    });

    // ── EVENT: disconnect ──
    socket.on('disconnect', () => {
      console.log(`[Socket Disconnected] Socket: ${socket.id}`);
      const userSocketsSet = userSockets.get(userId);
      if (userSocketsSet) {
        userSocketsSet.delete(socket.id);
        if (userSocketsSet.size === 0) {
          userSockets.delete(userId);

          // Grace period timer before marking user offline
          const timer = setTimeout(async () => {
            try {
              const now = new Date();
              await User.findByIdAndUpdate(userId, { isOnline: false, lastSeenAt: now });
              io.emit('presence', { userId, isOnline: false, lastSeenAt: now.toISOString() });
            } catch (err) {
              console.error('[Socket Disconnect Timer] DB error (non-fatal):', err.message);
            } finally {
              disconnectTimers.delete(userId);
            }
          }, 3000);

          disconnectTimers.set(userId, timer);
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io server not initialized');
  }
  return io;
}

export function isUserOnline(userId) {
  if (!userId) return false;
  const sockets = userSockets.get(userId.toString());
  return Boolean(sockets && sockets.size > 0);
}
