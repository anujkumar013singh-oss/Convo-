import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || '5e7fA9cK2LmQ8xVn4PzR1dHs7WbN6TyF0gJq3XuM9EaLc8Ki2VoY5rDp1ZnBt4Hw';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'Qm8Yx2Jv7NcP5Ls9DaE4HtRw1FgK6UzB3iXp0MnV7CrSa2Wq9ZdTf5Hy8LjNe4Ak';

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_ACCESS_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};

// Express REST Middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found or deleted' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

// Socket.IO Handshake Auth Middleware
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
};
