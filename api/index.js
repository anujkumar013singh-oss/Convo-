import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from '../server/config/db.js';
import authRoutes from '../server/routes/authRoutes.js';
import userRoutes from '../server/routes/userRoutes.js';
import conversationRoutes from '../server/routes/conversationRoutes.js';
import uploadRoutes from '../server/routes/uploadRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. Global CORS & OPTIONS preflight handler (MUST be first)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Body Parsers (MUST be before routes & DB middleware)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 3. Health & root test endpoints (Instant response, no DB block)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'CONVO Real-Time Messaging API',
    status: 'online',
    version: '1.0.0',
  });
});

// 4. DB Connection Middleware for API routes
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Serverless Error]:', err.message);
    res.status(500).json({
      error: `MongoDB Atlas Connection Error: ${err.message}. Please verify MONGODB_URI in Vercel Environment Variables.`,
    });
  }
});

// 5. REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);

// 6. Global Error Handler for Vercel Serverless Function
app.use((err, req, res, next) => {
  console.error('[API Server Error]:', err);
  const message = typeof err === 'string' ? err : err.message || 'Internal Server Error';
  res.status(err.status || 500).json({ error: message });
});

export default app;
