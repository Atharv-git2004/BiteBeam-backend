import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Helper to generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || "bitebeam_super_secret_jwt_key_2026_x89a", {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// @desc    Register a new user (Customer, Seller, Delivery)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    console.log("📥 Register request received:", {
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      phone: req.body.phone,
      hasPassword: !!req.body.password,
    });

    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      console.warn("⚠️  Register: missing required fields");
      return res.status(400).json({ message: "Please provide name, email, and password" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user exists
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      console.warn("⚠️  Register: email already taken —", cleanEmail);
      return res.status(400).json({ message: "An account with this email already exists. Please log in instead." });
    }

    // Validate role — allow user, seller, and delivery roles safely
    const allowedRoles = ["user", "seller", "delivery"];
    const userRole = allowedRoles.includes(role) ? role : "user";

    // Create user (bcrypt hashing happens automatically in User model pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: userRole,
      phone: phone ? phone.trim() : "",
    });

    if (user) {
      const token = generateToken(user._id, user.role);
      console.log(`✅ Register: new user created in MongoDB — ${user.email} | role: ${user.role} | id: ${user._id}`);

      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        token,
      });
    } else {
      return res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("❌ Register Error:", error.name, "|", error.message);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors)
        .map((e) => e.message)
        .join(". ");
      return res.status(400).json({ message: messages });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    return res.status(500).json({ message: error.message || "Server Error during registration" });
  }
};

// @desc    Auth user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check for user and include password field
    const user = await User.findOne({ email: cleanEmail }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id, user.role);

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
      token,
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      if (req.user) {
        return res.json(req.user);
      }
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatar: user.avatar,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Server Error" });
  }
};
