import mongoose, { Schema } from "mongoose";

const branchProductSchema = new mongoose.Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required!"],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required!"],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot be negative"],
      default: 0,
    },
    avgImportPrice: {
      type: Number,
      min: [0, "Avg import price cannot be negative"],
      default: 0,
    },
    minStock: {
      type: Number,
      min: [0, "Min stock cannot be negative"],
      default: 10,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index để đảm bảo mỗi sản phẩm chỉ có 1 record trong 1 chi nhánh
branchProductSchema.index({ branchId: 1, productId: 1 }, { unique: true });
branchProductSchema.index({ branchId: 1 });
branchProductSchema.index({ productId: 1 });

// Static methods
branchProductSchema.statics = {
  async findByBranch(branchId) {
    return this.find({ branchId })
      .populate("productId", "name barcode unit currentSalePrice image")
      .populate("branchId", "branchName")
      .lean();
  },

  async findByProduct(productId) {
    return this.find({ productId })
      .populate("branchId", "branchName address")
      .lean();
  },

  async findByBranchAndProduct(branchId, productId) {
    return this.findOne({ branchId, productId })
      .populate("productId", "name barcode unit currentSalePrice")
      .lean();
  },

  async getStock(branchId, productId) {
    const record = await this.findOne({ branchId, productId });
    return record ? record.stock : 0;
  },

  async increaseStock(branchId, productId, quantity) {
    let record = await this.findOne({ branchId, productId });
    if (!record) {
      record = new this({ branchId, productId, stock: quantity });
    } else {
      record.stock += quantity;
    }
    await record.save();
    return record;
  },

  async decreaseStock(branchId, productId, quantity) {
    const record = await this.findOne({ branchId, productId });
    if (!record || record.stock < quantity) {
      throw new Error("Insufficient stock");
    }
    record.stock -= quantity;
    await record.save();
    return record;
  },

  async setMinStock(branchId, productId, minStock) {
    return this.findOneAndUpdate(
      { branchId, productId },
      { minStock },
      { new: true, upsert: true }
    );
  },

  async getLowStockByBranch(branchId) {
    const results = await this.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId) } },
      { $match: { $expr: { $lt: ["$stock", "$minStock"] } } },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          productId: 1,
          stock: 1,
          minStock: 1,
          "product.name": 1,
          "product.barcode": 1,
          "product.unit": 1,
        },
      },
    ]);
    return results;
  },
};

export const BranchProduct = mongoose.model("BranchProduct", branchProductSchema);
