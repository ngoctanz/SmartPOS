import express, { json } from "express";
import { APIs_V1 } from "./routes/v1/index.js";
import "dotenv/config";
import cors from "cors";
import {
  errorHandlingMiddleware,
  notFoundHandler,
} from "./middlewares/errorHandlingMiddlewares.js";
import { CONNECT_DB } from "./config/mongodb.js";

const app = express();
const port = process.env.APP_PORT;
const host = process.env.APP_HOST;

const START_SERVER = () => {
  app.use(cors());
  app.use(express.json());
  app.use("/v1", APIs_V1.Router);

  //404 not found
  app.use(notFoundHandler);
  //xử lí lỗi tập trung
  app.use(errorHandlingMiddleware);

  app.listen(port, host, () => {
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
