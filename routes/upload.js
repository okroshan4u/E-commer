// routes/upload.js
const express = require('express');
const router = express.Router();
const upload = require('../middleware/multer'); // your multer file
const cloudinary = require('../utils/cloudinary'); // your Cloudinary config
const streamifier = require('streamifier');

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const result = await new Promise((resolve, reject) => {
      let stream = cloudinary.uploader.upload_stream((error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      });
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload failed:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
