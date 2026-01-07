/**
 * Branch Security Utilities
 * Defense-in-depth: Double check branch access at service layer
 */
import ApiError from "./apiError.js";

/**
 * Validate user has access to the specified branchId
 * @param {Object} user - User object from req.user
 * @param {string} branchId - Branch ID to check access for
 * @param {string} action - Action being performed (for error message)
 * @throws {ApiError} 403 if user doesn't have access
 */
export const validateBranchAccess = (user, branchId, action = "access") => {
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  // Admin can access all branches
  if (user.role === "admin") {
    return true;
  }

  // Staff must have a branch
  if (!user.branchId) {
    throw new ApiError(403, "User does not belong to any branch");
  }

  // Staff can only access their own branch
  if (branchId && user.branchId.toString() !== branchId.toString()) {
    throw new ApiError(403, `You do not have permission to ${action} this branch's data`);
  }

  return true;
};

/**
 * Build secure filter that automatically includes branchId for non-admin users
 * @param {Object} user - User object from req.user
 * @param {Object} baseFilter - Base filter object
 * @returns {Object} Filter with branchId constraint for staff
 */
export const buildSecureFilter = (user, baseFilter = {}) => {
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  // Admin can see all (unless they specify branchId)
  if (user.role === "admin") {
    return baseFilter;
  }

  // Staff: ALWAYS filter by their branchId
  if (!user.branchId) {
    throw new ApiError(403, "User does not belong to any branch");
  }

  return {
    ...baseFilter,
    branchId: user.branchId,
  };
};

/**
 * Validate a record belongs to user's branch
 * @param {Object} user - User object from req.user
 * @param {Object} record - Record with branchId field
 * @param {string} recordType - Type of record (for error message)
 * @throws {ApiError} 403 if record doesn't belong to user's branch
 */
export const validateRecordAccess = (user, record, recordType = "record") => {
  if (!user) {
    throw new ApiError(401, "Authentication required");
  }

  if (!record) {
    throw new ApiError(404, `${recordType} not found`);
  }

  // Admin can access all records
  if (user.role === "admin") {
    return true;
  }

  // Staff must have a branch
  if (!user.branchId) {
    throw new ApiError(403, "User does not belong to any branch");
  }

  // Get branchId from record (handle populated vs non-populated)
  const recordBranchId = record.branchId?._id || record.branchId;
  
  if (!recordBranchId) {
    throw new ApiError(500, `${recordType} has no branch information`);
  }

  if (recordBranchId.toString() !== user.branchId.toString()) {
    throw new ApiError(403, `You do not have access to this ${recordType}`);
  }

  return true;
};
