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
  return obj;
};

// Static methods
categorySchema.statics = {
  async createCategory(data) {
    const category = new this(data);
    await category.save();
    return category;
  },

  async getCategoryStats() {
    const total = await this.countDocuments({});
    return { total };
  },

  async findAllCategories(filter = {}) {
    return this.find(filter)
      .sort({ createdAt: -1 })
      .lean();
  },

  async findCategoryById(id) {
    const category = await this.findOne({ _id: id }).lean();
    if (!category) throw new Error("Category not found");
    return category;
  },

  async findCategoryByName(name) {
    return this.find({
      name: new RegExp(name, "i"),
    }).lean();
  },

  async updateCategory(id, data) {
    const category = await this.findOneAndUpdate(
      { _id: id },
      data,
      { new: true, runValidators: true }
    );
    if (!category) throw new Error("Category not found");
    return category;
  },

  async deleteCategory(id) {
    const category = await this.findByIdAndDelete(id);
    if (!category) throw new Error("Category not found");
    return category;
  },

  async deleteManyCategories(ids) {
    const result = await this.deleteMany({ _id: { $in: ids } });
    return result;
  },
};

export const Category = mongoose.model("Category", categorySchema);
