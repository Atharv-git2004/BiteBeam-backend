import Restaurant from "../models/Restaurant.js";

// @desc    Get all approved restaurants
// @route   GET /api/restaurants
// @access  Public
export const getRestaurants = async (req, res) => {
  try {
    const restaurants = await Restaurant.find({ isApproved: true })
      .populate("seller", "name email")
      .sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
export const getRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "seller",
      "name email"
    );
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get seller's own restaurant
// @route   GET /api/restaurants/my-restaurant
// @access  Private (seller, admin)
export const getMyRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ seller: req.user._id });
    // Return null cleanly if seller has not created a restaurant yet (avoids 404 console errors)
    res.json(restaurant || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update restaurant profile for seller
// @route   POST /api/restaurants
// @access  Private (seller, admin)
export const createRestaurant = async (req, res) => {
  try {
    const exists = await Restaurant.findOne({ seller: req.user._id });
    if (exists) {
      // Seamlessly update existing restaurant
      const updated = await Restaurant.findByIdAndUpdate(
        exists._id,
        { ...req.body, seller: req.user._id },
        { new: true, runValidators: true }
      );
      return res.json(updated);
    }
    const restaurant = await Restaurant.create({
      ...req.body,
      seller: req.user._id,
    });
    res.status(201).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update restaurant
// @route   PUT /api/restaurants/:id
// @access  Private (seller who owns it, admin)
export const updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (
      restaurant.seller.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized to update this restaurant" });
    }
    const updated = await Restaurant.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete restaurant
// @route   DELETE /api/restaurants/:id
// @access  Private (admin only)
export const deleteRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    await restaurant.deleteOne();
    res.json({ message: "Restaurant removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
