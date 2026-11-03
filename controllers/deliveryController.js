import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import { io } from "../index.js";

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all orders assigned to this delivery partner
// @route   GET /api/delivery/my-deliveries
// @access  Private (delivery)
// ─────────────────────────────────────────────────────────────────────────────
export const getMyDeliveries = async (req, res) => {
  try {
    const orders = await Order.find({ deliveryPartnerId: req.user._id })
      .populate("user", "name email phone")
      .populate("restaurant", "name location phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get all orders that are ready for pickup (unassigned)
// @route   GET /api/delivery/available-orders
// @access  Private (delivery, admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getAvailableOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["ready_for_pickup", "preparing", "confirmed"] },
      deliveryPartnerId: null,
    })
      .populate("user", "name email phone")
      .populate("restaurant", "name location phone")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Get a single order detail (for delivery partner view)
// @route   GET /api/delivery/order/:id
// @access  Private (delivery, admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getDeliveryOrderDetail = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email phone deliveryAddress")
      .populate("restaurant", "name location phone image")
      .populate("deliveryPartnerId", "name phone");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Delivery partner can only see orders assigned to them
    if (
      req.user.role === "delivery" &&
      order.deliveryPartnerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to view this order" });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Accept / self-assign an available order
// @route   PUT /api/delivery/order/:id/accept
// @access  Private (delivery)
// ─────────────────────────────────────────────────────────────────────────────
export const acceptOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.deliveryPartnerId) {
      return res.status(400).json({ message: "Order already assigned to a delivery partner" });
    }

    order.deliveryPartnerId = req.user._id;
    order.deliveryStatus = "assigned";
    await order.save();

    const populated = await Order.findById(order._id)
      .populate("user", "name email phone")
      .populate("restaurant", "name location phone");

    // Notify the customer that a delivery partner has been assigned
    io.to(`order_${order._id}`).emit("order_status_changed", {
      orderId: order._id,
      status: order.status,
      deliveryStatus: "assigned",
      deliveryPartner: {
        _id: req.user._id,
        name: req.user.name,
        phone: req.user.phone,
      },
      message: `🛵 Delivery Partner ${req.user.name} has accepted your order!`,
    });

    // Broadcast to all delivery partners so they can stop their alert bells
    io.to("delivery_partners").emit("order_accepted_by_partner", {
      orderId: order._id,
      acceptedBy: req.user._id,
    });

    // Notify other delivery partners that this order has been accepted
    io.to("delivery_partners").emit("order_claimed", {
      orderId: order._id,
      claimedBy: req.user._id,
    });

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update delivery status (picked_up / out_for_delivery / delivered)
// @route   PUT /api/delivery/order/:id/delivery-status
// @access  Private (delivery, admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { deliveryStatus, estimatedDeliveryTime } = req.body;

    const validStatuses = ["assigned", "picked_up", "out_for_delivery", "delivered"];
    if (!validStatuses.includes(deliveryStatus)) {
      return res.status(400).json({ message: "Invalid delivery status" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Only the assigned delivery partner or admin can update
    if (
      req.user.role === "delivery" &&
      order.deliveryPartnerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    order.deliveryStatus = deliveryStatus;

    // Map delivery status → main order status
    const statusMap = {
      picked_up: "on_the_way",
      out_for_delivery: "on_the_way",
      delivered: "delivered",
    };
    if (statusMap[deliveryStatus]) {
      order.status = statusMap[deliveryStatus];
    }

    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = estimatedDeliveryTime;
      order.estimatedDelivery = estimatedDeliveryTime;
    }

    await order.save();

    // Friendly status messages for real-time notification
    const messageMap = {
      picked_up: "🛵 Your order has been picked up and is on its way!",
      out_for_delivery: "🚀 Your order is out for delivery!",
      delivered: "✅ Your order has been delivered. Enjoy your meal!",
    };

    // Emit real-time notification to customer watching this order
    io.to(`order_${order._id}`).emit("order_status_changed", {
      orderId: order._id,
      status: order.status,
      deliveryStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      message: messageMap[deliveryStatus] || `Order status updated to ${deliveryStatus}`,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Update the delivery partner's live GPS location for an order
// @route   PUT /api/delivery/order/:id/location
// @access  Private (delivery)
// ─────────────────────────────────────────────────────────────────────────────
export const updateLiveLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { currentLatLng: { lat, lng } },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Also broadcast via socket for instant update (REST is a backup persist)
    io.to(`order_${order._id}`).emit("location_updated", {
      lat,
      lng,
      deliveryPartnerId: req.user._id,
    });

    res.json({ success: true, currentLatLng: { lat, lng } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
