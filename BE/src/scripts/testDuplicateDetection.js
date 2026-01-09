/**
 * Test script to verify duplicate barcode detection
 * This helps identify why products might not be imported
 */

import { Product } from "../models/productModel.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const testDuplicateDetection = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test 1: Check for duplicate barcodes in database
    console.log("📊 Test 1: Checking for duplicate barcodes in database...");
    const duplicates = await Product.aggregate([
      {
        $match: {
          barcode: { $exists: true, $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$barcode",
          count: { $sum: 1 },
          products: {
            $push: {
              id: "$_id",
              name: "$name",
              barcode: "$barcode",
            },
          },
        },
      },
      {
        $match: {
          count: { $gt: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    if (duplicates.length > 0) {
      console.log(`⚠️ Found ${duplicates.length} duplicate barcodes in database:`);
      duplicates.slice(0, 10).forEach((dup) => {
        console.log(`\n  Barcode: "${dup._id}" (${dup.count} products)`);
        dup.products.forEach((p) => {
          console.log(`    - ${p.name} (ID: ${p.id})`);
        });
      });
      if (duplicates.length > 10) {
        console.log(`\n  ... and ${duplicates.length - 10} more duplicates`);
      }
    } else {
      console.log("✅ No duplicate barcodes found in database");
    }

    // Test 2: Check products without barcode
    console.log("\n📊 Test 2: Checking products without barcode...");
    const withoutBarcode = await Product.countDocuments({
      $or: [{ barcode: { $exists: false } }, { barcode: null }, { barcode: "" }],
    });
    console.log(`ℹ️ Found ${withoutBarcode} products without barcode`);

    // Test 3: Check total products
    console.log("\n📊 Test 3: Database statistics...");
    const total = await Product.countDocuments();
    const withBarcode = await Product.countDocuments({
      barcode: { $exists: true, $ne: null, $ne: "" },
    });
    console.log(`   Total products: ${total}`);
    console.log(`   With barcode: ${withBarcode}`);
    console.log(`   Without barcode: ${withoutBarcode}`);

    // Test 4: Sample barcodes
    console.log("\n📊 Test 4: Sample barcodes from database...");
    const samples = await Product.find({
      barcode: { $exists: true, $ne: null, $ne: "" },
    })
      .select("name barcode")
      .limit(10)
      .lean();

    if (samples.length > 0) {
      console.log("Sample products with barcodes:");
      samples.forEach((p) => {
        console.log(`  - ${p.name}: "${p.barcode}"`);
      });
    }

    // Test 5: Check barcode index
    console.log("\n📊 Test 5: Checking barcode index...");
    const indexes = await Product.collection.getIndexes();
    const barcodeIndex = Object.keys(indexes).find((key) =>
      key.includes("barcode")
    );

    if (barcodeIndex) {
      console.log(`✅ Barcode index exists: ${barcodeIndex}`);
      console.log(`   Index details:`, indexes[barcodeIndex]);
    } else {
      console.log("⚠️ No barcode index found");
    }

    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
};

// Run tests
testDuplicateDetection();
