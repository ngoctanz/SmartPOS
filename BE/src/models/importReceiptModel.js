import mongoose, { Schema } from "mongoose";

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
    barcode: {
      type: String,
      unique: true,
      sparse: true, // Cho phép null/undefined nhưng nếu có thì phải unique
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

  // Generate barcode from code (format: 200 + 9 digits from timestamp + check digit placeholder)
  generateBarcode(code) {
    // Simple approach: use prefix + code number + timestamp suffix
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

  // Tìm theo barcode
  async findImportReceiptByBarcode(barcode) {
    return this.findOne({ barcode })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .lean();
  },

  async findAllImportReceipts(filter = {}) {
    return this.find(filter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findAllImportReceiptsPaginated(options = {}) {
    const { search, branchId, status, page = 1, limit = 20 } = options;
    
    const query = {};
    
    // Search by code or supplier name
    if (search && search.trim()) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
      ];
    }
    
    // Filter by branch
    if (branchId) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }
    
    // Filter by status
    if (status) {
      query.status = status;
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
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

export const ImportReceipt = mongoose.model(
  "ImportReceipt",
  importReceiptSchema
);
