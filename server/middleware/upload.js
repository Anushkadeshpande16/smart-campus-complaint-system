const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { HttpError } = require('../utils/helpers');

// Local-disk storage (development-friendly). Swap `storage` for a Cloudinary/S3 engine in production.
const dir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(dir, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: dir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) return cb(new HttpError(400, 'Only JPG, PNG or WebP images are allowed'));
    cb(null, true);
  },
});

/** Optional single image upload; JSON requests pass straight through. */
const uploadSingle = (field) => (req, res, next) =>
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(400, 'Image must be 5 MB or smaller'));
    next(err instanceof HttpError ? err : new HttpError(400, err.message));
  });

module.exports = { uploadSingle };
