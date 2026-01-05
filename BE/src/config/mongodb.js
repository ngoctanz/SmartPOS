import "dotenv/config";
import mongoose from "mongoose";
const DATABASE_NAME = process.env.DATABASE_NAME;
const DATABASE_URI = process.env.MONGO_DB_URI;

export const CONNECT_DB = async () => {
  try {
    await mongoose.connect(DATABASE_URI, {
      dbName: DATABASE_NAME,
    });
    console.log("Connected to MongoDB with Mongoose");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export const GET_DB = async () => {
  await mongoose.connection.close();
};
