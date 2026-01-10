// MongoDB Initialization Script for SmartPOS
// This script creates the database and user

// Switch to SmartPOS database
db = db.getSiblingDB("SmartPOS");

// Create admin user with full permissions
db.createUser({
  user: "admin",
  pwd: "admin123",
  roles: [
    {
      role: "dbOwner",
      db: "SmartPOS",
    },
  ],
});

print("✅ SmartPOS database initialized successfully!");
print("👤 User: admin");
print("🔑 Password: admin123");
