import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import restaurantRoutes from "./routes/restaurantRoutes.js";
import dishRoutes from "./routes/dishRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import deliveryRoutes from "./routes/deliveryRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to Database
connectDB();

const app = express();
const httpServer = createServer(app);

// ── Production Dynamic CORS Setup ──────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  process.env.CLIENT_URL, // Render Frontend URL add cheyyaan (.env file-il)
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman) or matched allowed origins
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(null, true); // production deploy test scalable custom origins allow cheyyan
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve uploaded static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Socket.io Setup ──────────────────────────────────────────────────────────
export const io = new Server(httpServer, {
  cors: {
    origin: "*", // Render deployments integration issue avoidable cross-origin handle
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // Customer or delivery partner tracking a specific order
  socket.on("join_order_room", (orderId) => {
    socket.join(`order_${orderId}`);
    console.log(`📍 Socket ${socket.id} joined room: order_${orderId}`);
  });

  // Delivery partner broadcasting live GPS location
  socket.on("delivery_location_update", ({ orderId, lat, lng, deliveryPartnerId }) => {
    io.to(`order_${orderId}`).emit("location_updated", { lat, lng, deliveryPartnerId });
  });

  // Delivery partner joining personal + global delivery broadcast pool
  socket.on("join_delivery_room", (deliveryPartnerId) => {
    socket.join(`delivery_${deliveryPartnerId}`);
    socket.join("delivery_partners");
    console.log(`🚴 Delivery partner ${deliveryPartnerId} joined delivery_partners room`);
  });

  socket.on("join_delivery_pool", () => {
    socket.join("delivery_partners");
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "BiteBeam API is running 🚀" });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/dishes", dishRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/delivery", deliveryRoutes);
app.use("/api/upload", uploadRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("🔥 Global Error:", err.stack);
  res.status(500).json({ message: err.message || "Internal Server Error" });
});

// Dynamic Port setup for Render deployment
const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.io ready`);
});