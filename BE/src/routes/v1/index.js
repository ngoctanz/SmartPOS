import express from "express";
import { StatusCodes } from "http-status-codes";
import { userRouter } from "./userRouter.js";
import { authRouter } from "./authRouter.js";
import { categoryRouter } from "./categoryRouter.js";
import { productRouter } from "./productRouter.js";
import { branchRouter } from "./branchRouter.js";
import { stockRouter } from "./stockRouter.js";
import { importReceiptRouter } from "./importReceiptRouter.js";
import { receiptRouter } from "./receiptRouter.js";
import { dashboardRouter } from "./dashboardRouter.js";
import { uploadRouter } from "./uploadRouter.js";

const Router = express.Router();

Router.get("/status", (req, res) => {
  res.status(StatusCodes.OK).json({ message: "APIs V1 ready to use!" });
});

// Auth & User
Router.use("/auth", authRouter);
Router.use("/user", userRouter);

// Category & Product
Router.use("/category", categoryRouter);
Router.use("/product", productRouter);

// Branch & Stock
Router.use("/branch", branchRouter);
Router.use("/stock", stockRouter);

// Receipts
Router.use("/import-receipt", importReceiptRouter);
Router.use("/receipt", receiptRouter);

// Dashboard
Router.use("/dashboard", dashboardRouter);

// Upload
Router.use("/upload", uploadRouter);

export const APIs_V1 = {
  Router,
};
