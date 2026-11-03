import express from "express";
import {
  getAllDishes,
  getDishesByRestaurant,
  getMyDishes,
  createDish,
  updateDish,
  deleteDish,
} from "../controllers/dishController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes for fetching dishes (Customer UI)
router.get("/", getAllDishes);
router.get("/restaurant/:restaurantId", getDishesByRestaurant);

// Protected routes for Sellers and Admins
router.get("/my-dishes", protect, authorize("seller", "admin"), getMyDishes);
router.post("/", protect, authorize("seller", "admin"), createDish);
router.put("/:id", protect, authorize("seller", "admin"), updateDish);
router.delete("/:id", protect, authorize("seller", "admin"), deleteDish);

export default router;
