import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  dish: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dish",
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 1 },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
    },
    restaurantName: {
      type: String,
      default: "BiteBeam Partner",
    },
    items: [orderItemSchema],
    totalAmount: {
      type: Number,
      required: true,
    },

    // ── Order Status — includes ALL states used by frontend + backend ──────
    status: {
      type: String,
      enum: [
        "confirmed",
        "preparing",
        "ready_for_pickup",
        "picked_up",
        "out_for_delivery",
        "on_the_way",      // alias used by some frontend views
        "delivered",
        "cancelled",
      ],
      default: "confirmed",
    },

    deliveryAddress: {
      type: String,
      default: "Kannur, Kerala, India",
    },
    deliveryLat: { type: Number, default: null },
    deliveryLng: { type: Number, default: null },

    // ── Payment ───────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ["Online UPI", "Cash on Delivery", "Online Payment", "UPI QR"],
      default: "Online Payment",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentCollectedBy: {
      type: String,
      enum: ["customer", "delivery_partner", ""],
      default: "",
    },
    paymentCompletedAt: {
      type: Date,
      default: null,
    },

    estimatedDelivery: {
      type: String,
      default: "30-40 mins",
    },

    // ── Delivery Partner fields ────────────────────────────────────────────
    deliveryPartnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deliveryStatus: {
      type: String,
      enum: ["unassigned", "assigned", "picked_up", "out_for_delivery", "delivered"],
      default: "unassigned",
    },
    estimatedDeliveryTime: {
      type: String,
      default: "",
    },
    currentLatLng: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
