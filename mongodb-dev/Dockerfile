# MongoDB Dockerfile for SmartPOS Development
FROM mongo:7.0

# Set environment variables
ENV MONGO_INITDB_ROOT_USERNAME=admin
ENV MONGO_INITDB_ROOT_PASSWORD=SmartPOS_Admin_2026
ENV MONGO_INITDB_DATABASE=SmartPOS

# Copy initialization script
COPY init-mongo.js /docker-entrypoint-initdb.d/

# Expose MongoDB port
EXPOSE 27017

# Start MongoDB with authentication
CMD ["mongod", "--auth"]
