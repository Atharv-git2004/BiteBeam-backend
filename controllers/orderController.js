import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { io } from "../index.js";

// @desc    Place a new order (customer)
// @route   POST /api/orders
// @access  Private (user)
export const placeOrder = async (req, res) => {
  try {
    const { restaurantId, restaurantName, items, totalAmount, deliveryAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    let actualRestaurant = null;
    if (restaurantId) {
      try {
        actualRestaurant = await Restaurant.findById(restaurantId);
      } catch (e) {
        // invalid objectId string, fallback
      }
    }

    const order = await Order.create({
      user: req.user._id,
      restaurant: actualRestaurant?._id || (restaurantId && restaurantId.length === 24 ? restaurantId : null),
      restaurantName: actualRestaurant?.name || restaurantName || "BiteBeam Partner Restaurant",
      items,
      totalAmount,
      deliveryAddress: deliveryAddress || "Kannur, Kerala",
      paymentMethod: paymentMethod || "Online Payment",
      status: "confirmed",
      deliveryStatus: "unassigned",
    });

    // Populate user and restaurant info for broadcast
    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("restaurant", "name location phone image");

    // Real-time broadcast: notify all online delivery partners about this new order
    const broadcastPayload = {
      orderId: order._id,
      _id: order._id,
      restaurantName: populatedOrder.restaurantName,
      restaurantLocation: populatedOrder.restaurant?.location || actualRestaurant?.location || "Fort Road, Kannur, Kerala",
      restaurantPhone: populatedOrder.restaurant?.phone || "",
      deliveryAddress: order.deliveryAddress,
      customerName: req.user.name,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      createdAt: order.createdAt,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      message: `🔔 New delivery order from ${populatedOrder.restaurantName}!`,
    };

    io.to("delivery_partners").emit("new_delivery_order", broadcastPayload);
    // Also broadcast to root so any active delivery screen picks it up
    io.emit("new_delivery_order", broadcastPayload);

    res.status(201).json(populatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user's orders
// @route   GET /api/orders/my-orders
// @access  Private (user)
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders for seller's restaurant
// @route   GET /api/orders/seller-orders
// @access  Private (seller, admin)
export const getSellerOrders = async (req, res) => {
  try {
    // Find seller's restaurant
    const restaurant = await Restaurant.findOne({ seller: req.user._id });
    if (!restaurant && req.user.role !== "admin") {
      // Cleanly return empty list without throwing 404
      return res.json([]);
    }

    const query = restaurant
      ? { restaurant: restaurant._id }
      : {};

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status (seller / admin)
// @route   PUT /api/orders/:id/status
// @access  Private (seller, admin)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["confirmed", "preparing", "on_the_way", "delivered", "cancelled"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    // Broadcast status change to customer tracking this order
    io.to(`order_${order._id}`).emit("order_status_changed", {
      orderId: order._id,
      status: order.status,
      deliveryStatus: order.deliveryStatus,
      message: `Order status is now: ${status.replace(/_/g, " ").toUpperCase()}`,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders/admin/all
// @access  Private (admin)
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single order for tracking (customer view)
// @route   GET /api/orders/track/:id
// @access  Private (user, delivery, admin)
export const trackOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name phone")
      .populate("restaurant", "name location phone image")
      .populate("deliveryPartnerId", "name phone");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only the owner of the order, assigned delivery partner, or admin can track
    const isOwner = order.user?._id?.toString() === req.user._id.toString();
    const isDelivery = order.deliveryPartnerId?._id?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isDelivery && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to track this order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
