import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Configure Multer memory storage — accepts ALL file types for chat attachments
const storage = multer.memoryStorage();

// Avatar-only upload (images only, 10MB)
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// Chat attachment upload (any file type, 25MB)
export const uploadAny = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Upload image to Cloudinary (with resize transform for avatars)
export const uploadToCloudinary = (fileBuffer, folder = 'convo_avatars') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation: [{ width: 400, height: 400, crop: 'limit' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Upload ANY file to Cloudinary (images, videos, audio, docs — no resize transform)
export const uploadFileToCloudinary = (fileBuffer, originalName, mimeType, folder = 'convo_attachments') => {
  return new Promise((resolve, reject) => {
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');
    const isImage = mimeType.startsWith('image/');

    // Cloudinary resource_type: 'image' for images, 'video' for video/audio, 'raw' for docs
    let resourceType = 'raw';
    if (isImage) resourceType = 'image';
    if (isVideo || isAudio) resourceType = 'video';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export default cloudinary;
