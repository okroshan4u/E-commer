
const express = require("express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Default Route
app.get("/", (req, res) => {
  res.send("Express App is running...");
});

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: './upload/images', // Ensure this directory exists
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage: storage });

// Image Upload Endpoint
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: 0, message: "No file uploaded" });
  }
  res.json({
    success: 1,
    image_url: `https://e-commer-3lbn.onrender.com/images/${req.file.filename}`,
  });
});

// Product Schema
const Product = mongoose.model("Product", {
  id: Number,
  name: String,
  image: String,
  category: String,
  new_price: Number,
  old_price: Number,
  date: { type: Date, default: Date.now },
  available: { type: Boolean, default: true },
});

// Add Product
app.post('/addproduct', async (req, res) => {
  const products = await Product.find({});
  const id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

  const product = new Product({ id, ...req.body });
  await product.save();

  res.json({ success: true, name: req.body.name });
});

// Remove Product
app.post('/removeproduct', async (req, res) => {
  await Product.findOneAndDelete({ id: req.body.id });
  res.json({ success: true, name: req.body.name });
});

// Get All Products
app.get('/allproducts', async (req, res) => {
  const products = await Product.find({});
  res.send(products);
});

// User Schema
const Users = mongoose.model('Users', {
  name: String,
  email: { type: String, unique: true },
  password: String,
  cartData: Object,
  date: { type: Date, default: Date.now },
});

// Signup Endpoint
app.post('/signup', async (req, res) => {
  const existingUser = await Users.findOne({ email: req.body.email });
  if (existingUser) {
    return res.status(400).json({ success: false, errors: "User already exists with this email" });
  }

  const cart = {};
  for (let i = 0; i < 300; i++) cart[i] = 0;

  const user = new Users({
    name: req.body.username,
    email: req.body.email,
    password: req.body.password,
    cartData: cart,
  });

  await user.save();

  const token = jwt.sign({ user: { id: user._id } }, JWT_SECRET);
  res.json({ success: true, token });
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const user = await Users.findOne({ email: req.body.email });
  if (!user) {
    return res.json({ success: false, errors: "Wrong Email ID" });
  }

  if (req.body.password !== user.password) {
    return res.json({ success: false, errors: "Wrong Password" });
  }
  const JWT_SECRET = process.env.JWT_SECRET
  const token = jwt.sign({ user: { id: user._id } }, JWT_SECRET);
  res.json({ success: true, token });
});

// New Collections Endpoint
app.get('/newcollections', async (req, res) => {
  const products = await Product.find({});
  const newcollection = products.slice(-8);
  res.send(newcollection);
});

// Popular in Women
app.get('/popularinwomen', async (req, res) => {
  const products = await Product.find({ category: "women" });
  const popular = products.slice(0, 4);
  res.send(popular);
});

// Middleware: Fetch User
const fetchUser = async (req, res, next) => {
  const token = req.header('auth-token');
  if (!token) {
    return res.status(401).send({ error: "Please authenticate using a valid token" });
  }

  try {
     const JWT_SECRET = process.env.JWT_SECRET
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data.user;
    next();
  } catch (err) {
    return res.status(401).send({ error: "Invalid token" });
  }
};

// Add to Cart
app.post('/addtocart', fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  userData.cartData[req.body.itemId] += 1;
  await Users.findByIdAndUpdate(req.user.id, { cartData: userData.cartData });
  res.send("Added");
});

// Remove from Cart
app.post('/removefromcart', fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  if (userData.cartData[req.body.itemId] > 0) {
    userData.cartData[req.body.itemId] -= 1;
    await Users.findByIdAndUpdate(req.user.id, { cartData: userData.cartData });
  }
  res.send("Removed");
});

// Get Cart
app.post('/getcart', fetchUser, async (req, res) => {
  const userData = await Users.findById(req.user.id);
  res.json(userData.cartData);
});

// Start Server
app.listen(port, () => {
  console.log("Server running on port " + port);
});
