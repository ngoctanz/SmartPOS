import { StatusCodes } from "http-status-codes";
import { importReceiptService } from "../services/importReceiptService.js";
import ApiError from "../utils/apiError.js";

const create = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.create(
      req.body,
      req.user.userId
    );
    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Import receipt created successfully!",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const confirm = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.confirm(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Import receipt confirmed and stock updated!",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
    try {
        const { branchId } = req.query;
        // branchId is already injected for staff by middleware
        const stats = await importReceiptService.getStats(branchId);
        res.status(StatusCodes.OK).json({
            success: true,
            message: "Get import receipt stats successfully",
            data: stats,
        });
    } catch (error) {
        next(error);
    }
};


const cancel = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.cancel(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Import receipt cancelled!",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    
    // req.query.branchId is handled by middleware (injected for staff)
    if (req.query.branchId) {
       filter.branchId = req.query.branchId;
    }
    
    console.log("getAll Filter:", filter); // Debug log

    const receipts = await importReceiptService.getAll(filter);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipts successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.getById(req.params.id);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipt successfully",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getByCode = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.getByCode(req.params.code);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipt successfully",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getByBarcode = async (req, res, next) => {
  try {
    const receipt = await importReceiptService.getByBarcode(req.params.barcode);
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipt by barcode successfully",
      data: receipt,
    });
  } catch (error) {
    next(error);
  }
};

const getByBranch = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    // Permission check is handled by middleware


    const receipts = await importReceiptService.getByBranch(
      req.params.branchId,
      filter
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipts by branch successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    const receipts = await importReceiptService.getByDateRange(
      startDate,
      endDate,
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get import receipts by date range successfully",
      results: receipts.length,
      data: receipts,
    });
  } catch (error) {
    next(error);
  }
};

const getTotalImport = async (req, res, next) => {
  try {
    const { period, branchId } = req.query;

    const result = await importReceiptService.getTotalImport(
      period || "month",
      branchId || null
    );
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Get total import successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const importReceiptController = {
  getStats,
  create,
  confirm,
  cancel,
  getAll,
  getById,
  getByCode,
  getByBarcode,
  getByBranch,
  getByDateRange,
  getTotalImport,
};
