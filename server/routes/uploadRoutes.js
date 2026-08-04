import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// All upload routes require authentication
router.use(authenticateToken);

// ── Configure Multer for disk storage ──
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Unique filename: timestamp-randomhex-originalname
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    cb(null, `${uniqueSuffix}-${baseName}${ext}`);
  },
});

const uploadAny = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// ── POST /api/upload ──
// Upload any file (image, video, audio, document) to local server storage
// Returns { url, type, name, size }
router.post('/', uploadAny.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { originalname, mimetype, filename, size } = req.file;

    // Determine file type for the chat attachment
    let type = 'file';
    if (mimetype.startsWith('image/')) type = 'image';
    else if (mimetype.startsWith('video/')) type = 'video';
    else if (mimetype.startsWith('audio/')) type = 'audio';

    // Format size string
    let sizeStr;
    if (size < 1024) sizeStr = `${size} B`;
    else if (size < 1024 * 1024) sizeStr = `${(size / 1024).toFixed(1)} KB`;
    else sizeStr = `${(size / (1024 * 1024)).toFixed(1)} MB`;

    // Build the URL that serves this file
    const serverBase = `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${serverBase}/uploads/${filename}`;

    res.json({
      url: fileUrl,
      type,
      name: originalname,
      size: sizeStr,
    });
  } catch (error) {
    console.error('[Upload Error]:', error.message);
    res.status(500).json({ error: error.message || 'Upload failed' });
  }
});

export default router;
