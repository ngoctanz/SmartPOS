import mongoose, { Schema } from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: Schema.Types.String,
      required: [true, "Category name is required!"],
      minlength: [2, "Category name must be at least 2 characters!"],
      maxlength: [100, "Category name max 100 characters"],
      trim: true,
      unique: true,
    },
    desc: {
      type: Schema.Types.String,
      trim: true,
      maxlength: [500, "Description max 500 characters"],
      default: "",
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

categorySchema.index({ createdAt: -1 });

// Instance method
categorySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

// Static methods
categorySchema.statics = {
  async createCategory(data) {
    const category = new this(data);
    await category.save();
    return category;
  },

  async findAllCategories(filter = {}) {
    return this.find({ isDeleted: false, ...filter }).sort({ createdAt: -1 }).lean();
  },

  async findCategoryById(id) {
    const category = await this.findOne({ _id: id, isDeleted: false }).lean();
    if (!category) throw new Error("Category not found");
    return category;
  },

  async findCategoryByName(name) {
    return this.find({
      name: new RegExp(name, "i"),
      isDeleted: false,
    }).lean();
  },

  async updateCategory(id, data) {
    const category = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      data,
      { new: true, runValidators: true }
    );
    if (!category) throw new Error("Category not found");
    return category;
  },

  async softDeleteCategory(id) {
    const category = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!category) throw new Error("Category not found");
    return category;
  },

  async deleteCategory(id) {
    return this.findByIdAndDelete(id);
  },
};

export const Category = mongoose.model("Category", categorySchema);
