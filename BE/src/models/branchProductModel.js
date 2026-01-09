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
        stock: { type: Number, default: 0 },
        minStock: { type: Number, default: 5, min: [0, "Min stock cannot be negative"] },
        salePrice: { type: Number, default: 0, min: [0, "Sale price cannot be negative"] },
        note: { type: String, default: null },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

branchProductSchema.index({ "products.productId": 1 });

// ============ HELPER FUNCTIONS ============

// Get product's salePrice from Product model, throw if not found
async function getProductSalePrice(productId) {
  const { Product } = await import("./productModel.js");
  const product = await Product.findById(productId).select("currentSalePrice");
  if (!product) {
    throw new Error("Product not found - cannot adjust stock for deleted product");
  }
  return product.currentSalePrice || 0;
}

// Find or create BranchProduct document
async function findOrCreateBranchDoc(model, branchId, session = null) {
  let doc = session 
    ? await model.findOne({ branchId }).session(session)
    : await model.findOne({ branchId });
  
  if (!doc) {
    doc = new model({ branchId, products: [] });
  }
  return doc;
}

// ============ STATIC METHODS ============

branchProductSchema.statics = {
  // ============ STATS ============
  async getStats(branchId) {
    const pipeline = [
      { $unwind: "$products" },
      {
        $group: {
          _id: null,
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: "$products.stock" },
          lowStockCount: {
            $sum: { $cond: [{ $lte: ["$products.stock", "$products.minStock"] }, 1, 0] }
          }
        }
      }
    ];

    if (branchId) {
      pipeline.unshift({ $match: { branchId: new mongoose.Types.ObjectId(String(branchId)) } });
    }

    const result = await this.aggregate(pipeline);
    return result[0] || { totalItems: 0, totalQuantity: 0, lowStockCount: 0 };
  },

  // ============ QUERIES ============
  
  // Get aggregated stock by product (admin - all branches view)
  async findAggregatedByProduct(options = {}) {
    const { search, page = 1, limit = 20, lowStockOnly = false } = options;

    const pipeline = [
      { $unwind: "$products" },
      {
        $group: {
          _id: "$products.productId",
          totalStock: { $sum: "$products.stock" },
          totalMinStock: { $sum: "$products.minStock" },
          branchCount: { $sum: 1 },
          latestUpdate: { $max: "$updatedAt" },
        },
      },
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

    if (search?.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { "product.name": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    if (lowStockOnly) {
      pipeline.push({
        $match: {
          $expr: { $lte: ["$totalStock", { $divide: ["$totalMinStock", "$branchCount"] }] }
        }
      });
    }

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

    pipeline.push({ $sort: { updatedAt: -1 } });

    const countResult = await this.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
    const data = await this.aggregate(pipeline);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // Get all stock with branch filter
  async findAll(options = {}) {
    const { branchId, search, page = 1, limit = 20, lowStockOnly = false } = options;

    const pipeline = [
      { $unwind: "$products" },
      { $lookup: { from: "branches", localField: "branchId", foreignField: "_id", as: "branch" } },
      { $lookup: { from: "products", localField: "products.productId", foreignField: "_id", as: "product" } },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    ];

    if (branchId) {
      pipeline.unshift({ $match: { branchId: new mongoose.Types.ObjectId(String(branchId)) } });
    }

    if (search?.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { "product.name": { $regex: search, $options: "i" } },
            { "product.barcode": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    if (lowStockOnly) {
      pipeline.push({ $match: { $expr: { $lte: ["$products.stock", "$products.minStock"] } } });
    }

    pipeline.push({
      $project: {
        _id: "$products._id",
        branchId: "$branch",
        productId: "$product",
        stock: "$products.stock",
        minStock: "$products.minStock",
        salePrice: "$products.salePrice",
        note: "$products.note",
        updatedAt: "$updatedAt",
      },
    });

    pipeline.push({ $sort: { updatedAt: -1 } });

    const countResult = await this.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: (page - 1) * limit }, { $limit: limit });
    const data = await this.aggregate(pipeline);

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // Get stock by specific branch (optimized with populate)
  async findByBranch(branchId, options = {}) {
    const { search, page = 1, limit = 20, lowStockOnly = false } = options;

    const doc = await this.findOne({ branchId })
      .populate("branchId", "branchName")
      .populate("products.productId", "name barcode unit image images")
      .lean();

    if (!doc) {
      return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }

    let items = doc.products.map(p => ({
      _id: p._id,
      branchId: doc.branchId,
      productId: p.productId,
      stock: p.stock,
      minStock: p.minStock,
      salePrice: p.salePrice || 0,
      note: p.note || null,
      updatedAt: doc.updatedAt,
    }));

    if (search?.trim()) {
      const searchLower = search.toLowerCase();
      items = items.filter(item =>
        item.productId?.name?.toLowerCase().includes(searchLower) ||
        item.productId?.barcode?.toLowerCase().includes(searchLower)
      );
    }

    if (lowStockOnly) {
      items = items.filter(item => item.stock <= item.minStock);
    }

    // Sort by stock descending (highest stock first)
    items.sort((a, b) => b.stock - a.stock);

    const total = items.length;
    const paginatedItems = items.slice((page - 1) * limit, page * limit);

    return {
      data: paginatedItems,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // ============ SINGLE ITEM GETTERS ============
  
  async getStock(branchId, productId) {
    const doc = await this.findOne({ branchId, "products.productId": productId }, { "products.$": 1 });
    return doc?.products[0]?.stock ?? 0;
  },

  async getSalePrice(branchId, productId) {
    const doc = await this.findOne({ branchId, "products.productId": productId }, { "products.$": 1 });
    return doc?.products[0]?.salePrice ?? 0;
  },

  async getProductInfo(branchId, productId) {
    const doc = await this.findOne({ branchId, "products.productId": productId }, { "products.$": 1 });
    return doc?.products[0] 
      ? { stock: doc.products[0].stock, salePrice: doc.products[0].salePrice, minStock: doc.products[0].minStock }
      : { stock: 0, salePrice: 0, minStock: 10 };
  },

  // Find product in branch by barcode
  async findByBarcode(branchId, barcode) {
    const { Product } = await import("./productModel.js");
    
    // First find product by barcode
    const product = await Product.findOne({ barcode }).lean();
    if (!product) return null;
    
    // Then check if product exists in branch stock
    const doc = await this.findOne({ branchId })
      .populate("branchId", "branchName")
      .lean();
    
    if (!doc) return null;
    
    const branchProduct = doc.products.find(
      p => p.productId.toString() === product._id.toString()
    );
    
    if (!branchProduct) return null;
    
    return {
      _id: branchProduct._id,
      branchId: doc.branchId,
      productId: {
        _id: product._id,
        name: product.name,
        barcode: product.barcode,
        unit: product.unit,
        images: product.images,
      },
      stock: branchProduct.stock,
      minStock: branchProduct.minStock,
      salePrice: branchProduct.salePrice || product.currentSalePrice || 0,
      note: branchProduct.note || null,
      updatedAt: doc.updatedAt,
    };
  },

  // ============ STOCK OPERATIONS ============

  // Increase stock (import receipt confirm, receipt error mark)
  async increaseStock(branchId, productId, quantity, session = null) {
    const doc = await findOrCreateBranchDoc(this, branchId, session);
    let product = doc.products.find(p => p.productId.toString() === productId.toString());
    
    if (product) {
      product.stock += quantity;
    } else {
      const salePrice = await getProductSalePrice(productId);
      doc.products.push({ productId, stock: quantity, minStock: 10, salePrice });
    }
    
    await doc.save(session ? { session } : {});
    return doc;
  },

  // Decrease stock (receipt confirm, import receipt error mark) - allows negative
  async decreaseStock(branchId, productId, quantity) {
    const doc = await findOrCreateBranchDoc(this, branchId);
    let product = doc.products.find(p => p.productId.toString() === productId.toString());
    
    if (product) {
      product.stock -= quantity;
    } else {
      const salePrice = await getProductSalePrice(productId);
      doc.products.push({ productId, stock: -quantity, minStock: 10, salePrice });
    }
    
    await doc.save();
    return doc;
  },

  // ============ UPDATE OPERATIONS ============

  async updateNote(id, note) {
    const result = await this.findOneAndUpdate(
      { "products._id": id },
      { $set: { "products.$.note": note }, $currentDate: { updatedAt: true } },
      { new: true }
    );
    if (!result) throw new Error("Stock record not found");
    return result;
  },

  async updateSalePrice(id, salePrice) {
    const result = await this.findOneAndUpdate(
      { "products._id": id },
      { $set: { "products.$.salePrice": salePrice }, $currentDate: { updatedAt: true } },
      { new: true }
    );
    if (!result) throw new Error("Stock record not found");
    return result;
  },

  async bulkUpdateStock(branchId, items) {
    let doc = await this.findOne({ branchId });
    if (!doc) doc = new this({ branchId, products: [] });

    for (const item of items) {
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
    }

    await doc.save();
    return doc;
  },

  // ============ PRODUCT/BRANCH SYNC ============

  // Add new product to all branches (called when creating product)
  async addProductToAllBranches(productId, salePrice = 0) {
    const { Branch } = await import("./branchModel.js");
    const allBranches = await Branch.find({}, "_id");
    
    if (allBranches.length === 0) return;

    // Ensure all BranchProduct documents exist
    await this.bulkWrite(
      allBranches.map(branch => ({
        updateOne: {
          filter: { branchId: branch._id },
          update: { $setOnInsert: { branchId: branch._id, products: [] } },
          upsert: true
        }
      }))
    );

    // Add product to all branches (only if not exists)
    await this.updateMany(
      { "products.productId": { $ne: productId } },
      { $push: { products: { productId, stock: 0, minStock: 10, salePrice } } }
    );
  },

  // Initialize new branch with all products (called when creating branch)
  async initBranchWithAllProducts(branchId) {
    const existing = await this.findOne({ branchId });
    if (existing) return existing;

    const { Product } = await import("./productModel.js");
    const allProducts = await Product.find({}, "_id currentSalePrice");

    const branchProduct = new this({
      branchId,
      products: allProducts.map(p => ({
        productId: p._id,
        stock: 0,
        minStock: 10,
        salePrice: p.currentSalePrice || 0
      }))
    });

    await branchProduct.save();
    return branchProduct;
  },

  // Remove product from specific branch
  async removeProduct(branchId, productId) {
    return this.findOneAndUpdate(
      { branchId },
      { $pull: { products: { productId } } },
      { new: true }
    );
  },

  // Remove product from all branches (if needed for cleanup)
  async removeProductFromAllBranches(productId) {
    await this.updateMany({}, { $pull: { products: { productId } } });
  }
};

export const BranchProduct = mongoose.model("BranchProduct", branchProductSchema);
