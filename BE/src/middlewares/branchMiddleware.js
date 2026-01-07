import ApiError from "../utils/apiError.js";


export const checkBranchAccess = (req, res, next) => {
  try {
    const { role, branchId: userBranchId } = req.user;
    // Check params, body, query for branchId
    const requestedBranchId =
      req.params.branchId ||
      (req.body && req.body.branchId) ||
      req.query.branchId;

    // Admin can access all branches
    if (role === "admin") {
      return next();
    }

    // If no branch specified in request, allow (will use user's branch from injection)
    if (!requestedBranchId) {
      return next();
    }

    // Staff must have a branch
    if (!userBranchId) {
      return next(new ApiError(403, "User does not belong to any branch"));
    }

    // Check if user's branch matches requested branch
    if (userBranchId.toString() !== requestedBranchId.toString()) {
      return next(
        new ApiError(403, "You do not have access to this branch")
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};


export const injectUserBranch = (options = {}) => {
  const { requireBranchForWrite = true } = options;
  
  return (req, res, next) => {
    try {
      const { role, branchId: userBranchId } = req.user;
      const method = req.method.toUpperCase();
      const isWriteOperation = ["POST", "PUT", "PATCH"].includes(method);

      // Admin: Không inject
      if (role === "admin") {
        if (requireBranchForWrite && isWriteOperation && !req.body?.branchId) {
          return next(
            new ApiError(400, "branchId is required for this operation")
          );
        }
        // GET: Admin có thể xem tất cả hoặc filter theo branchId
        return next();
      }

      // Staff: Kiểm tra user có branchId không
      if (!userBranchId) {
        return next(
          new ApiError(403, "User does not belong to any branch")
        );
      }

      // Inject vào body (cho POST/PUT/PATCH) - ensure req.body exists
      if (isWriteOperation && req.body && !req.body.branchId) {
        req.body.branchId = userBranchId;
      }
      
      // Inject vào query (cho GET)
      if (!req.query.branchId) {
        req.query.branchId = userBranchId;
      }

      // Kiểm tra nếu user cố tình truyền branchId khác với branchId của mình (bao gồm params, body, query)
      const explicitBranchId = 
          req.params.branchId || 
          (req.body && req.body.branchId) || 
          req.query.branchId;

      if (explicitBranchId && explicitBranchId.toString() !== userBranchId.toString()) {
        return next(
          new ApiError(403, "Forbidden: You can only access your own branch")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Backward compatible version (no options) - use as middleware directly
export const injectUserBranchSimple = (req, res, next) => {
  return injectUserBranch()(req, res, next);
};

export const validateRecordBranchAccess = (getRecordBranchId) => {
  return async (req, res, next) => {
    try {
      const { role, branchId: userBranchId } = req.user;

      // Admin can access all records
      if (role === "admin") {
        return next();
      }

      // Staff must have a branch
      if (!userBranchId) {
        return next(new ApiError(403, "User does not belong to any branch"));
      }

      // Get the record's branchId
      const recordBranchId = await getRecordBranchId(req);
      
      if (!recordBranchId) {
        // Record not found or no branchId - let the controller handle 404
        return next();
      }

      // Compare branchIds
      const recordBranchIdStr = recordBranchId._id 
        ? recordBranchId._id.toString() 
        : recordBranchId.toString();
        
      if (recordBranchIdStr !== userBranchId.toString()) {
        return next(new ApiError(403, "You do not have access to this record"));
      }

      next();
    } catch (error) {
      // If record not found, let controller handle it
      if (error.message?.includes("not found")) {
        return next();
      }
      next(error);
    }
  };
};
