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
    //
    PAYOS_CLIENT_ID: {
      type: Schema.Types.String,
      trim: true,
    },
    PAYOS_API_KEY: {
      type: Schema.Types.String,
      trim: true,
    },
    PAYOS_CHECKSUM_KEY: {
      type: Schema.Types.String,
      trim: true,
    },
    // Soft delete fields
    isDeleted: {
      type: Schema.Types.Boolean,
      default: false,
    },
    deletedAt: {
      type: Schema.Types.Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

branchSchema.index({ createdAt: -1 });
branchSchema.index({ isDeleted: 1 }); // Index for soft delete queries

// Instance method
branchSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

// Static methods
branchSchema.statics = {
  async createBranch(data) {
    const branch = new this(data);
    await branch.save();
    return branch;
  },

  async getBranchStats(includeDeleted = false) {
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    const total = await this.countDocuments(filter);
    return { total };
  },

  async findAllBranches(filter = {}, includeDeleted = false) {
    const baseFilter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    return this.find({ ...baseFilter, ...filter })
      .sort({ createdAt: -1 })
      .lean();
  },

  async findAllBranchesPaginated(options = {}) {
    const { search, page = 1, limit = 20, includeDeleted = false } = options;

    const query = includeDeleted ? {} : { isDeleted: { $ne: true } };

    // Search by name or address
    if (search && search.trim()) {
      query.$or = [
        { branchName: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    const total = await this.countDocuments(query);
    const skip = (page - 1) * limit;

    const data = await this.find(query)
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

  async findBranchById(id, includeDeleted = false) {
    const filter = includeDeleted
      ? { _id: id }
      : { _id: id, isDeleted: { $ne: true } };
    const branch = await this.findOne(filter).lean();
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async findBranchByName(name, includeDeleted = false) {
    const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
    return this.find({
      ...filter,
      branchName: new RegExp(name, "i"),
    }).lean();
  },

  async updateBranch(id, data) {
    const branch = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      data,
      { new: true, runValidators: true }
    );
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  // Soft delete - đánh dấu isDeleted = true
  async deleteBranch(id) {
    const branch = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  // Soft delete nhiều
  async deleteManyBranches(ids) {
    const result = await this.updateMany(
      { _id: { $in: ids }, isDeleted: { $ne: true } },
      { isDeleted: true, deletedAt: new Date() }
    );
    return result;
  },

  // Khôi phục chi nhánh đã xóa
  async restoreBranch(id) {
    const branch = await this.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!branch) throw new Error("Branch not found or not deleted");
    return branch;
  },

  // Hard delete (xóa thật - chỉ dùng khi cần)
  async hardDeleteBranch(id) {
    const branch = await this.findByIdAndDelete(id);
    if (!branch) throw new Error("Branch not found");
    return branch;
  },
};

export const Branch = mongoose.model("Branch", branchSchema);
