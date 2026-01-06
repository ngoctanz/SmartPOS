import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import "dotenv/config";

const seedUser = async () => {
  try {
    const DATABASE_URI = process.env.MONGO_DB_URI;
    const DATABASE_NAME = process.env.DATABASE_NAME;

    await mongoose.connect(DATABASE_URI, { dbName: DATABASE_NAME });
    console.log("✅ Connected to MongoDB");

    // Check if admin user exists
    const existingUser = await User.findOne({ userName: "admin" });

    if (existingUser) {
      console.log("⚠️  Admin user already exists");
      process.exit(0);
    }

    // Create admin user
    const adminUser = await User.create({
      userName: "admin",
      email: "admin@smartpos.com",
      password: "admin123", // Must match regex: letter + number
      role: "admin",
      isActive: true,
    });

    console.log("✅ Admin user created successfully!");
    console.log("👤 Username: admin");
    console.log("🔑 Password: admin123");
    console.log("📧 Email:", adminUser.email);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding user:", error);
    process.exit(1);
  }
};

seedUser();
