import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload, uploadToCloudinary } from '../config/cloudinary.js';
import { isUserOnline } from '../socket/index.js';

const router = express.Router();

// Helper to sanitize username
const sanitizeUsername = (un) => (un || '').replace(/^@+/, '').trim();

// ── GET /api/users/check-email-phone (Public Pre-Registration Check) ──
router.get('/check-email-phone', async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (email) {
      const emailLower = email.toLowerCase().trim();
      const existingEmail = await User.findOne({ email: emailLower });
      if (existingEmail) {
        return res.json({
          available: false,
          field: 'email',
          error: 'This email address is already registered. Please sign in or use a different email.',
        });
      }
    }

    if (phone && phone.trim().length >= 6) {
      const cleanPhone = phone.trim();
      const existingPhone = await User.findOne({ phone: cleanPhone });
      if (existingPhone) {
        return res.json({
          available: false,
          field: 'phone',
          error: 'This mobile number is already registered. Please use a different number.',
        });
      }
    }

    res.json({ available: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/users/check-username ──
router.get('/check-username', async (req, res) => {
  try {
    const { username, exclude } = req.query;
    const cleanUsername = sanitizeUsername(username);

    if (!cleanUsername || cleanUsername.length < 3) {
      return res.json({ available: false, error: 'Username must be at least 3 characters' });
    }

    const usernameLower = cleanUsername.toLowerCase();
    const existing = await User.findOne({ usernameLower });

    if (!existing) {
      return res.json({ available: true, username: cleanUsername });
    }

    if (exclude === 'me' && req.user && existing._id.toString() === req.user._id.toString()) {
      return res.json({ available: true, username: cleanUsername });
    }

    res.json({ available: false, error: `Username @${cleanUsername} is already taken` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes below
router.use(authenticateToken);

// ── GET /api/users/me ──
router.get('/me', async (req, res) => {
  try {
    res.json({ user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── PATCH /api/users/me ──
router.patch('/me', async (req, res) => {
  try {
    const { fullName, username, bio, phone, links, avatarUrl } = req.body;
    const user = req.user;

    if (username) {
      const cleanUsername = sanitizeUsername(username);
      const usernameLower = cleanUsername.toLowerCase();

      if (usernameLower !== user.usernameLower) {
        const existing = await User.findOne({ usernameLower, _id: { $ne: user._id } });
        if (existing) {
          return res.status(400).json({ error: `Username @${cleanUsername} is already taken` });
        }
        user.username = cleanUsername;
        user.usernameLower = usernameLower;
      }
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (bio !== undefined) user.bio = bio;
    if (phone !== undefined) user.phone = phone;
    if (links !== undefined) user.links = links;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();
    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/users/me/avatar ──
router.post('/me/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload an image file' });
    }

    const avatarUrl = await uploadToCloudinary(req.file.buffer, 'convo_avatars');
    req.user.avatarUrl = avatarUrl;
    await req.user.save();

    res.json({ avatarUrl, user: req.user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Avatar upload failed' });
  }
});

// ── GET /api/users/search?query=xyz ──
router.get('/search', async (req, res) => {
  try {
    const rawQuery = (req.query.query || '').trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    if (!rawQuery) {
      return res.json({ users: [] });
    }

    const cleanQuery = rawQuery.replace(/^@+/, '').trim();
    if (!cleanQuery) {
      return res.json({ users: [] });
    }

    const escapedQuery = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp('^' + escapedQuery, 'i');
    const containsRegex = new RegExp(escapedQuery, 'i');

    const searchCriteria = {
      _id: { $ne: req.user._id },
      $or: [
        { usernameLower: prefixRegex },
        { username: prefixRegex },
        { fullName: prefixRegex },
        { email: prefixRegex },
        { usernameLower: containsRegex },
      ],
    };

    const users = await User.find(searchCriteria)
      .select('username fullName avatarUrl isOnline lastSeenAt email phone bio links')
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      fullName: u.fullName || u.username,
      avatarUrl: u.avatarUrl || '',
      isOnline: isUserOnline(u._id), // Real-time active socket check!
      email: u.email || '',
      phone: u.phone || '',
      bio: u.bio || '',
      links: u.links || [],
    }));

    res.json({ users: formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/users/:id ──
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
