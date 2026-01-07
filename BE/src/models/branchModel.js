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
    return this.find(filter).sort({ createdAt: -1 }).lean();
  },

  async findAllBranchesPaginated(options = {}) {
    const { search, page = 1, limit = 20 } = options;
    
    const query = {};
    
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

  async findBranchById(id) {
    const branch = await this.findOne({ _id: id }).lean();
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async findBranchByName(name) {
    return this.find({
      branchName: new RegExp(name, "i"),
    }).lean();
  },

  async updateBranch(id, data) {
    const branch = await this.findOneAndUpdate(
      { _id: id },
      data,
      { new: true, runValidators: true }
    );
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async deleteBranch(id) {
    const branch = await this.findByIdAndDelete(id);
    if (!branch) throw new Error("Branch not found");
    return branch;
  },

  async deleteManyBranches(ids) {
    const result = await this.deleteMany({ _id: { $in: ids } });
    return result;
  },
};

export const Branch = mongoose.model("Branch", branchSchema);
