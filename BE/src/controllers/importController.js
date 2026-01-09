import { StatusCodes } from "http-status-codes";
import { importService } from "../services/importService.js";
import ApiError from "../utils/apiError.js";

/**
 * Preview Excel data before importing
 */
const preview = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "Vui lòng tải lên file Excel");
    }

    const result = await importService.previewExcelData(req.file.buffer);
    
    res.status(StatusCodes.OK).json({
      success: true,
      message: "Preview dữ liệu thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import products from Excel file
 */
const importProducts = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "Vui lòng tải lên file Excel");
    }

    const result = await importService.importProducts(req.file.buffer);
    
    // Prepare detailed response
    const response = {
      success: true,
      message: `Import hoàn tất: ${result.created} tạo mới, ${result.updated} cập nhật`,
      data: {
        summary: {
          total: result.total,
          parsed: result.parsed,
          created: result.created,
          updated: result.updated,
          skipped: result.skipped,
          failed: result.failed,
        },
        errors: result.errors.slice(0, 50), // Limit to first 50 errors
        hasMoreErrors: result.errors.length > 50,
        totalErrors: result.errors.length,
      },
    };

    // Add warning if there are errors
    if (result.errors.length > 0) {
      response.warning = `Có ${result.errors.length} sản phẩm không thể import. Xem chi tiết trong data.errors`;
    }

    // Add info about missing row
    if (result.total > result.parsed) {
      response.info = `${result.total - result.parsed} dòng bị bỏ qua do validation lỗi`;
    }
    
    res.status(StatusCodes.OK).json(response);
  } catch (error) {
    next(error);
  }
};

export const importController = {
  preview,
  importProducts,
};
