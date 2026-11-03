import Dish from "../models/Dish.js";
import Restaurant from "../models/Restaurant.js";

// @desc    Get all active dishes (queries MongoDB with optional category, search, restaurant filter)
// @route   GET /api/dishes
// @access  Public
export const getAllDishes = async (req, res) => {
  try {
    const { category, restaurantId, search } = req.query;

    // Filter for active dishes
    const filter = { isAvailable: { $ne: false } };

    if (category && category.toLowerCase() !== "all") {
      filter.category = { $regex: new RegExp(`^${category}$`, "i") };
    }
    if (restaurantId) {
      filter.restaurant = restaurantId;
    }
    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const dishes = await Dish.find(filter)
      .populate("restaurant", "name location time rating image priceForTwo tags isApproved")
      .populate("seller", "name email")
      .sort({ createdAt: -1 });

    res.json(dishes);
  } catch (error) {
    console.error("Error fetching dishes:", error);
    res.status(500).json({ message: error.message || "Failed to fetch dishes" });
  }
};

// @desc    Get dishes by restaurant
// @route   GET /api/dishes/restaurant/:restaurantId
// @access  Public
export const getDishesByRestaurant = async (req, res) => {
  try {
    const dishes = await Dish.find({
      restaurant: req.params.restaurantId,
      isAvailable: { $ne: false },
    })
      .populate("restaurant", "name location rating time image")
      .sort({ createdAt: -1 });

    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get seller's own dishes
// @route   GET /api/dishes/my-dishes
// @access  Private (seller, admin)
export const getMyDishes = async (req, res) => {
  try {
    const dishes = await Dish.find({ seller: req.user._id }).populate(
      "restaurant",
      "name"
    );
    res.json(dishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a dish
// @route   POST /api/dishes
// @access  Private (seller, admin)
export const createDish = async (req, res) => {
  try {
    const { restaurantId, ...rest } = req.body;

    // Verify seller owns the restaurant
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (
      restaurant.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to add dishes to this restaurant" });
    }

    const dish = await Dish.create({
      ...rest,
      restaurant: restaurantId,
      seller: req.user._id,
    });
    res.status(201).json(dish);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a dish
// @route   PUT /api/dishes/:id
// @access  Private (seller who owns it, admin)
export const updateDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }
    if (
      dish.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to update this dish" });
    }
    const updated = await Dish.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a dish
// @route   DELETE /api/dishes/:id
// @access  Private (seller who owns it, admin)
export const deleteDish = async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) {
      return res.status(404).json({ message: "Dish not found" });
    }
    if (
      dish.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to delete this dish" });
    }
    await dish.deleteOne();
    res.json({ message: "Dish removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
