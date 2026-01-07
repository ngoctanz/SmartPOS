import { User } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const createdNew = async (reqBody) => {
  try {
    // Handle empty branchId
    if (reqBody.branchId === "" || reqBody.branchId === null) {
      delete reqBody.branchId;
    }
    return await User.createUser(reqBody);
  } catch (error) {
    // Throw original error to preserve MongoDB error codes
    throw error;
  }
};

const getAllUser = async () => {
  try {
    const users = await User.findAllUsers();
    return users;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllUserPaginated = async (options = {}) => {
  try {
    return await User.findAllUsersPaginated(options);
      } catch (error) {
    throw new Error(error.message || error);
  }
};

const getStats = async () => {
  try {
    return await User.getUserStats();
  } catch (error) {
    throw new Error(error.message || error);
  }
};
const getUserById = async (id) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Id is required!");
    }
    const user = await User.findUserById(id);
    return user;
  } catch (error) {
    throw new Error(error.message || error);
  }
};
const getUserByName = async (name) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    const user = await User.findUsersByName(name);
    return user;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const updateUser = async (id, data, currentUser = null) => {
  try {
    // Không cho phép update các field nhạy cảm (trừ password nếu có)
    const {
      refresh_token,
      userName,
      ...safeData
    } = data;

    // Lấy user cần update
    const userToUpdate = await User.findUserById(id);
    if (!userToUpdate) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Không cho phép sửa tài khoản admin gốc
    if (userToUpdate.userName === "admin" && userToUpdate.role === "admin") {
      throw new ApiError(403, "Không thể chỉnh sửa tài khoản admin hệ thống");
    }

    // Nếu có currentUser (người đang thực hiện)
    if (currentUser) {
      // Không cho phép tự sửa role của chính mình
      if (currentUser.userId.toString() === id && safeData.role && safeData.role !== userToUpdate.role) {
        throw new ApiError(403, "Không thể tự thay đổi vai trò của chính mình");
      }

      // Không cho phép tự khóa chính mình
      if (currentUser.userId.toString() === id && safeData.status === "inactive") {
        throw new ApiError(403, "Không thể tự khóa tài khoản của chính mình");
      }
    }

    // Nếu password rỗng hoặc null thì không update password
    if (!safeData.password || safeData.password === "") {
      delete safeData.password;
    }

    // Xử lý branchId: nếu là empty string thì chuyển thành null
    if (safeData.branchId === "") {
      safeData.branchId = null;
    }

    // Validate branchId nếu có
    if (safeData.branchId) {
      const { Branch } = await import("../models/branchModel.js");
      const branch = await Branch.findById(safeData.branchId);
      if (!branch) {
        throw new ApiError(400, "Chi nhánh không tồn tại");
      }
    }

    const userUpdated = await User.updateUser(id, safeData);
    return userUpdated;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};
const deleteUser = async (id) => {
  try {
    return await User.deleteUser(id);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const toggleUserStatus = async (id) => {
  try {
    const user = await User.findUserById(id);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Không cho phép khóa tài khoản admin chính
    if (user.userName === "admin" && user.role === "admin") {
      throw new ApiError(403, "Không thể khóa tài khoản admin hệ thống");
    }

    // Toggle status
    const newStatus = user.status === "active" ? "inactive" : "active";
    const updatedUser = await User.updateUser(id, { status: newStatus });

    return updatedUser;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};

const bulkToggleStatus = async (ids, status) => {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Danh sách ID không hợp lệ");
    }

    if (!status || !["active", "inactive"].includes(status)) {
      throw new ApiError(400, "Trạng thái không hợp lệ");
    }

    // Lấy danh sách users để kiểm tra
    const users = await User.find({ _id: { $in: ids } }).lean();

    // Lọc ra admin account
    const nonAdminIds = users
      .filter((u) => !(u.userName === "admin" && u.role === "admin"))
      .map((u) => u._id);

    if (nonAdminIds.length === 0) {
      throw new ApiError(403, "Không thể thay đổi trạng thái tài khoản admin");
    }

    // Cập nhật status cho các users
    const result = await User.updateMany(
      { _id: { $in: nonAdminIds } },
      { $set: { status } }
    );

    return { modifiedCount: result.modifiedCount };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};

export const userService = {
  createdNew,
  getUserById,
  getUserByName,
  getAllUser,
  getAllUserPaginated,
  getStats,
  updateUser,
  deleteUser,
  toggleUserStatus,
  bulkToggleStatus,
};
