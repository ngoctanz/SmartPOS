/**
 * Test script to verify export routes are working
 * Run: node test-export-routes.js
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000/api/v1";
const TOKEN = "YOUR_TOKEN_HERE"; // Replace with actual token

const testRoutes = async () => {
  console.log("🧪 Testing Export Routes\n");

  // Test 1: Check if export endpoint exists
  console.log("1. Testing GET /export/products");
  try {
    const response = await fetch(`${BASE_URL}/export/products`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get("content-type")}`);
    
    if (response.status === 401) {
      console.log("   ⚠️ Unauthorized - Need valid token");
    } else if (response.status === 404) {
      console.log("   ❌ Route not found - Backend may not be running or route not registered");
    } else if (response.status === 200) {
      console.log("   ✅ Route working!");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log("   💡 Make sure backend is running on port 5000");
  }

  // Test 2: Check if template endpoint exists
  console.log("\n2. Testing GET /export/template");
  try {
    const response = await fetch(`${BASE_URL}/export/template`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log("   ⚠️ Unauthorized - Need valid token");
    } else if (response.status === 404) {
      console.log("   ❌ Route not found");
    } else if (response.status === 200) {
      console.log("   ✅ Route working!");
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test 3: Check server status
  console.log("\n3. Testing GET /status");
  try {
    const response = await fetch(`${BASE_URL}/status`);
    const data = await response.json();
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Message: ${data.message}`);
    console.log("   ✅ Backend is running!");
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    console.log("   💡 Backend is not running. Start it with: npm run dev");
  }

  console.log("\n📝 Notes:");
  console.log("   - If you see 401 errors, the routes exist but need authentication");
  console.log("   - If you see 404 errors, check if backend restarted after adding routes");
  console.log("   - Replace YOUR_TOKEN_HERE with actual JWT token to test fully");
};

testRoutes();
