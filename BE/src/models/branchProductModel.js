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

  async getStockInfo(branchId, productId) {
    const record = await this.findOne({ branchId, productId });
    return record
      ? { stock: record.stock, avgImportPrice: record.avgImportPrice }
      : { stock: 0, avgImportPrice: 0 };
  },

  /**
   * Nhập hàng - Tính giá vốn trung bình mới
   * newAvg = (oldQty × oldAvg + importQty × importPrice) / (oldQty + importQty)
   */
  async importStock(branchId, productId, quantity, importPrice) {
    let record = await this.findOne({ branchId, productId });

    if (!record) {
      // Chưa có record → tạo mới
      record = new this({
        branchId,
        productId,
        stock: quantity,
        avgImportPrice: importPrice,
      });
    } else {
      // Tính giá vốn trung bình mới
      const oldQty = record.stock;
      const oldAvg = record.avgImportPrice;
      const newQty = oldQty + quantity;
      const newAvg = (oldQty * oldAvg + quantity * importPrice) / newQty;

      record.stock = newQty;
      record.avgImportPrice = Math.round(newAvg); // Làm tròn
    }

    await record.save();
    return record;
  },

  /**
   * Bán hàng - Trừ tồn kho
   * Trả về avgImportPrice để tính cost
   */
  async sellStock(branchId, productId, quantity) {
    const record = await this.findOne({ branchId, productId });

    if (!record || record.stock < quantity) {
      throw new Error("Insufficient stock");
    }

    const avgImportPrice = record.avgImportPrice;
    record.stock -= quantity;
    // avgImportPrice giữ nguyên khi bán
    await record.save();

    return { avgImportPrice, remainingStock: record.stock };
  },

  /**
   * Hoàn trả stock khi hủy đơn
   */
  async restoreStock(branchId, productId, quantity, costPrice) {
    const record = await this.findOne({ branchId, productId });

    if (!record) {
      throw new Error("Stock record not found");
    }

    // Tính lại avg khi hoàn trả
    const oldQty = record.stock;
    const oldAvg = record.avgImportPrice;
    const restoreAvg = costPrice / quantity; // Giá vốn lúc bán
    const newQty = oldQty + quantity;
    const newAvg = (oldQty * oldAvg + quantity * restoreAvg) / newQty;

    record.stock = newQty;
    record.avgImportPrice = Math.round(newAvg);
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
          avgImportPrice: 1,
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
