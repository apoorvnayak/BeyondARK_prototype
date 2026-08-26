const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { cloudinary, hasCloudinaryKeys } = require("../config/cloudinary");

let storage;

if (hasCloudinaryKeys) {
  const { CloudinaryStorage } = require("multer-storage-cloudinary");
  storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
      folder: "beyondark",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
    }),
  });
} else {
  const uploadDir = path.join(__dirname, "..", "public", "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = /jpeg|jpg|png|webp/.test(file.mimetype);
    cb(ok ? null : new Error("Only image files (jpg, png, webp) are allowed"), ok);
  },
});

// Helper to read back the URL of an uploaded file consistently,
// whether it landed on Cloudinary (file.path is the secure_url) or
// on local disk (we build a relative /uploads/xyz.jpg URL).
function fileUrl(file) {
  if (!file) return "";
  return hasCloudinaryKeys ? file.path : `/uploads/${file.filename}`;
}

module.exports = { upload, fileUrl };
