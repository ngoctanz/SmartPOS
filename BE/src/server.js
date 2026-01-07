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
const httpServer = createServer(app);
const port = process.env.APP_PORT;
const host = process.env.APP_HOST;

const allowedOrigins = [
  "http://localhost:3000",
  "https://noibo.lanchuyenhangsale.com",
  "https://www.noibo.lanchuyenhangsale.com",
  process.env.CLIENT_URL,
].filter(Boolean);

const START_SERVER = () => {
  app.use(
    cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
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
