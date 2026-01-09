import { User } from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const createdNew = async (reqBody, currentUser = null) => {
  try {
    // Handle empty branchId
    if (reqBody.branchId === "" || reqBody.branchId === null) {
      delete reqBody.branchId;
    }

    // Manager can only create staff for their own branch
    if (currentUser && currentUser.role === "manager") {
      // Manager can only create staff role
      if (reqBody.role && reqBody.role !== "staff") {
        throw new ApiError(403, "Manager chỉ có thể tạo tài khoản staff");
      }
      // Force role to staff
      reqBody.role = "staff";
      // Force branchId to manager's branch
      reqBody.branchId = currentUser.branchId;
    }

    return await User.createUser(reqBody);
  } catch (error) {
    // Throw original error to preserve MongoDB error codes
    throw error;
  }
};

const getAllUser = async (currentUser = null) => {
  try {
    // Manager can only see users in their branch
    if (currentUser && currentUser.role === "manager") {
      return await User.find({ branchId: currentUser.branchId }).lean();
    }
    const users = await User.findAllUsers();
    return users;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getAllUserPaginated = async (options = {}, currentUser = null) => {
  try {
    // Manager can only see users in their branch
    if (currentUser && currentUser.role === "manager") {
      options.branchId = currentUser.branchId;
    }
    return await User.findAllUsersPaginated(options);
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getStats = async (currentUser = null) => {
  try {
    // Manager can only see stats for their branch
    if (currentUser && currentUser.role === "manager") {
      const total = await User.countDocuments({ branchId: currentUser.branchId });
      const active = await User.countDocuments({ branchId: currentUser.branchId, status: "active" });
      const inactive = await User.countDocuments({ branchId: currentUser.branchId, status: "inactive" });
      return { total, active, inactive };
    }
    return await User.getUserStats();
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getUserById = async (id, currentUser = null) => {
  try {
    if (!id || id.trim() === "") {
      throw new ApiError(400, "Id is required!");
    }
    const user = await User.findUserById(id);
    
    // Manager can only view users in their branch
    if (currentUser && currentUser.role === "manager") {
      if (!user.branchId || user.branchId.toString() !== currentUser.branchId.toString()) {
        throw new ApiError(403, "Bạn không có quyền xem người dùng này");
      }
    }
    
    return user;
  } catch (error) {
    throw new Error(error.message || error);
  }
};

const getUserByName = async (name, currentUser = null) => {
  try {
    if (!name || name.trim() === "") {
      throw new ApiError(400, "Search name is required!");
    }
    let users = await User.findUsersByName(name);
    
    // Manager can only see users in their branch
    if (currentUser && currentUser.role === "manager") {
      users = users.filter(u => u.branchId && u.branchId.toString() === currentUser.branchId.toString());
    }
    
    return users;
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
      // Manager restrictions
      if (currentUser.role === "manager") {
        // Manager can only update users in their branch
        if (!userToUpdate.branchId || userToUpdate.branchId.toString() !== currentUser.branchId.toString()) {
          throw new ApiError(403, "Bạn không có quyền chỉnh sửa người dùng này");
        }
        // Manager cannot change user's role to admin or manager
        if (safeData.role && safeData.role !== "staff") {
          throw new ApiError(403, "Manager chỉ có thể đặt vai trò staff");
        }
        // Manager cannot change user's branch
        if (safeData.branchId && safeData.branchId.toString() !== currentUser.branchId.toString()) {
          throw new ApiError(403, "Manager không thể chuyển người dùng sang chi nhánh khác");
        }
        // Force branchId to manager's branch
        safeData.branchId = currentUser.branchId;
      }

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

const deleteUser = async (id, currentUser = null) => {
  try {
    const userToDelete = await User.findUserById(id);
    
    // Manager can only delete users in their branch
    if (currentUser && currentUser.role === "manager") {
      if (!userToDelete.branchId || userToDelete.branchId.toString() !== currentUser.branchId.toString()) {
        throw new ApiError(403, "Bạn không có quyền xóa người dùng này");
      }
      // Manager cannot delete other managers or admins
      if (userToDelete.role === "admin" || userToDelete.role === "manager") {
        throw new ApiError(403, "Manager không thể xóa tài khoản admin hoặc manager khác");
      }
    }
    
    return await User.deleteUser(id);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(error.message || error);
  }
};

const toggleUserStatus = async (id, currentUser = null) => {
  try {
    const user = await User.findUserById(id);
    if (!user) {
      throw new ApiError(404, "Không tìm thấy người dùng");
    }

    // Không cho phép khóa tài khoản admin chính
    if (user.userName === "admin" && user.role === "admin") {
      throw new ApiError(403, "Không thể khóa tài khoản admin hệ thống");
    }

    // Manager restrictions
    if (currentUser && currentUser.role === "manager") {
      // Manager can only toggle users in their branch
      if (!user.branchId || user.branchId.toString() !== currentUser.branchId.toString()) {
        throw new ApiError(403, "Bạn không có quyền thay đổi trạng thái người dùng này");
      }
      // Manager cannot toggle other managers or admins
      if (user.role === "admin" || user.role === "manager") {
        throw new ApiError(403, "Manager không thể thay đổi trạng thái tài khoản admin hoặc manager khác");
      }
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

const bulkToggleStatus = async (ids, status, currentUser = null) => {
  try {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new ApiError(400, "Danh sách ID không hợp lệ");
    }

    if (!status || !["active", "inactive"].includes(status)) {
      throw new ApiError(400, "Trạng thái không hợp lệ");
    }

    // Lấy danh sách users để kiểm tra
    const users = await User.find({ _id: { $in: ids } }).lean();

    // Lọc ra admin account và apply manager restrictions
    let validIds = users
      .filter((u) => !(u.userName === "admin" && u.role === "admin"))
      .map((u) => u);

    // Manager restrictions
    if (currentUser && currentUser.role === "manager") {
      validIds = validIds.filter(u => 
        u.branchId && 
        u.branchId.toString() === currentUser.branchId.toString() &&
        u.role === "staff" // Manager can only toggle staff
      );
    }

    const validUserIds = validIds.map(u => u._id);

    if (validUserIds.length === 0) {
      throw new ApiError(403, "Không có người dùng nào có thể thay đổi trạng thái");
    }

    // Cập nhật status cho các users
    const result = await User.updateMany(
      { _id: { $in: validUserIds } },
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
