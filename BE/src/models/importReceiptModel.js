import mongoose, { Schema } from "mongoose";
import { buildDateFilter } from "../utils/dateUtils.js";

const importProductSchema = new mongoose.Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    barcode: {
      type: String,
      default: "",
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    importPrice: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true
    },
  },
  { _id: false }
);

const importReceiptSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required!"],
    },
    supplierName: {
      type: String,
      trim: true,
      maxlength: [200, "Supplier name max 200 characters"],
      default: "",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required!"],
    },
    listProduct: {
      type: [importProductSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: "At least one product is required",
      },
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "pending",
    },
    isError: {
      type: Boolean,
      default: false,
    },
    errorNote: {
      type: String,
      trim: true,
      maxlength: [500, "Error note max 500 characters"],
      default: "",
    },
    errorMarkedAt: {
      type: Date,
      default: null,
    },
    errorMarkedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note max 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

importReceiptSchema.index({ branchId: 1 });
importReceiptSchema.index({ createdBy: 1 });
importReceiptSchema.index({ status: 1 });
importReceiptSchema.index({ createdAt: -1 });
importReceiptSchema.index({ isError: 1 });

// Static methods
importReceiptSchema.statics = {
  async getStats(branchId, period, startDate, endDate) {
    const matchStage = { isError: { $ne: true } };

    // Apply date filter
    const dateFilter = buildDateFilter({ period, startDate, endDate });
    if (dateFilter) {
      Object.assign(matchStage, dateFilter);
    }

    if (branchId) {
      matchStage.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    const result = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          completedCount: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          cancelledCount: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
          totalValue: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0] } },
        },
      },
    ]);

    return result[0] || {
      totalReceipts: 0,
      pendingCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      totalValue: 0,
    };
  },

  async getErrorStats(branchId) {
    const matchStage = { isError: true };
    if (branchId) {
      matchStage.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    const result = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalErrorReceipts: { $sum: 1 },
          totalErrorValue: { $sum: "$totalAmount" },
        },
      },
    ]);

    return result[0] || { totalErrorReceipts: 0, totalErrorValue: 0 };
  },

  async generateCode() {
    const lastReceipt = await this.findOne().sort({ createdAt: -1 });
    if (!lastReceipt) return "PN001";
    const lastNumber = parseInt(lastReceipt.code.replace("PN", ""), 10);
    const newNumber = lastNumber + 1;
    return `PN${String(newNumber).padStart(3, "0")}`;
  },

  generateBarcode(code) {
    const codeNum = code.replace("PN", "").padStart(6, "0");
    const timestamp = Date.now().toString().slice(-6);
    return `200${codeNum}${timestamp}`;
  },

  async createImportReceipt(data) {
    const code = await this.generateCode();
    const barcode = this.generateBarcode(code);
    const receipt = new this({ ...data, code, barcode });
    await receipt.save();
    return receipt;
  },

  async findAllImportReceipts(filter = {}) {
    const queryFilter = { ...filter };
    if (queryFilter.isError === undefined) {
      queryFilter.isError = { $ne: true };
    }
    return this.find(queryFilter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findAllErrorReceipts(filter = {}) {
    const queryFilter = { ...filter, isError: true };
    return this.find(queryFilter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name")
      .sort({ errorMarkedAt: -1 })
      .lean();
  },

  async findAllErrorReceiptsPaginated(options = {}) {
    const { search, branchId, page = 1, limit = 20 } = options;

    const query = { isError: true };

    if (search && search.trim()) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
        { errorNote: { $regex: search, $options: "i" } },
      ];
    }

    if (branchId) {
      query.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    const total = await this.countDocuments(query);
    const skip = (page - 1) * limit;

    const data = await this.find(query)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name")
      .sort({ errorMarkedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findAllImportReceiptsPaginated(options = {}) {
    const {
      search,
      branchId,
      status,
      period,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      includeError = false,
    } = options;

    const query = {};

    if (!includeError) {
      query.isError = { $ne: true };
    }

    if (search && search.trim()) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
      ];
    }

    if (branchId) {
      query.branchId = new mongoose.Types.ObjectId(String(branchId));
    }

    if (status) {
      query.status = status;
    }

    // Apply date filter
    const dateFilter = buildDateFilter({ period, startDate, endDate });
    if (dateFilter) {
      Object.assign(query, dateFilter);
    }

    const total = await this.countDocuments(query);
    const skip = (page - 1) * limit;

    const data = await this.find(query)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  async findImportReceiptById(id) {
    const receipt = await this.findById(id)
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name")
      .lean();
    if (!receipt) throw new Error("Import receipt not found");
    return receipt;
  },

  async findImportReceiptByCode(code) {
    return this.findOne({ code })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name")
      .lean();
  },

  async findImportReceiptByBarcode(barcode) {
    return this.findOne({ barcode })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name")
      .lean();
  },

  async findImportReceiptsByBranch(branchId, filter = {}) {
    const queryFilter = { branchId, ...filter };
    if (queryFilter.isError === undefined) {
      queryFilter.isError = { $ne: true };
    }
    return this.find(queryFilter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findImportReceiptsByDateRange(startDate, endDate, branchId = null) {
    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
      isError: { $ne: true },
    };
    if (branchId) query.branchId = branchId;
    return this.find(query)
      .populate("branchId", "branchName")
      .sort({ createdAt: -1 })
      .lean();
  },

  async updateStatus(id, status) {
    const receipt = await this.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    if (!receipt) throw new Error("Import receipt not found");
    return receipt;
  },

  async getTotalImportByDateRange(startDate, endDate, branchId = null) {
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
      isError: { $ne: true },
    };
    if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(String(branchId));

    const result = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { totalAmount: 0, count: 0 };
  },

  async markAsError(id, errorNote, userId) {
    const receipt = await this.findByIdAndUpdate(
      id,
      {
        isError: true,
        errorNote: errorNote || "",
        errorMarkedAt: new Date(),
        errorMarkedBy: userId,
      },
      { new: true, runValidators: true }
    )
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .populate("errorMarkedBy", "userName name");

    if (!receipt) throw new Error("Import receipt not found");
    return receipt;
  },

  async deleteErrorReceipt(id) {
    const receipt = await this.findOneAndDelete({ _id: id, isError: true });
    if (!receipt) throw new Error("Error receipt not found or not an error receipt");
    return receipt;
  },
};

export const ImportReceipt = mongoose.model("ImportReceipt", importReceiptSchema);
