import express from "express";
import {
  getAdminStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/stats", protect, authorize("admin"), getAdminStats);
router.get("/users", protect, authorize("admin"), getAllUsers);
router.put("/users/:id/role", protect, authorize("admin"), updateUserRole);
router.delete("/users/:id", protect, authorize("admin"), deleteUser);

export default router;
