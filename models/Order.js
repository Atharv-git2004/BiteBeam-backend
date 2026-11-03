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
    status: {
      type: String,
      enum: ["confirmed", "preparing", "ready_for_pickup", "picked_up", "out_for_delivery", "delivered", "cancelled"],
      default: "confirmed",
    },
    deliveryAddress: {
      type: String,
      default: "Kannur, Kerala, India",
    },
    paymentMethod: {
      type: String,
      default: "Online Payment",
    },
    estimatedDelivery: {
      type: String,
      default: "30-40 mins",
    },
    // ── Delivery Partner fields ────────────────────────────────────────────────
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
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model("Order", orderSchema);

export default Order;
