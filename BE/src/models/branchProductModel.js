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
        note: {
          type: String,
          default: null,
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
  async getStats(branchId) {
    const pipeline = [
      { $unwind: "$products" },
      {
        $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQuantity: { $sum: "$products.stock" },
            lowStockCount: {
                $sum: {
                    $cond: [{ $lte: ["$products.stock", "$products.minStock"] }, 1, 0]
                }
            }
        }
    }
    ];

    if (branchId) {
        pipeline.unshift({ $match: { branchId: new mongoose.Types.ObjectId(branchId) } });
    }

    const result = await this.aggregate(pipeline);
    return result[0] || { totalItems: 0, totalQuantity: 0, lowStockCount: 0 };
  },

  /**
   * Get aggregated stock by product (sum across all branches)
   * Used when admin selects "All branches"
   */
  async findAggregatedByProduct(options = {}) {
    const { search, page = 1, limit = 20, lowStockOnly = false } = options;

    const pipeline = [
      { $unwind: "$products" },
      // Group by productId to sum stock across all branches
      {
        $group: {
          _id: "$products.productId",
          totalStock: { $sum: "$products.stock" },
          totalMinStock: { $sum: "$products.minStock" },
          branchCount: { $sum: 1 },
          latestUpdate: { $max: "$updatedAt" },
        },
      },
      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
    ];

    // Search by product name or barcode
    if (search && search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { "product.name": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Filter low stock only (total stock <= average minStock)
    if (lowStockOnly) {
      pipeline.push({
        $match: {
          $expr: { 
            $lte: [
              "$totalStock", 
              { $divide: ["$totalMinStock", "$branchCount"] }
            ] 
          }
        }
      });
    }

    // Project fields
    pipeline.push({
      $project: {
        _id: "$_id",
        productId: "$product",
        stock: "$totalStock",
        minStock: { $round: [{ $divide: ["$totalMinStock", "$branchCount"] }, 0] },
        branchCount: "$branchCount",
        updatedAt: "$latestUpdate",
        isAggregated: { $literal: true },
      },
    });

    // Sort by latest update
    pipeline.push({ $sort: { updatedAt: -1 } });

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await this.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const data = await this.aggregate(pipeline);

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

  async findAll(options = {}) {
    const { 
      branchId, 
      search, 
      page = 1, 
      limit = 20,
      lowStockOnly = false 
    } = options;

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
      // Preserve documents even if branch/product not found (e.g., deleted product)
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    // Filter by branchId if provided
    if (branchId) {
      pipeline.unshift({ 
        $match: { branchId: new mongoose.Types.ObjectId(branchId) } 
      });
    }

    // Search by product name or barcode
    if (search && search.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { "product.name": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Filter low stock only
    if (lowStockOnly) {
      pipeline.push({
        $match: {
          $expr: { $lte: ["$products.stock", "$products.minStock"] }
        }
      });
    }

    // Project fields
    pipeline.push({
      $project: {
        _id: "$products._id",
        branchId: "$branch",
        productId: "$product",
        stock: "$products.stock",
        minStock: "$products.minStock",
        note: "$products.note",
        updatedAt: "$updatedAt",
      },
    });

    // Sort
    pipeline.push({ $sort: { updatedAt: -1 } });

    // Count total before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await this.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    const data = await this.aggregate(pipeline);

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

  async findByBranch(branchId, options = {}) {
    const { search, page = 1, limit = 20, lowStockOnly = false } = options;

    const doc = await this.findOne({ branchId })
      .populate("branchId", "branchName")
      .populate("products.productId", "name barcode unit currentSalePrice image")
      .lean();
    
    if (!doc) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }
    
    // Flatten and filter
    let items = doc.products.map(p => ({
      _id: p._id,
      branchId: doc.branchId,
      productId: p.productId,
      stock: p.stock,
      minStock: p.minStock,
      note: p.note || null,
      updatedAt: doc.updatedAt,
    }));

    // Search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      items = items.filter(item => 
        item.productId?.name?.toLowerCase().includes(searchLower) ||
        item.productId?.barcode?.toLowerCase().includes(searchLower)
      );
    }

    // Low stock filter
    if (lowStockOnly) {
      items = items.filter(item => item.stock <= item.minStock);
    }

    const total = items.length;
    const skip = (page - 1) * limit;
    const paginatedItems = items.slice(skip, skip + limit);

    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
  },

  // Increase stock for a product in a branch (used when confirming import receipt)
  async increaseStock(branchId, productId, quantity, session = null) {
    const options = session ? { session } : {};
    let doc = await this.findOne({ branchId }).session(session);
    
    if (!doc) {
      // Create new branch product document if not exists
      doc = new this({ 
        branchId, 
        products: [{ productId, stock: quantity, minStock: 10 }] 
      });
      await doc.save(options);
      return doc;
    }

    const existingProduct = doc.products.find(
      p => p.productId.toString() === productId.toString()
    );

    if (existingProduct) {
      existingProduct.stock += quantity;
    } else {
      doc.products.push({
        productId,
        stock: quantity,
        minStock: 10
      });
    }

    await doc.save(options);
    return doc;
  },

  // Decrease stock for a product in a branch (used when confirming sale receipt)
  async decreaseStock(branchId, productId, quantity) {
    const doc = await this.findOne({ branchId });
    
    if (!doc) {
      throw new Error("Branch product not found");
    }

    const existingProduct = doc.products.find(
      p => p.productId.toString() === productId.toString()
    );

    if (!existingProduct) {
      throw new Error("Product not found in branch");
    }

    if (existingProduct.stock < quantity) {
      throw new Error("Insufficient stock");
    }

    existingProduct.stock -= quantity;
    await doc.save();
    return doc;
  },

  // Update note for a product in a branch
  async updateNote(id, note) {
    const result = await this.findOneAndUpdate(
      { "products._id": id },
      { 
        $set: { "products.$.note": note },
        $currentDate: { updatedAt: true }
      },
      { new: true }
    );
    if (!result) {
      throw new Error("Stock record not found");
    }
    return result;
  }
};

export const BranchProduct = mongoose.model("BranchProduct", branchProductSchema);
