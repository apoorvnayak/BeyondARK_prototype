const cloudinary = require("cloudinary").v2;

const hasCloudinaryKeys =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryKeys) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("[cloudinary] configured - remote image storage active");
} else {
  console.log(
    "[cloudinary] no keys found in .env - falling back to local disk storage (public/uploads)"
  );
}

module.exports = { cloudinary, hasCloudinaryKeys };
