const multer = require('multer');

// Use memory storage instead of disk stora
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
