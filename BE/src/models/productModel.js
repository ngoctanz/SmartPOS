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
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
    deletedAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({ categoryId: 1 });
productSchema.index({ createdAt: -1 });

// Instance method
productSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

// Pre-save to auto-generate barcode
productSchema.pre("save", async function (next) {
  if (!this.barcode) {
    // Format: 893 + 9 digits from timestamp (reversed or sliced) + 1 random
    const suffix = Date.now().toString().slice(-9);
    const random = Math.floor(Math.random() * 10);
    this.barcode = `893${suffix}${random}`;
  }
  next();
});

// Static methods
productSchema.statics = {
  async createProduct(data) {
    const product = new this(data);
    await product.save();
    return product;
  },

  async findAllProducts(filter = {}) {
    return this.find({ isDeleted: false, ...filter })
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();
  },

  async findProductById(id) {
    const product = await this.findOne({ _id: id, isDeleted: false })
      .populate("categoryId", "name")
      .lean();
    if (!product) throw new Error("Product not found");
    return product;
  },

  async findProductByBarcode(barcode) {
    const product = await this.findOne({ barcode, isDeleted: false })
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
      isDeleted: false,
    })
      .populate("categoryId", "name")
      .limit(20) // Limit results for search suggestions
      .lean();
  },

  async findProductsByCategory(categoryId) {
    return this.find({ categoryId, isDeleted: false })
      .populate("categoryId", "name")
      .lean();
  },

  async updateProduct(id, data) {
    const product = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      data,
      { new: true, runValidators: true }
    ).populate("categoryId", "name");
    if (!product) throw new Error("Product not found");
    return product;
  },

  async updateSalePrice(id, salePrice) {
    return this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { currentSalePrice: salePrice },
      { new: true }
    );
  },

  async softDeleteProduct(id) {
    const product = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!product) throw new Error("Product not found");
    return product;
  },

  async softDeleteManyProducts(ids) {
    return this.updateMany(
      { _id: { $in: ids }, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() }
    );
  },

  async deleteProduct(id) {
    return this.findByIdAndDelete(id);
  },
};

export const Product = mongoose.model("Product", productSchema);
