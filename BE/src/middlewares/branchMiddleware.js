import ApiError from "../utils/apiError.js";

/**
 * Middleware to check if user has access to the requested branch
 * Admin can access all branches
 * Manager/Staff can only access their assigned branch
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
 * Useful for manager/staff who should only see their branch data
 */
export const injectUserBranch = (req, res, next) => {
  try {
    const { role, branchId: userBranchId } = req.user;

    // Admin doesn't need branch injection
    if (role === "admin") {
      return next();
    }

    // Inject user's branch if not specified
    if (!req.body.branchId && !req.query.branchId && !req.params.branchId) {
      if (userBranchId) {
        req.body.branchId = userBranchId;
        req.query.branchId = userBranchId;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
