import express from "express";
import {
  getRestaurants,
  getRestaurant,
  getMyRestaurant,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../controllers/restaurantController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getRestaurants);
router.get("/my-restaurant", protect, authorize("seller", "admin"), getMyRestaurant);
router.get("/:id", getRestaurant);
router.post("/", protect, authorize("seller", "admin"), createRestaurant);
router.put("/:id", protect, authorize("seller", "admin"), updateRestaurant);
router.delete("/:id", protect, authorize("admin"), deleteRestaurant);

export default router;
