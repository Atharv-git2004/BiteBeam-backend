import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Restaurant from "./models/Restaurant.js";
import Dish from "./models/Dish.js";
import Order from "./models/Order.js";

dotenv.config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB Atlas for seeding...");

    // 1. Seed demo users
    const demoUsers = [
      {
        name: "Demo Customer",
        email: "customer@bitebeam.com",
        password: "password123",
        role: "user",
        phone: "+91 9876543210",
      },
      {
        name: "Chef Ammachi",
        email: "seller@bitebeam.com",
        password: "password123",
        role: "seller",
        phone: "+91 9876543211",
      },
      {
        name: "Platform Admin",
        email: "admin@bitebeam.com",
        password: "password123",
        role: "admin",
        phone: "+91 9876543212",
      },
    ];

    let sellerUser = null;
    let customerUser = null;

    for (const u of demoUsers) {
      let existing = await User.findOne({ email: u.email });
      if (!existing) {
        existing = await User.create(u);
        console.log(`Created user: ${u.email} (${u.role})`);
      } else {
        console.log(`User already exists: ${u.email}`);
      }
      if (u.role === "seller") sellerUser = existing;
      if (u.role === "user") customerUser = existing;
    }

    // 2. Seed demo Restaurant if none exists for the seller
    let restaurant = await Restaurant.findOne({ seller: sellerUser._id });
    if (!restaurant) {
      restaurant = await Restaurant.create({
        seller: sellerUser._id,
        name: "Ammachi's Kitchen",
        tags: ["South Indian", "Kerala", "Biryani"],
        rating: 4.8,
        time: "20-25 mins",
        priceForTwo: "₹350 for two",
        location: "Fort Road, Kannur",
        isVeg: false,
        image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&auto=format&fit=crop&q=60",
        featured: true,
        isApproved: true,
      });
      console.log("Created demo Restaurant: Ammachi's Kitchen");
    }

    // 3. Seed demo Dishes
    const existingDishesCount = await Dish.countDocuments({ restaurant: restaurant._id });
    if (existingDishesCount === 0) {
      const dishes = [
        {
          restaurant: restaurant._id,
          seller: sellerUser._id,
          name: "Thalassery Chicken Biryani",
          price: 240,
          category: "Biryani",
          rating: 4.9,
          isVeg: false,
          isBestseller: true,
          description: "Fragrant Kaima rice cooked with tender chicken pieces, fried onions, cashews and Malabar spices.",
          image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=60",
          isAvailable: true,
        },
        {
          restaurant: restaurant._id,
          seller: sellerUser._id,
          name: "Malabar Parotta with Beef Roast",
          price: 190,
          category: "Main Course",
          rating: 4.8,
          isVeg: false,
          isBestseller: true,
          description: "Flaky layered flatbread served with Kerala style spicy beef fry loaded with coconut slivers.",
          image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=60",
          isAvailable: true,
        },
        {
          restaurant: restaurant._id,
          seller: sellerUser._id,
          name: "Paneer Butter Masala",
          price: 180,
          category: "Curry",
          rating: 4.7,
          isVeg: true,
          isBestseller: false,
          description: "Soft cottage cheese cubes simmered in rich buttery tomato cashew gravy.",
          image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=800&auto=format&fit=crop&q=60",
          isAvailable: true,
        },
      ];
      await Dish.insertMany(dishes);
      console.log(`Seeded ${dishes.length} dishes for Ammachi's Kitchen`);
    }

    // 4. Seed demo Order if none
    const existingOrdersCount = await Order.countDocuments();
    if (existingOrdersCount === 0 && customerUser && restaurant) {
      await Order.create({
        user: customerUser._id,
        restaurant: restaurant._id,
        restaurantName: restaurant.name,
        items: [
          { name: "Thalassery Chicken Biryani", price: 240, quantity: 2 },
        ],
        totalAmount: 510,
        status: "confirmed",
        deliveryAddress: "Near Baby Beach, Kannur, Kerala",
        paymentMethod: "UPI",
        estimatedDelivery: "30 mins",
      });
      console.log("Created demo order");
    }

    console.log("✅ Seed completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
};

seedData();
