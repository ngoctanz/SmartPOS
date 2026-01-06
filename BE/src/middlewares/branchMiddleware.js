import ApiError from "../utils/apiError.js";

/**
 * Middleware to check if user has access to the requested branch
 * Admin can access all branches
 * Staff can only access their assigned branch
 */
export const checkBranchAccess = (req, res, next) => {
  try {
    const { role, branchId: userBranchId } = req.user;
    const requestedBranchId =
      req.params.branchId || req.body.branchId || req.query.branchId;

    // Admin can access all branches
    if (role === "admin") {
      return next();
    }

    // If no branch specified in request, allow (will use user's branch)
    if (!requestedBranchId) {
      return next();
    }

    // Check if user's branch matches requested branch
    if (userBranchId && userBranchId.toString() !== requestedBranchId) {
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
 *   + POST/PUT/PATCH: BẮT BUỘC phải có branchId trong body
 */
export const injectUserBranch = (req, res, next) => {
  try {
    const { role, branchId: userBranchId } = req.user;
    const method = req.method.toUpperCase();
    const isWriteOperation = ["POST", "PUT", "PATCH"].includes(method);

    // Admin: Không inject
    if (role === "admin") {
      // Với các thao tác ghi (POST, PUT, PATCH), admin PHẢI truyền branchId trong body
      if (isWriteOperation && !req.body.branchId) {
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

    // Inject vào body (cho POST/PUT/PATCH)
    if (!req.body.branchId) {
      req.body.branchId = userBranchId;
    }
    
    // Inject vào query (cho GET)
    if (!req.query.branchId) {
      req.query.branchId = userBranchId;
    }

    // Kiểm tra nếu user cố tình truyền branchId khác với branchId của mình
    const requestedBranchId = req.body.branchId || req.query.branchId;
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
