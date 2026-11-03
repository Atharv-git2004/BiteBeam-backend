import mongoose from "mongoose";

const dishSchema = new mongoose.Schema(
  {
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please add a dish name"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Please add a price"],
    },
    category: {
      type: String,
      default: "Main Course",
    },
    rating: {
      type: Number,
      default: 4.5,
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=60",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Dish = mongoose.model("Dish", dishSchema);

export default Dish;
