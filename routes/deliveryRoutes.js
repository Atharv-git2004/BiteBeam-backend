import express from "express";
import {
  getMyDeliveries,
  getAvailableOrders,
  getDeliveryOrderDetail,
  acceptOrder,
  updateDeliveryStatus,
  updateLiveLocation,
} from "../controllers/deliveryController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// All delivery routes require authentication
router.use(protect);

// Get available (unassigned) orders ready for pickup
router.get("/available-orders", authorize("delivery", "admin"), getAvailableOrders);

// Get orders assigned to the logged-in delivery partner
router.get("/my-deliveries", authorize("delivery", "admin"), getMyDeliveries);

// Get detail of a specific order
router.get("/order/:id", authorize("delivery", "admin"), getDeliveryOrderDetail);

// Accept / self-assign an order
router.put("/order/:id/accept", authorize("delivery"), acceptOrder);

// Update delivery status (picked_up, out_for_delivery, delivered)
router.put("/order/:id/delivery-status", authorize("delivery", "admin"), updateDeliveryStatus);

// Update live GPS location
router.put("/order/:id/location", authorize("delivery", "admin"), updateLiveLocation);

export default router;
