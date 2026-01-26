import xlsx from "xlsx";
import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

/**
 * Export products to Excel with optimizations
 */
const exportProducts = async (filters = {}) => {
  try {
    const { categoryId, status, search } = filters;

    // Build query
    const query = {};
    
    if (categoryId) {
      query.categoryId = categoryId;
    }
    
    if (status && status !== "all") {
      query.status = status;
    }
    
    if (search && search.trim()) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }

    // Fetch products with lean() and select only needed fields
    const products = await Product.find(query)
      .select("name barcode unit currentSalePrice status desc images categoryId createdAt updatedAt")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (products.length === 0) {
      throw new ApiError(404, "Không có sản phẩm nào để export");
    }

    // Transform data for Excel - Include ALL columns
    const excelData = products.map((product) => ({
      "Mã vạch": product.barcode || "",
      "Tên hàng": product.name || "",
      "Loại sản phẩm": product.categoryId?.name || "",
      "Đơn vị": product.unit || "",
      "Giá bán": product.currentSalePrice || 0,
      "Trạng thái": product.status === "active" ? "Đang bán" : "Ngừng bán",
      "Mô tả": product.desc || "",
      "Ngày tạo": product.createdAt ? new Date(product.createdAt).toLocaleString("vi-VN") : "",
      "Cập nhật": product.updatedAt ? new Date(product.updatedAt).toLocaleString("vi-VN") : "",
      "Hình ảnh": product.images?.join(", ") || "",
    }));

    // Create workbook with optimized settings
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Mã vạch
      { wch: 35 }, // Tên hàng
      { wch: 20 }, // Loại sản phẩm
      { wch: 10 }, // Đơn vị
      { wch: 15 }, // Giá bán
      { wch: 12 }, // Trạng thái
      { wch: 30 }, // Mô tả
      { wch: 18 }, // Ngày tạo
      { wch: 18 }, // Cập nhật
      { wch: 50 }, // Hình ảnh
    ];

    // Generate buffer with compression
    const buffer = xlsx.write(workbook, { 
      type: "buffer", 
      bookType: "xlsx",
      compression: true // Enable compression
    });

    return {
      buffer,
      filename: `san-pham-${Date.now()}.xlsx`,
      count: products.length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi export: ${error.message}`);
  }
};

/**
 * Export products template (empty file with headers)
 * Template này khớp với logic import trong importReceiptService
 */
const exportTemplate = () => {
  try {
    const templateData = [
      {
        "Nhóm hàng(3 Cấp)": "Điện thoại",
        "Mã hàng": "DT001",
        "Mã vạch": "8934567890123",
        "Tên hàng": "iPhone 15 Pro Max 256GB",
        "Giá bán": 29990000,
        "Giá vốn": 27000000,
        "Tồn kho": 10,
        "Hình ảnh (url1, url2...)": "https://example.com/iphone1.jpg, https://example.com/iphone2.jpg",
      },
      {
        "Nhóm hàng(3 Cấp)": "Laptop",
        "Mã hàng": "LT001",
        "Mã vạch": "8934567890124",
        "Tên hàng": "MacBook Pro M3 14 inch",
        "Giá bán": 45990000,
        "Giá vốn": 42000000,
        "Tồn kho": 5,
        "Hình ảnh (url1, url2...)": "https://example.com/macbook.jpg",
      },
      {
        "Nhóm hàng(3 Cấp)": "Phụ kiện",
        "Mã hàng": "PK001",
        "Mã vạch": "8934567890125",
        "Tên hàng": "Tai nghe AirPods Pro 2",
        "Giá bán": 6490000,
        "Giá vốn": 5800000,
        "Tồn kho": 20,
        "Hình ảnh (url1, url2...)": "",
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Mẫu nhập hàng");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 20 }, // Nhóm hàng(3 Cấp)
      { wch: 15 }, // Mã hàng
      { wch: 15 }, // Mã vạch
      { wch: 35 }, // Tên hàng
      { wch: 15 }, // Giá bán
      { wch: 15 }, // Giá vốn
      { wch: 12 }, // Tồn kho
      { wch: 60 }, // Hình ảnh (url1, url2...)
    ];

    // Add instructions in a separate sheet
    const instructions = [
      {
        "Cột": "Nhóm hàng(3 Cấp)",
        "Bắt buộc": "Có",
        "Mô tả": "Tên danh mục sản phẩm. Nếu chưa có sẽ tự động tạo mới.",
        "Ví dụ": "Điện thoại, Laptop, Phụ kiện"
      },
      {
        "Cột": "Mã hàng",
        "Bắt buộc": "Không",
        "Mô tả": "Mã sản phẩm tùy chỉnh của bạn",
        "Ví dụ": "DT001, LT001"
      },
      {
        "Cột": "Mã vạch",
        "Bắt buộc": "Không",
        "Mô tả": "Mã vạch sản phẩm (barcode). Dùng để tìm kiếm nhanh.",
        "Ví dụ": "8934567890123"
      },
      {
        "Cột": "Tên hàng",
        "Bắt buộc": "Có",
        "Mô tả": "Tên sản phẩm",
        "Ví dụ": "iPhone 15 Pro Max 256GB"
      },
      {
        "Cột": "Giá bán",
        "Bắt buộc": "Không",
        "Mô tả": "Giá bán lẻ của sản phẩm",
        "Ví dụ": "29990000"
      },
      {
        "Cột": "Giá vốn",
        "Bắt buộc": "Có",
        "Mô tả": "Giá nhập hàng. Không được âm.",
        "Ví dụ": "27000000"
      },
      {
        "Cột": "Tồn kho",
        "Bắt buộc": "Có",
        "Mô tả": "Số lượng nhập vào kho",
        "Ví dụ": "10"
      },
      {
        "Cột": "Hình ảnh (url1, url2...)",
        "Bắt buộc": "Không",
        "Mô tả": "URL hình ảnh sản phẩm. Nhiều ảnh cách nhau bằng dấu phẩy.",
        "Ví dụ": "https://example.com/img1.jpg, https://example.com/img2.jpg"
      },
    ];

    const instructionSheet = xlsx.utils.json_to_sheet(instructions);
    instructionSheet["!cols"] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 50 },
      { wch: 40 },
    ];
    xlsx.utils.book_append_sheet(workbook, instructionSheet, "Hướng dẫn");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    return {
      buffer,
      filename: `mau-import-san-pham.xlsx`,
    };
  } catch (error) {
    throw new ApiError(500, `Lỗi tạo template: ${error.message}`);
  }
};

/**
 * Export products by category (optimized for large datasets)
 */
const exportByCategory = async () => {
  try {
    // Fetch all products in one query with only needed fields
    const products = await Product.find({ status: "active" })
      .select("name barcode unit currentSalePrice desc images categoryId createdAt updatedAt")
      .populate("categoryId", "name")
      .sort({ categoryId: 1, name: 1 })
      .lean();

    if (products.length === 0) {
      throw new ApiError(404, "Không có sản phẩm nào");
    }

    // Group products by category using Map for O(n) performance
    const productsByCategory = new Map();
    
    products.forEach((product) => {
      const categoryName = product.categoryId?.name || "Chưa phân loại";
      if (!productsByCategory.has(categoryName)) {
        productsByCategory.set(categoryName, []);
      }
      productsByCategory.get(categoryName).push(product);
    });

    // Create workbook with multiple sheets
    const workbook = xlsx.utils.book_new();

    // Add summary sheet
    const summaryData = Array.from(productsByCategory.entries()).map(
      ([categoryName, products]) => ({
        "Loại sản phẩm": categoryName,
        "Số lượng": products.length,
        "Tổng giá trị": products.reduce((sum, p) => sum + (p.currentSalePrice || 0), 0),
      })
    );

    const summarySheet = xlsx.utils.json_to_sheet(summaryData);
    xlsx.utils.book_append_sheet(workbook, summarySheet, "Tổng quan");

    // Add sheet for each category (limit to prevent Excel sheet limit)
    let sheetCount = 0;
    const MAX_SHEETS = 250; // Excel limit is 255, leave some buffer

    for (const [categoryName, products] of productsByCategory.entries()) {
      if (sheetCount >= MAX_SHEETS) break;

      const sheetData = products.map((product) => ({
        "Mã vạch": product.barcode || "",
        "Tên hàng": product.name || "",
        "Đơn vị": product.unit || "",
        "Giá bán": product.currentSalePrice || 0,
        "Mô tả": product.desc || "",
        "Ngày tạo": product.createdAt ? new Date(product.createdAt).toLocaleString("vi-VN") : "",
        "Cập nhật": product.updatedAt ? new Date(product.updatedAt).toLocaleString("vi-VN") : "",
        "Hình ảnh": product.images?.join(", ") || "",
      }));

      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      
      // Set column widths for category sheets
      worksheet["!cols"] = [
        { wch: 15 }, // Mã vạch
        { wch: 35 }, // Tên hàng
        { wch: 10 }, // Đơn vị
        { wch: 15 }, // Giá bán
        { wch: 30 }, // Mô tả
        { wch: 18 }, // Ngày tạo
        { wch: 18 }, // Cập nhật
        { wch: 50 }, // Hình ảnh
      ];
      
      // Sanitize sheet name (max 31 chars, no special chars)
      const sheetName = categoryName.substring(0, 31).replace(/[:\\/?*\[\]]/g, "");
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
      sheetCount++;
    }

    // Generate buffer with compression
    const buffer = xlsx.write(workbook, { 
      type: "buffer", 
      bookType: "xlsx",
      compression: true
    });

    return {
      buffer,
      filename: `san-pham-theo-danh-muc-${Date.now()}.xlsx`,
      count: products.length,
      categories: productsByCategory.size,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi export theo danh mục: ${error.message}`);
  }
};

