import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please add a restaurant name"],
      trim: true,
    },
    tags: {
      type: [String],
      default: ["Indian", "Fast Food"],
    },
    rating: {
      type: Number,
      default: 4.5,
      min: 1,
      max: 5,
    },
    reviewCount: {
      type: String,
      default: "100+",
    },
    time: {
      type: String,
      default: "25-30 mins",
    },
    priceForTwo: {
      type: String,
      default: "₹350 for two",
    },
    location: {
      type: String,
      required: [true, "Please add a location"],
    },
    isVeg: {
      type: Boolean,
      default: false,
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Restaurant = mongoose.model("Restaurant", restaurantSchema);

export default Restaurant;
