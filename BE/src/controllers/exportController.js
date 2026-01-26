import { StatusCodes } from "http-status-codes";
import { exportService } from "../services/exportService.js";
import ApiError from "../utils/apiError.js";

/**
 * Export products to Excel
 */
const exportProducts = async (req, res, next) => {
  try {
    const { categoryId, status, search } = req.query;

    const result = await exportService.exportProducts({
      categoryId,
      status,
      search,
    });

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader("Content-Length", result.buffer.length);

    res.status(StatusCodes.OK).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Download import template
 */
const downloadTemplate = async (req, res, next) => {
  try {
    const result = exportService.exportTemplate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader("Content-Length", result.buffer.length);

    res.status(StatusCodes.OK).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export products by category
 */
const exportByCategory = async (req, res, next) => {
  try {
    const result = await exportService.exportByCategory();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader("Content-Length", result.buffer.length);

    res.status(StatusCodes.OK).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export aggregated stock (admin only - for "All branches" view)
 */
const exportAggregatedStock = async (req, res, next) => {
  try {
    const { search, lowStockOnly } = req.query;

    const result = await exportService.exportAggregatedStock({
      search,
      lowStockOnly,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader("Content-Length", result.buffer.length);

    res.status(StatusCodes.OK).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

/**
 * Export stock by specific branch
 */
const exportStockByBranch = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    const { search, lowStockOnly } = req.query;

    const result = await exportService.exportStockByBranch(branchId, {
      search,
      lowStockOnly,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(result.filename)}"`
    );
    res.setHeader("Content-Length", result.buffer.length);

    res.status(StatusCodes.OK).send(result.buffer);
  } catch (error) {
    next(error);
  }
};

export const exportController = {
  exportProducts,
  downloadTemplate,
  exportByCategory,
  exportAggregatedStock,
  exportStockByBranch,
};