/**
 * Export aggregated stock by product (for admin "All branches" view)
 */
const exportAggregatedStock = async (filters = {}) => {
  try {
    const { BranchProduct } = await import("../models/branchProductModel.js");
    const { search, lowStockOnly } = filters;

    // Use the same aggregation logic as the API
    const options = {
      search,
      page: 1,
      limit: 999999, // Get all for export
      lowStockOnly: lowStockOnly === "true",
    };

    const result = await BranchProduct.findAggregatedByProduct(options);
    
    if (!result.data || result.data.length === 0) {
      throw new ApiError(404, "Không có dữ liệu tồn kho để export");
    }

    // Transform data for Excel - Include ALL columns from response
    const excelData = result.data.map((item) => ({
      "Mã vạch": item.productId?.barcode || "",
      "Mã hàng": item.productCode || "",
      "Tên hàng": item.productId?.name || "",
      "Loại sản phẩm": item.productId?.categoryId?.name || "",
      "Đơn vị": item.productId?.unit || "",
      "Tồn kho": item.stock || 0,
      "Định mức tối thiểu": item.minStock || 0,
      "Số chi nhánh": item.branchCount || 0,
      "Giá bán": item.productId?.currentSalePrice || 0,
      "Giá nhập gần nhất": item.lastImportPrice || "",
      "Ghi chú": item.note || "",
      "Trạng thái": item.productId?.status === "active" ? "Đang bán" : "Ngừng bán",
      "Cập nhật": item.updatedAt ? new Date(item.updatedAt).toLocaleString("vi-VN") : "",
      "Hình ảnh": item.productId?.images?.join(", ") || "",
    }));

    // Create workbook
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Tồn kho tổng hợp");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Mã vạch
      { wch: 15 }, // Mã hàng
      { wch: 35 }, // Tên hàng
      { wch: 20 }, // Loại sản phẩm
      { wch: 10 }, // Đơn vị
      { wch: 12 }, // Tồn kho
      { wch: 18 }, // Định mức tối thiểu
      { wch: 12 }, // Số chi nhánh
      { wch: 15 }, // Giá bán
      { wch: 18 }, // Giá nhập gần nhất
      { wch: 30 }, // Ghi chú
      { wch: 12 }, // Trạng thái
      { wch: 18 }, // Cập nhật
      { wch: 50 }, // Hình ảnh
    ];

    // Generate buffer with compression
    const buffer = xlsx.write(workbook, { 
      type: "buffer", 
      bookType: "xlsx",
      compression: true
    });

    return {
      buffer,
      filename: `ton-kho-tong-hop-${Date.now()}.xlsx`,
      count: result.data.length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi export tồn kho: ${error.message}`);
  }
};

/**
 * Export stock by specific branch
 */
const exportStockByBranch = async (branchId, filters = {}) => {
  try {
    const { BranchProduct } = await import("../models/branchProductModel.js");
    const { Branch } = await import("../models/branchModel.js");
    const { search, lowStockOnly } = filters;

    // Validate branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(404, "Chi nhánh không tồn tại");
    }

    // Use the same logic as the API
    const options = {
      search,
      page: 1,
      limit: 999999, // Get all for export
      lowStockOnly: lowStockOnly === "true",
    };

    const result = await BranchProduct.findByBranch(branchId, options);
    
    if (!result.data || result.data.length === 0) {
      throw new ApiError(404, "Không có dữ liệu tồn kho để export");
    }

    // Transform data for Excel - Include ALL columns
    const excelData = result.data.map((item) => ({
      "Mã vạch": item.productId?.barcode || "",
      "Mã hàng": item.productCode || "",
      "Tên hàng": item.productId?.name || "",
      "Loại sản phẩm": item.productId?.categoryId?.name || "",
      "Đơn vị": item.productId?.unit || "",
      "Tồn kho": item.stock || 0,
      "Định mức tối thiểu": item.minStock || 0,
      "Giá bán": item.salePrice || item.productId?.currentSalePrice || 0,
      "Giá nhập gần nhất": item.lastImportPrice || "",
      "Ghi chú": item.note || "",
      "Trạng thái": item.status === "active" ? "Đang bán" : item.status === "inactive" ? "Ngừng bán" : "",
      "Cập nhật": item.updatedAt ? new Date(item.updatedAt).toLocaleString("vi-VN") : "",
      "Hình ảnh": item.productId?.images?.join(", ") || "",
    }));

    // Create workbook
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, `Tồn kho ${branch.name}`);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Mã vạch
      { wch: 15 }, // Mã hàng
      { wch: 35 }, // Tên hàng
      { wch: 20 }, // Loại sản phẩm
      { wch: 10 }, // Đơn vị
      { wch: 12 }, // Tồn kho
      { wch: 18 }, // Định mức tối thiểu
      { wch: 15 }, // Giá bán
      { wch: 18 }, // Giá nhập gần nhất
      { wch: 30 }, // Ghi chú
      { wch: 12 }, // Trạng thái
      { wch: 18 }, // Cập nhật
      { wch: 50 }, // Hình ảnh
    ];

    // Generate buffer with compression
    const buffer = xlsx.write(workbook, { 
      type: "buffer", 
      bookType: "xlsx",
      compression: true
    });

    return {
      buffer,
      filename: `ton-kho-${branch.name}-${Date.now()}.xlsx`,
      count: result.data.length,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi export tồn kho chi nhánh: ${error.message}`);
  }
};

export const exportService = {
  exportProducts,
  exportTemplate,
  exportByCategory,
  exportAggregatedStock,
  exportStockByBranch,
};

export default exportService;
