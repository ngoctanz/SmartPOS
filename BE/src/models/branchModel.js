import mongoose, { Schema } from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    branchName: {
      type: Schema.Types.String,
      required: [true, "Branch name is required!"],
      minlength: [2, "Branch name must be at least 2 characters!"],
      maxlength: [200, "Branch name max 200 characters"],
      trim: true,
      unique: true,
    },
    address: {
      type: Schema.Types.String,
      required: [true, "Address is required!"],
      trim: true,
      maxlength: [500, "Address max 500 characters"],
    },
    contactInfo: {
      type: Schema.Types.String,
      trim: true,
      maxlength: [200, "Contact info max 200 characters"],
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

branchSchema.index({ createdAt: -1 });

// Instance method
branchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.isDeleted;
  delete obj.deletedAt;
  return obj;
};

// Static methods
branchSchema.statics = {
  async createBranch(data) {
    const branch = new this(data);
    await branch.save();
    return branch;
  },

  async findAllBranches(filter = {}) {
    return this.find({ isDeleted: false, ...filter }).sort({ createdAt: -1 }).lean();
  },

  async findBranchById(id) {
    const branch = await this.findOne({ _id: id, isDeleted: false }).lean();
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async findBranchByName(name) {
    return this.find({
      branchName: new RegExp(name, "i"),
      isDeleted: false,
    }).lean();
  },

  async updateBranch(id, data) {
    const branch = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      data,
      { new: true, runValidators: true }
    );
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async softDeleteBranch(id) {
    const branch = await this.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async deleteBranch(id) {
    return this.findByIdAndDelete(id);
  },
};

export const Branch = mongoose.model("Branch", branchSchema);
