const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middleware/authMiddleware');

// ── Allowed file types and size cap ──────────────────────────────────────────
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf', 'docx', 'xlsx', 'xls', 'doc', 'csv', 'txt', 'ppt', 'pptx'];
const MAX_FILE_SIZE_MB   = 20; 
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// ── Use Memory Storage for maximum flexibility with different file types ─────
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(
        new Error(`File type ".${ext}" is not allowed. Accepted types: ${ALLOWED_EXTENSIONS.join(', ')}`),
        false
      );
    }
    cb(null, true);
  },
});

// ── POST /api/upload  (protected) ────────────────────────────────────────────
router.post('/', protect, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file provided for transmission' });
  }

  const originalName = req.file.originalname;
  const ext = originalName.split('.').pop().toLowerCase();
  
  // ── FIX: Determine if file should be treated as 'raw' (for Excel, Docs, etc.) ─
  const isRaw = ['xlsx', 'xls', 'docx', 'doc', 'csv', 'txt', 'ppt', 'pptx'].includes(ext);
  
  // ── FIX: Manually stream to Cloudinary ─────────────────────────────────────
  // We MUST preserve the extension in the public_id for 'raw' files to be correctly served.
  const fileNameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')).replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const publicId = `${Date.now()}-${fileNameWithoutExt}.${ext}`;

  const uploadStream = cloudinary.uploader.upload_stream(
    {
      folder: 'crm-uploads',
      resource_type: isRaw ? 'raw' : 'auto',
      public_id: publicId,
    },
    (error, result) => {
      if (error) {
        console.error('Cloudinary Stream Error:', error);
        return res.status(500).json({ message: 'Cloud transmission failed', details: error.message });
      }
      res.json({ secure_url: result.secure_url });
    }
  );

  // Send the buffer to Cloudinary
  uploadStream.end(req.file.buffer);
});

// ── Multer / validation error handler ────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
      });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
});

module.exports = router;
