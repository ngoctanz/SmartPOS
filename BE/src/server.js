import express, { json } from "express";
import { APIs_V1 } from "./routes/v1/index.js";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import {
  errorHandlingMiddleware,
  notFoundHandler,
} from "./middlewares/errorHandlingMiddlewares.js";
import { CONNECT_DB } from "./config/mongodb.js";
import { socketService } from "./services/socketService.js";

const app = express();

// Trust proxy for Render load balancer (Fixes express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR)
app.set("trust proxy", 1);

const httpServer = createServer(app);
const port = process.env.APP_PORT;
const host = process.env.APP_HOST;

const START_SERVER = () => {
  app.use(
    cors({
      origin: function (origin, callback) {
        // Lấy client URL từ env và bỏ dấu / ở cuối nếu có
        const clientUrl = process.env.CLIENT_URL?.replace(/\/$/, "");
        
        const allowedOrigins = [
          "http://localhost:3000",
          clientUrl
        ].filter(Boolean);

        // Cho phép không có origin (ví dụ: postman, curl)
        if (!origin) return callback(null, true);

        // Nới lỏng CORS: Cho phép nếu origin match với config, 
        // HOẶC nếu đây là vercel domain (để hỗ trợ deploy demo dễ dàng)
        if (
          allowedOrigins.some((o) => origin.startsWith(o) || o.startsWith(origin)) || 
          origin.includes("vercel.app")
        ) {
          callback(null, true); // Chấp nhận
        } else {
          // Trả về false thay vì throw Error để tránh lỗi HTTP 500
          callback(null, false);
        }
      },
      credentials: true, // Allow cookies
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );
  app.use(express.json());
  app.use(cookieParser()); // Parse cookies
  app.use("/v1", APIs_V1.Router);

  //404 not found
  app.use(notFoundHandler);
  //xử lí lỗi tập trung
  app.use(errorHandlingMiddleware);

  // Initialize WebSocket server
  socketService.initializeSocket(httpServer);

  // Set timeout for long-running operations (e.g., large imports)
  httpServer.timeout = 600000; // 10 minutes

  httpServer.listen(port, host, () => {
    console.log(`Example app listening on http://${host}:${port}`);
  });
};
CONNECT_DB()
  .then(() => console.log("Database connected!"))
  .then(() => START_SERVER())
  .catch((error) => {
    console.log(error);
    process.exit(0);
  });
