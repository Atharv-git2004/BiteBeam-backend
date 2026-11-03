import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Protect routes — Verify JWT Token
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header (Bearer <token>)
      token = req.headers.authorization.split(" ")[1];

      // Check if demo token from frontend demo login
      if (token && token.startsWith("demo_jwt_token_")) {
        const role = token.replace("demo_jwt_token_", "");
        const normalizedRole = role === "customer" ? "user" : role;
        let user = await User.findOne({ role: normalizedRole });
        if (!user) {
          user = await User.findOne({ email: `${role}@bitebeam.com` });
        }
        if (!user) {
          const idSuffix =
            normalizedRole === "admin" ? "1" :
            normalizedRole === "seller" ? "2" :
            normalizedRole === "delivery" ? "4" : "3";
          req.user = {
            _id: `6500000000000000000000${idSuffix.padStart(2, "0")}`,
            name: `Demo ${role}`,
            email: `${role}@bitebeam.com`,
            role: normalizedRole,
          };
          return next();
        }
        req.user = user;
        return next();
      }

      // Verify real JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "bitebeam_super_secret_jwt_key_2026_x89a");

      // Get user from token payload (excluding password)
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token provided" });
  }
};

// Grant access to specific roles (e.g. authorize('seller', 'admin'))
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role '${req.user.role}' is forbidden from accessing this route`,
      });
    }

    next();
  };
};
