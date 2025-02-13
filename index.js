require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Models
const User = require("./models/users.model");
const Product = require("./models/products.model");
const Order = require("./models/orders.model");
const Blog = require("./models/blogPost.model");
const Contact = require("./models/contactUS.model");
const Admin = require("./models/admin.model");

const { initializeDatabase } = require("./db/db.connect");
const app = express();
const PORT = 9000;

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

//Middleware
app.use(cors(corsOptions));
app.use(express.json());

initializeDatabase();

app.get("/", (req, res) => {
  res.send("Cycle Wala Developed By Avinash.");
});

// Fetch all blogs
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find();
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/blogs", async (req, res) => {
  try {
    const blog = new Blog(req.body);
    await blog.save();
    res.status(201).json({ message: "Blog Posted successfully!" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Contact Routes
app.post("/contacts", async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: "Form Submitted Successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Error submitting form." });
  }
});

// ===============================
// USER AUTHENTICATION MIDDLEWARE
// ===============================

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(404).json({ error: "User not found" });
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// ===============================
// ADMIN AUTHENTICATION MIDDLEWARE
// ===============================
const authenticateAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized - No Token Provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(403).json({ error: "Access denied - Admin not found" });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply the middleware to the user routes
app.use("/users", authenticate);

// ===============================
// ADMIN AUTH ROUTES
// ===============================
app.post("/admin/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ email, password: hashedPassword });
    await newAdmin.save();

    const token = jwt.sign(
      { adminId: newAdmin._id, role: "admin" },
      process.env.JWT_SECRET
    );
    res
      .status(201)
      .json({ admin: { email: newAdmin.email, id: newAdmin._id }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { adminId: admin._id, role: "admin" },
      process.env.JWT_SECRET
    );
    res.json({ admin: { email: admin.email, id: admin._id }, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// PROTECTED ADMIN ROUTES
// ===============================
app.use("/admin", authenticateAdmin);

// Fetch all orders for admin
app.get("/admin/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("userId", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all contact messages
app.get("/admin/contacts", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Order Status (Admin)
app.put("/admin/orders/:orderId", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Routes
app.get("/users/me", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/users/me", async (req, res) => {
  try {
    const { name, email, phone, profilePicture } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/users/me/profile-picture", async (req, res) => {
  try {
    const { profilePicture } = req.body;
    const user = await User.findById(req.user._id);
    user.profilePicture = profilePicture;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Address Routes
app.post("/users/me/addresses", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.push(req.body);
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//updating an address
app.put("/users/me/addresses/:addressId", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const addressId = req.params.addressId;

    const addressToUpdate = user.addresses.id(addressId);
    if (!addressToUpdate) {
      return res.status(404).json({ error: "Address not found" });
    }

    const {
      fullName,
      phone,
      pincode,
      addressLine,
      city,
      state,
      country,
      isDefault,
    } = req.body;
    if (fullName) addressToUpdate.fullName = fullName;
    if (phone) addressToUpdate.phone = phone;
    if (pincode) addressToUpdate.pincode = pincode;
    if (addressLine) addressToUpdate.addressLine = addressLine;
    if (city) addressToUpdate.city = city;
    if (state) addressToUpdate.state = state;
    if (country) addressToUpdate.country = country;
    if (isDefault !== undefined) addressToUpdate.isDefault = isDefault;

    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/users/me/addresses/:addressId", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.addressId
    );
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/users/me/addresses/:addressId/default", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === req.params.addressId;
    });
    await user.save();
    res.json(user.addresses);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Product Routes
app.get("/products", async (req, res) => {
  try {
    const products = await Product.find().populate("reviews");
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews");
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/products/search", async (req, res) => {
  try {
    const {
      search,
      type,
      brand,
      model,
      year,
      minPrice,
      maxPrice,
      color,
      condition,
      tags,
    } = req.query;

    const query = {};

    if (type) query.type = type;
    if (brand) query.brand = brand;
    if (model) query.model = model;
    if (year) query.year = Number(year);
    if (color) query.color = color;
    if (condition) query.condition = condition;

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (tags) {
      query.tags = { $in: tags.split(",") };
    }

    let products = [];

    if (search) {
      products = await Product.find({
        $text: { $search: search },
        ...query,
      })
        .sort({ score: { $meta: "textScore" } })
        .limit(50);

      if (products.length === 0) {
        const searchWords = search.split(" ").join("|");
        products = await Product.find({
          $or: [
            { name: { $regex: searchWords, $options: "i" } },
            { brand: { $regex: searchWords, $options: "i" } },
            { model: { $regex: searchWords, $options: "i" } },
            { description: { $regex: searchWords, $options: "i" } },
            { categories: { $regex: searchWords, $options: "i" } },
            { tags: { $regex: searchWords, $options: "i" } },
          ],
          ...query,
        }).limit(50);
      }
    } else {
      products = await Product.find(query).limit(50);
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/products/filter", async (req, res) => {
  try {
    const { minPrice, maxPrice, category, brand } = req.query;
    const filter = {};
    if (minPrice) filter.price = { $gte: minPrice };
    if (maxPrice) filter.price = { ...filter.price, $lte: maxPrice };
    if (category) filter.categories = category;
    if (brand) filter.brand = brand;

    const products = await Product.find(filter);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/cart", authenticate);
// Cart Routes
app.get("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.productId");
    res.json(user.cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/cart", async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user._id);

    const existingItem = user.cart.find(
      (item) => item.productId.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ productId, quantity });
    }

    await user.save();
    res.json(user.cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put("/cart/:itemId", async (req, res) => {
  try {
    const { quantity } = req.body;
    const user = await User.findById(req.user._id);
    const cartItem = user.cart.id(req.params.itemId);
    cartItem.quantity = quantity;
    await user.save();
    res.json(user.cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/cart/:itemId", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = user.cart.filter(
      (item) => item._id.toString() !== req.params.itemId
    );
    await user.save();
    res.json(user.cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.cart = [];
    await user.save();
    res.json(user.cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Wishlist Routes
app.use("/wishlist", authenticate);
app.get("/wishlist", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(req.user._id).populate("wishlist");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user.wishlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/wishlist", async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.wishlist.includes(productId)) {
      user.wishlist.push(productId);
      await user.save();
    }

    res.json(user.wishlist);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/wishlist/:productId", async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const index = user.wishlist.indexOf(productId);
    if (index === -1) {
      return res.status(404).json({ message: "Item not found in wishlist" });
    }

    user.wishlist.splice(index, 1);
    await user.save();

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.use("/orders", authenticate);

app.post("/orders", async (req, res) => {
  try {
    const { items, totalAmount, address, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: "No products in order" });
    }

    const order = new Order({
      userId: req.user._id,
      items,
      totalAmount,
      address,
      paymentMethod,
      status: "Pending",
    });

    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all orders for a user
app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id }).populate(
      "items.productId"
    );
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific order by ID
app.get("/orders/:orderId", async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user._id,
    }).populate("items.productId");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel an order
app.delete("/orders/:orderId", async (req, res) => {
  try {
    const order = await Order.findOneAndDelete({
      _id: req.params.orderId,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/orders/:orderId/cancel", authenticate, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status === "Cancelled") {
      return res.status(400).json({ error: "Order is already cancelled" });
    }

    if (order.status !== "Pending") {
      return res.status(400).json({ error: "Order cannot be cancelled" });
    }

    order.status = "Cancelled";
    await order.save();

    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Rating Routes
app.post("/products/:id/ratings", authenticate, async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || !review) {
      return res.status(400).json({ error: "Rating and review are required." });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    product.reviews.push({ rating, review, reviewerName: req.user.name });
    await product.save();

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/products/:id/ratings", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    res.json(product.reviews);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
