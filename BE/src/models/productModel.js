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
    const query = { ...filter };
    if (!query.status) {
      query.status = "active"; // Maintain default behavior but allow override
    }
    // If status is 'all', remove it from query
    if (query.status === "all") {
      delete query.status;
    }

    return this.find(query)
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async getProductStats() {
    const [total, active, inactive] = await Promise.all([
      this.countDocuments({}),
      this.countDocuments({ status: "active" }),
      this.countDocuments({ status: "inactive" }),
    ]);
    return { total, active, inactive };
  },
  async findProductById(id) {
    const product = await this.findOne({ _id: id })
      .populate("categoryId", "name")
      .lean();
    if (!product) throw new Error("Product not found");
    return product;
  },

  async findProductByBarcode(barcode) {
    const product = await this.findOne({ barcode })
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
    })
      .populate("categoryId", "name")
      .limit(20)
      .lean();
  },

  async findProductsByCategory(categoryId) {
    return this.find({ categoryId })
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
