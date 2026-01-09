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
      .select("name barcode unit currentSalePrice status desc images categoryId")
      .populate("categoryId", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (products.length === 0) {
      throw new ApiError(404, "Không có sản phẩm nào để export");
    }

    // Transform data for Excel (use map for better performance)
    const excelData = products.map((product) => ({
      "Nhóm hàng": product.categoryId?.name || "",
      "Mã vạch": product.barcode || "",
      "Tên hàng": product.name || "",
      "Đơn vị": product.unit || "",
      "Giá bán": product.currentSalePrice || 0,
      "Trạng thái": product.status === "active" ? "Đang bán" : "Ngừng bán",
      "Mô tả": product.desc || "",
      "Hình ảnh": product.images?.join(", ") || "",
    }));

    // Create workbook with optimized settings
    const worksheet = xlsx.utils.json_to_sheet(excelData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 20 }, // Nhóm hàng
      { wch: 15 }, // Mã vạch
      { wch: 30 }, // Tên hàng
      { wch: 10 }, // Đơn vị
      { wch: 15 }, // Giá bán
      { wch: 12 }, // Trạng thái
      { wch: 30 }, // Mô tả
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
 */
const exportTemplate = () => {
  try {
    const templateData = [
      {
        "Nhóm hàng": "Điện thoại",
        "Mã vạch": "8934567890123",
        "Tên hàng": "iPhone 15 Pro Max",
        "Đơn vị": "cái",
        "Giá bán": "29990000",
        "Trạng thái": "Đang bán",
        "Mô tả": "Điện thoại cao cấp",
        "Hình ảnh": "https://example.com/image1.jpg,https://example.com/image2.jpg",
      },
      {
        "Nhóm hàng": "Laptop",
        "Mã vạch": "8934567890124",
        "Tên hàng": "MacBook Pro M3",
        "Đơn vị": "cái",
        "Giá bán": "45990000",
        "Trạng thái": "Đang bán",
        "Mô tả": "Laptop cho developer",
        "Hình ảnh": "https://example.com/macbook.jpg",
      },
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Mẫu sản phẩm");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 30 },
      { wch: 50 },
    ];

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
      .select("name barcode unit currentSalePrice desc categoryId")
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
      }));

      const worksheet = xlsx.utils.json_to_sheet(sheetData);
      
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

export const exportService = {
  exportProducts,
  exportTemplate,
  exportByCategory,
};

export default exportService;
