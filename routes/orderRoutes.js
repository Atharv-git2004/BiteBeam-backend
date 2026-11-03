import express from "express";
import {
  placeOrder,
  getMyOrders,
  getSellerOrders,
  updateOrderStatus,
  getAllOrders,
  trackOrder,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Note: specific routes BEFORE parameterized routes
router.get("/my-orders", protect, authorize("user", "admin"), getMyOrders);
router.get("/seller-orders", protect, authorize("seller", "admin"), getSellerOrders);
router.get("/admin/all", protect, authorize("admin"), getAllOrders);
router.get("/track/:id", protect, authorize("user", "delivery", "admin"), trackOrder);
router.post("/", protect, authorize("user", "admin"), placeOrder);
router.put("/:id/status", protect, authorize("seller", "admin"), updateOrderStatus);

export default router;
