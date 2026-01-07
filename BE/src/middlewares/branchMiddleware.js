import ApiError from "../utils/apiError.js";

/**
 * Middleware to check if user has access to the requested branch
 * Admin can access all branches
 * Staff can only access their assigned branch
 */
export const checkBranchAccess = (req, res, next) => {
  try {
    const { role, branchId: userBranchId } = req.user;
    // Ưu tiên params vì đây là route-level check
    const requestedBranchId = req.params.branchId;

    // Admin can access all branches
    if (role === "admin") {
      return next();
    }

    // If no branch specified in params, allow (will use user's branch from query/body)
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

/**
 * Middleware to inject user's branch if not specified
 * - Staff: Tự động inject branchId từ token vào body và query
 * - Admin: 
 *   + GET: Không bắt buộc branchId (có thể xem tất cả)
 *   + POST/PUT/PATCH: BẮT BUỘC phải có branchId trong body (trừ khi skipBranchRequirement = true)
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireBranchForWrite - Require branchId for write operations (default: true)
 */
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
      if (req.body && !req.body.branchId) {
        req.body.branchId = userBranchId;
      }
      
      // Inject vào query (cho GET)
      if (!req.query.branchId) {
        req.query.branchId = userBranchId;
      }

      // Kiểm tra nếu user cố tình truyền branchId khác với branchId của mình
      const requestedBranchId = req.body?.branchId || req.query.branchId;
      if (requestedBranchId && requestedBranchId.toString() !== userBranchId.toString()) {
        return next(
          new ApiError(403, "You can only access your own branch")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Backward compatible version (no options)
export const injectUserBranchSimple = (req, res, next) => {
  return injectUserBranch()(req, res, next);
};

/**
 * Middleware to validate branch access for a specific record
 * Use this for routes like GET /:id, GET /code/:code where we need to check
 * if the fetched record belongs to user's branch
 * 
 * @param {Function} getRecordBranchId - Function to extract branchId from the record
 *   Receives (req) and should return a Promise that resolves to the branchId
 */
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
