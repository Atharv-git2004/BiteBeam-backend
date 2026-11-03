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

    // Notify other delivery partners that this order has been claimed
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
//          Also syncs main order.status so customer tracking page is accurate
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

    if (
      req.user.role === "delivery" &&
      order.deliveryPartnerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    order.deliveryStatus = deliveryStatus;

    // ── Map deliveryStatus → main order status (all values now in schema enum)
    const statusMap = {
      assigned:         "confirmed",
      picked_up:        "picked_up",
      out_for_delivery: "out_for_delivery",
      delivered:        "delivered",
    };
    if (statusMap[deliveryStatus]) {
      order.status = statusMap[deliveryStatus];
    }

    if (estimatedDeliveryTime) {
      order.estimatedDeliveryTime = estimatedDeliveryTime;
      order.estimatedDelivery = estimatedDeliveryTime;
    }

    if (deliveryStatus === "delivered") {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Customer-friendly messages
    const messageMap = {
      picked_up:        "🛵 Your order has been picked up and is on its way!",
      out_for_delivery: "🚀 Your order is out for delivery — almost there!",
      delivered:        "✅ Your order has been delivered. Enjoy your meal!",
    };

    // Emit real-time update to customer watching this order
    io.to(`order_${order._id}`).emit("order_status_changed", {
      orderId: order._id,
      status: order.status,
      deliveryStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      message: messageMap[deliveryStatus] || `Status updated to ${deliveryStatus}`,
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @desc    Confirm payment collection after delivery
//          Records payment method (UPI QR or Cash) and marks order as paid
// @route   PUT /api/delivery/order/:id/collect-payment
// @access  Private (delivery, admin)
// ─────────────────────────────────────────────────────────────────────────────
export const collectPayment = async (req, res) => {
  try {
    const { paymentMethod, paymentCollectedBy } = req.body;
    // paymentMethod: "UPI QR" | "Cash on Delivery"
    // paymentCollectedBy: "customer" (online) | "delivery_partner" (cash)

    const validMethods = ["UPI QR", "Cash on Delivery", "Online UPI", "Online Payment"];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (
      req.user.role === "delivery" &&
      order.deliveryPartnerId?.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Record payment details
    order.paymentMethod = paymentMethod;
    order.paymentStatus = "paid";
    order.paymentCollectedBy = paymentCollectedBy || "delivery_partner";
    order.paymentCompletedAt = new Date();

    // Ensure order is marked delivered
    order.deliveryStatus = "delivered";
    order.status = "delivered";
    if (!order.deliveredAt) order.deliveredAt = new Date();

    await order.save();

    // Notify customer of payment + delivery completion
    io.to(`order_${order._id}`).emit("order_status_changed", {
      orderId: order._id,
      status: "delivered",
      deliveryStatus: "delivered",
      paymentStatus: "paid",
      paymentMethod,
      message: `✅ Payment ${paymentMethod === "Cash on Delivery" ? "collected in cash" : "confirmed via UPI"}. Order delivered!`,
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
