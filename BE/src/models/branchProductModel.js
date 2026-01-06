import mongoose, { Schema } from "mongoose";

const branchProductSchema = new mongoose.Schema(
  {
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: [true, "Branch is required!"],
      unique: true,
    },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        stock: {
          type: Number,
          default: 0,
          min: [0, "Stock cannot be negative"],
        },
        minStock: {
          type: Number,
          default: 10,
          min: [0, "Min stock cannot be negative"],
        },
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

branchProductSchema.index({ "products.productId": 1 });

// Static methods
branchProductSchema.statics = {
  async findAll(filter = {}) {
    const pipeline = [
      { $unwind: "$products" },
      {
        $lookup: {
          from: "branches",
          localField: "branchId",
          foreignField: "_id",
          as: "branch",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "products.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$branch" },
      { $unwind: "$product" },
      {
        $project: {
          _id: "$products._id", // Use item ID as row ID
          branchId: "$branch",
          productId: "$product",
          stock: "$products.stock",
          minStock: "$products.minStock",
          updatedAt: "$updatedAt",
        },
      },
      { $sort: { updatedAt: -1 } },
    ];
    
    // Apply additional filters if any (needs adaptation to pipeline)
    // For simplicity, returning all Flattened
    return this.aggregate(pipeline);
  },

  async findByBranch(branchId) {
    const doc = await this.findOne({ branchId })
      .populate("branchId", "branchName")
      .populate("products.productId", "name barcode unit currentSalePrice image")
      .lean();
    
    if (!doc) return [];
    
    // Flatten result for consistency
    return doc.products.map(p => ({
        _id: p._id,
        branchId: doc.branchId,
        productId: p.productId,
        stock: p.stock,
        minStock: p.minStock
    }));
  },

  async bulkUpdateStock(branchId, items) {
    // Items: [{ productId, stock, minStock }]
    // This is complex. Easiest way is to fetch, update JS array, save.
    // Or use bulkWrite.
    let doc = await this.findOne({ branchId });
    if (!doc) {
        doc = new this({ branchId, products: [] });
    }

    items.forEach(item => {
        const existing = doc.products.find(p => p.productId.toString() === item.productId);
        if (existing) {
            if (item.stock !== undefined) existing.stock = item.stock;
            if (item.minStock !== undefined) existing.minStock = item.minStock;
        } else {
            doc.products.push({
                productId: item.productId,
                stock: item.stock || 0,
                minStock: item.minStock || 10
            });
        }
    });

    await doc.save();
    return doc;
  },

  // Retain for backward compat/specific usage if needed
  async getStock(branchId, productId) {
    const doc = await this.findOne({ branchId, "products.productId": productId }, { "products.$": 1 });
    return doc && doc.products[0] ? doc.products[0].stock : 0;
  },
  
  // Helper to remove a single product from branch (Delete action)
  async removeProduct(branchId, productId) {
     return this.findOneAndUpdate(
         { branchId },
         { $pull: { products: { productId } } },
         { new: true }
     );
  }
};

export const BranchProduct = mongoose.model("BranchProduct", branchProductSchema);
