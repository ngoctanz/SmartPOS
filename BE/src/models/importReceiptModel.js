import mongoose, { Schema } from "mongoose";

const importProductSchema = new mongoose.Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },
    importPrice: {
      type: Number,
      required: true,
      min: [0, "Import price cannot be negative"],
    },
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
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

importReceiptSchema.index({ code: 1 });
importReceiptSchema.index({ branchId: 1 });
importReceiptSchema.index({ createdBy: 1 });
importReceiptSchema.index({ status: 1 });
importReceiptSchema.index({ createdAt: -1 });

// Static methods
importReceiptSchema.statics = {
  async generateCode() {
    const lastReceipt = await this.findOne().sort({ createdAt: -1 });
    if (!lastReceipt) return "PN001";
    const lastNumber = parseInt(lastReceipt.code.replace("PN", ""), 10);
    const newNumber = lastNumber + 1;
    return `PN${String(newNumber).padStart(3, "0")}`;
  },

  async createImportReceipt(data) {
    const code = await this.generateCode();
    const receipt = new this({ ...data, code });
    await receipt.save();
    return receipt;
  },

  async findAllImportReceipts(filter = {}) {
    return this.find(filter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findImportReceiptById(id) {
    const receipt = await this.findById(id)
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .lean();
    if (!receipt) throw new Error("Import receipt not found");
    return receipt;
  },

  async findImportReceiptByCode(code) {
    return this.findOne({ code })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .lean();
  },

  async findImportReceiptsByBranch(branchId, filter = {}) {
    return this.find({ branchId, ...filter })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findImportReceiptsByDateRange(startDate, endDate, branchId = null) {
    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
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
    };
    if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

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
};

export const ImportReceipt = mongoose.model("ImportReceipt", importReceiptSchema);
