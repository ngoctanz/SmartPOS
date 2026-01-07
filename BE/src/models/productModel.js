import mongoose, { Schema } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required!"],
    },
    name: {
      type: Schema.Types.String,
      required: [true, "Product name is required!"],
      minlength: [2, "Product name must be at least 2 characters!"],
      maxlength: [200, "Product name max 200 characters"],
      trim: true,
    },
    desc: {
      type: Schema.Types.String,
      trim: true,
      maxlength: [1000, "Description max 1000 characters"],
      default: "",
    },
    barcode: {
      type: Schema.Types.String,
      trim: true,
      unique: true,
      sparse: true,
    },
    unit: {
      type: Schema.Types.String,
      required: [true, "Unit is required!"],
      trim: true,
      default: "cái",
    },
    image: {
      type: Schema.Types.String,
      trim: true,
      default: "",
    },
    currentSalePrice: {
      type: Number,
      required: [true, "Sale price is required!"],
      min: [0, "Sale price cannot be negative"],
      default: 0,
    },
    status: {
      type: Schema.Types.String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({ categoryId: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ status: 1 });

// Static methods
productSchema.statics = {
  async createProduct(data) {
    const product = new this(data);
    await product.save();
    return product;
  },

  async findAllProducts(filter = {}) {
    return this.find({ status: "active", ...filter })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findAllProductsPaginated(options = {}) {
    const { search, categoryId, status, page = 1, limit = 20 } = options;
    
    const query = {};
    
    // Search by name or barcode
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }
    
    // Filter by category
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    // Filter by status (default: all)
    if (status) {
      query.status = status;
    }

    const total = await this.countDocuments(query);
    const skip = (page - 1) * limit;
    
    const data = await this.find(query)
      .populate("categoryId", "name")
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

  async findProductById(id) {
    const product = await this.findOne({ _id: id })
      .populate("categoryId", "name")
      .lean();
    if (!product) throw new Error("Product not found");
    return product;
  },

  async findProductByBarcode(barcode) {
    const product = await this.findOne({ barcode, status: "active" })
      .populate("categoryId", "name")
      .lean();
    return product;
  },

  async findProductsByName(searchTerm) {
    return this.find({
      $or: [
        { name: new RegExp(searchTerm, "i") },
        { barcode: new RegExp(searchTerm, "i") },
      ],
      status: "active",
    })
      .populate("categoryId", "name")
      .limit(20)
      .lean();
  },

  async findProductsByCategory(categoryId) {
    return this.find({ categoryId, status: "active" })
      .populate("categoryId", "name")
      .lean();
  },

  async updateProduct(id, data) {
    const product = await this.findOneAndUpdate(
      { _id: id },
      data,
      { new: true, runValidators: true }
    ).populate("categoryId", "name");
    if (!product) throw new Error("Product not found");
    return product;
  },

  async updateSalePrice(id, salePrice) {
    return this.findOneAndUpdate(
      { _id: id },
      { currentSalePrice: salePrice },
      { new: true }
    );
  },

  async deleteProduct(id) {
    const product = await this.findByIdAndDelete(id);
    if (!product) throw new Error("Product not found");
    return product;
  },

  async deleteManyProducts(ids) {
    return this.deleteMany({ _id: { $in: ids } });
  },
};

export const Product = mongoose.model("Product", productSchema);
