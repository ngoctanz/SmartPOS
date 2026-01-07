import mongoose, { Schema } from "mongoose";

const receiptProductSchema = new mongoose.Schema(
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
    salePrice: {
      type: Number,
      required: true,
      min: [0, "Sale price cannot be negative"],
    },
  },
  { _id: false }
);

const receiptSchema = new mongoose.Schema(
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
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required!"],
    },
    listProduct: {
      type: [receiptProductSchema],
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
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "transfer"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["completed", "cancelled", "pending"],
      default: "completed",
    },
    // PayOS payment info (only for transfer payments)
    paymentInfo: {
      orderCode: { type: Number },
      linkId: { type: String },
      qrCode: { type: String },
      checkoutUrl: { type: String },
      accountNumber: { type: String },
      accountName: { type: String },
      bin: { type: String },
      // Store amount and description to regenerate VietQR later
      amount: { type: Number },
      description: { type: String },
      status: {
        type: String,
        enum: ["pending", "paid", "cancelled", "expired", ""],
        default: "",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

receiptSchema.index({ branchId: 1 });
receiptSchema.index({ createdBy: 1 });
receiptSchema.index({ status: 1 });
receiptSchema.index({ createdAt: -1 });
receiptSchema.index({ paymentMethod: 1 });
receiptSchema.index({ "paymentInfo.orderCode": 1 });

// Static methods
receiptSchema.statics = {
  async getStats(branchId) {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledCount: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, "$totalAmount", 0],
            },
          },
        },
      },
    ];

    if (branchId) {
      pipeline.unshift({
        $match: { branchId: new mongoose.Types.ObjectId(branchId) },
      });
    }

    const result = await this.aggregate(pipeline);
    return (
      result[0] || {
        totalReceipts: 0,
        pendingCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        totalRevenue: 0,
      }
    );
  },

  async generateCode() {
    const lastReceipt = await this.findOne().sort({ createdAt: -1 });
    if (!lastReceipt) return "HD001";
    const lastNumber = parseInt(lastReceipt.code.replace("HD", ""), 10);
    const newNumber = lastNumber + 1;
    return `HD${String(newNumber).padStart(3, "0")}`;
  },

  async createReceipt(data) {
    const code = await this.generateCode();
    const receipt = new this({ ...data, code });
    await receipt.save();
    return receipt;
  },

  async findAllReceipts(filter = {}) {
    return this.find(filter)
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findAllReceiptsPaginated(options = {}) {
    const {
      search,
      branchId,
      status,
      paymentMethod,
      page = 1,
      limit = 20,
    } = options;

    // Auto-expire pending transfer payments older than 15 minutes
    const expirationTime = new Date(Date.now() - 15 * 60 * 1000);
    await this.updateMany(
      {
        paymentMethod: "transfer",
        status: "pending",
        "paymentInfo.status": "pending",
        createdAt: { $lt: expirationTime },
      },
      {
        $set: {
          status: "cancelled",
          "paymentInfo.status": "expired",
        },
      }
    );

    const query = {};

    // Search by code
    if (search && search.trim()) {
      query.code = { $regex: search, $options: "i" };
    }

    // Filter by branch
    if (branchId) {
      query.branchId = new mongoose.Types.ObjectId(branchId);
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by payment method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
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

  async findReceiptById(id) {
    const receipt = await this.findById(id)
      .populate("branchId", "branchName address")
      .populate("createdBy", "userName name")
      .lean();
    if (!receipt) throw new Error("Receipt not found");
    return receipt;
  },

  async findReceiptByCode(code) {
    return this.findOne({ code })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .lean();
  },

  async findReceiptByOrderCode(orderCode) {
    return this.findOne({ "paymentInfo.orderCode": orderCode })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name");
  },

  async updatePaymentStatus(orderCode, paymentStatus, status = null) {
    const updateData = { "paymentInfo.status": paymentStatus };
    if (status) updateData.status = status;

    const receipt = await this.findOneAndUpdate(
      { "paymentInfo.orderCode": orderCode },
      updateData,
      { new: true, runValidators: true }
    );
    if (!receipt) throw new Error("Receipt not found");
    return receipt;
  },

  async findReceiptsByBranch(branchId, filter = {}) {
    return this.find({ branchId, ...filter })
      .populate("branchId", "branchName")
      .populate("createdBy", "userName name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findReceiptsByDateRange(startDate, endDate, branchId = null) {
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
    if (!receipt) throw new Error("Receipt not found");
    return receipt;
  },

  async getRevenueByDateRange(startDate, endDate, branchId = null) {
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
          totalRevenue: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
    return result[0] || { totalRevenue: 0, count: 0 };
  },

  async getDailyRevenue(startDate, endDate, branchId = null) {
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    };
    if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  },

  async getTopSellingProducts(startDate, endDate, branchId = null, limit = 10) {
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    };
    if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

    return this.aggregate([
      { $match: matchStage },
      { $unwind: "$listProduct" },
      {
        $group: {
          _id: "$listProduct.productId",
          productName: { $first: "$listProduct.productName" },
          totalQuantity: { $sum: "$listProduct.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$listProduct.salePrice", "$listProduct.quantity"],
            },
          },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
    ]);
  },

  async getRevenueByPaymentMethod(startDate, endDate, branchId = null) {
    const matchStage = {
      createdAt: { $gte: startDate, $lte: endDate },
      status: "completed",
    };
    if (branchId) matchStage.branchId = new mongoose.Types.ObjectId(branchId);

    return this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$paymentMethod",
          totalAmount: { $sum: "$totalAmount" },
          count: { $sum: 1 },
        },
      },
    ]);
  },
};

export const Receipt = mongoose.model("Receipt", receiptSchema);
