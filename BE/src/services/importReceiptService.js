import { parseExcelFile, getCellValue } from "../utils/excelParser.js";
import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import { ImportReceipt } from "../models/importReceiptModel.js";
import { BranchProduct } from "../models/branchProductModel.js";
import ApiError from "../utils/apiError.js";
import { validateBranchAccess } from "../utils/branchSecurity.js";

// ============ EXCEL IMPORT LOGIC ============
/**
 * Map Excel row to Receive Receipt Item (Product + Quantity + ImportPrice)
 */
const mapRowToReceiptItem = (row, rowIndex) => {
  // Use shared util to extract basic product info
  const categoryName = getCellValue(row, [
    "nhom hang", "nhóm hàng",
    "loai san pham", "loại sản phẩm", 
    "category"
  ]);
  
  const barcode = getCellValue(row, [
    "ma vach", "mã vạch",
    "barcode"
  ]);
  
  const name = getCellValue(row, [
    "ten hang", "tên hàng",
    "ten san pham", "tên sản phẩm",
    "name", "product name"
  ]);
  
  const salePrice = getCellValue(row, [
    "gia ban", "giá bán",
    "price", "sale price"
  ]);
  
  const images = getCellValue(row, [
    "hinh anh", "hình ảnh",
    "images", "image"
  ]);

  // Specific fields for Import Receipt
  const quantity = getCellValue(row, [
    "so luong", "số lượng",
    "ton kho", "tồn kho",
    "quantity", "qty", "stock"
  ]);

  const importPrice = getCellValue(row, [
    "gia von", "giá vốn",
    "gia nhap", "giá nhập",
    "import price", "cost"
  ]);

  return {
    // Info for verifying/creating product
    categoryName,
    barcode: barcode || undefined,
    name,
    images: images ? images.split(",").map(url => url.trim()).filter(url => url) : [],
    
    // Receipt numeric fields
    salePrice: salePrice ? parseFloat(String(salePrice).replace(/[^\d.-]/g, "")) : 0,
    quantity: quantity ? parseInt(String(quantity).replace(/[^\d]/g, ""), 10) : 0,
    importPrice: importPrice ? parseFloat(String(importPrice).replace(/[^\d.-]/g, "")) : 0,
    
    _rowIndex: rowIndex,
  };
};

/**
 * Validate item data
 */
const validateItemData = (item, rowIndex) => {
  const errors = [];
  if (!item.name) errors.push(`Dòng ${rowIndex + 2}: Thiếu tên sản phẩm`);
  if (!item.categoryName) errors.push(`Dòng ${rowIndex + 2}: Thiếu nhóm hàng`);
  if (item.quantity < 0) errors.push(`Dòng ${rowIndex + 2}: Số lượng không được âm`);
  if (item.importPrice < 0) errors.push(`Dòng ${rowIndex + 2}: Giá vốn không được âm`);
  return errors;
};

/**
 * Process import receipt from Excel
 */
const importReceiptFromExcel = async (fileBuffer, branchId, userId) => {
  try {
    const rawData = parseExcelFile(fileBuffer);
    const parsedItems = rawData.map((row, index) => mapRowToReceiptItem(row, index));

    // Validate
    const validationErrors = [];
    const validItems = [];

    parsedItems.forEach((item, index) => {
      const errors = validateItemData(item, index);
      if (errors.length > 0) {
        errors.forEach(err => validationErrors.push(err));
      } else {
        validItems.push(item);
      }
    });

    if (validationErrors.length > 0) {
      // If too many errors, abort early
      if (validationErrors.length > 20) {
        throw new ApiError(400, "File có quá nhiều lỗi. Vui lòng kiểm tra lại định dạng.");
      }
    }

    if (validItems.length === 0) {
      throw new ApiError(400, "Không tìm thấy dữ liệu hợp lệ để nhập hàng");
    }

    // --- PHASE 1: PREPARE DATA (Category & Product) ---
    // 1.1 Create missing categories
    const uniqueCategoryNames = [...new Set(validItems.map(i => i.categoryName))];
    const categoryCache = new Map(); // Name -> Category Document

    // Fetch existing
    const existingCats = await Category.find({
      name: { $in: uniqueCategoryNames.map(n => new RegExp(`^${n}$`, "i")) }
    });
    existingCats.forEach(c => categoryCache.set(c.name.toLowerCase(), c));

    // Create missing
    const missingCats = uniqueCategoryNames.filter(n => !categoryCache.has(n.toLowerCase()));
    if (missingCats.length > 0) {
      const newCats = await Category.insertMany(
        missingCats.map(n => ({ name: n })), 
        { ordered: false }
      );
      newCats.forEach(c => categoryCache.set(c.name.toLowerCase(), c));
    }

    // 1.2 Identify Products (Map by Barcode OR Name)
    // We need to know which products already exist to get their ID, 
    // and which ones need to be created.
    
    // Strategy: 
    // - Map 1: Barcode -> Product
    // - Map 2: Name -> Product (fallback)
    
    const barcodes = validItems.map(i => i.barcode).filter(Boolean);
    const names = validItems.map(i => i.name).filter(Boolean);

    const existingProducts = await Product.find({
      $or: [
        { barcode: { $in: barcodes } },
        { name: { $in: names.map(n => new RegExp(`^${n}$`, "i")) } }
      ]
    }).populate('categoryId', 'name');

    const productMapByBarcode = new Map();
    const productMapByNameCategory = new Map(); // Key: "categoryId:name"

    existingProducts.forEach(p => {
      if (p.barcode) productMapByBarcode.set(p.barcode, p);
      if (p.name && p.categoryId) {
        const key = `${p.categoryId._id}:${p.name.toLowerCase()}`;
        productMapByNameCategory.set(key, p);
      }
    });

    // 1.3 Create missing products
    const productsToCreate = [];
    const itemsNeedCreation = [];

    // Temporary map to avoid creating duplicates within the items list itself
    // Key format: "barcode" (if exists) or "categoryId:name" (if no barcode)
    const newProductsTempMap = new Map(); 

    for (const item of validItems) {
      const category = categoryCache.get(item.categoryName.toLowerCase());
      if (!category) {
        continue;
      }

      // Check existence in database
      let foundProduct = null;
      if (item.barcode) {
        foundProduct = productMapByBarcode.get(item.barcode);
      }
      if (!foundProduct) {
        // If no barcode or not found by barcode, try by name + category
        const key = `${category._id}:${item.name.toLowerCase()}`;
        foundProduct = productMapByNameCategory.get(key);
      }

      if (!foundProduct) {
        // Create unique key: barcode (if exists) or "categoryId:name"
        const tempKey = item.barcode 
          ? `barcode:${item.barcode}` 
          : `${category._id}:${item.name.toLowerCase()}`;
        
        if (newProductsTempMap.has(tempKey)) {
          continue; 
        }

        const newProductData = {
          categoryId: category._id,
          name: item.name,
          barcode: item.barcode,
          currentSalePrice: item.salePrice,
          images: item.images,
          unit: "cái",
          status: "active",
        };
        
        productsToCreate.push(newProductData);
        newProductsTempMap.set(tempKey, newProductData);
      }
    }

    // Bulk Insert New Products
    if (productsToCreate.length > 0) {
      try {
        const createdProducts = await Product.insertMany(productsToCreate, { ordered: false });
        // Add new products to maps
        createdProducts.forEach(p => {
          if (p.barcode) productMapByBarcode.set(p.barcode, p);
          if (p.name && p.categoryId) {
            const key = `${p.categoryId}:${p.name.toLowerCase()}`;
            productMapByNameCategory.set(key, p);
          }
        });
      } catch (error) {
        // Handle bulk insert errors (e.g., duplicate key errors)
        // insertMany with ordered:false will insert successful docs even if some fail
        if (error.writeErrors) {
          // Some products were created, some failed
          // Re-fetch all products to update maps
          const allBarcodes = productsToCreate.map(p => p.barcode).filter(Boolean);
          const allNames = productsToCreate.map(p => p.name).filter(Boolean);
          
          const recentlyCreated = await Product.find({
            $or: [
              { barcode: { $in: allBarcodes } },
              { name: { $in: allNames.map(n => new RegExp(`^${n}$`, "i")) } }
            ]
          }).populate('categoryId', 'name');
          
          recentlyCreated.forEach(p => {
            if (p.barcode) productMapByBarcode.set(p.barcode, p);
            if (p.name && p.categoryId) {
              const key = `${p.categoryId._id}:${p.name.toLowerCase()}`;
              productMapByNameCategory.set(key, p);
            }
          });
        } else {
          throw error; // Re-throw if it's not a bulk write error
        }
      }
    }

    // --- PHASE 2: ASSEMBLE IMPORT RECEIPT ---
    const receiptProducts = [];
    let totalAmount = 0;
    const errorsRecording = [];

    for (const item of validItems) {
      const category = categoryCache.get(item.categoryName.toLowerCase());
      
      // Resolve Product ID again
      let product = null;
      if (item.barcode) {
        product = productMapByBarcode.get(item.barcode);
      }
      if (!product && category) {
        // Try to find by name + category
        const key = `${category._id}:${item.name.toLowerCase()}`;
        product = productMapByNameCategory.get(key);
      }

      if (!product) {
        errorsRecording.push(`Không thể tạo sản phẩm: ${item.name} (${item.categoryName}) - barcode: ${item.barcode || 'N/A'}`);
        continue;
      }

      // Add to receipt list
      const subtotal = item.quantity * item.importPrice;
      totalAmount += subtotal;

      receiptProducts.push({
        productId: product._id,
        productName: product.name,
        barcode: product.barcode || "",
        quantity: item.quantity,
        importPrice: item.importPrice,
        subtotal: subtotal,
      });
    }

    if (receiptProducts.length === 0) {
      throw new ApiError(400, "Không thể tạo phiếu nhập: Không có sản phẩm hợp lệ");
    }

    // Create Logic Import Receipt
    // Status MUST be 'completed' for direct import
    // Inventory IS updated here directly.
    const importReceiptData = {
      branchId,
      createdBy: userId,
      listProduct: receiptProducts,
      totalAmount,
      supplierName: "Nhập từ Excel", // Default placeholder
      note: `Imported from Excel file. ${validationErrors.length} validation warnings.`,
      status: "completed", 
      isError: false,
    };

    // Update stock immediately
    await BranchProduct.bulkIncreaseStock(branchId, receiptProducts);

    const newReceipt = await ImportReceipt.createImportReceipt(importReceiptData);

    // Count unique products in receipt
    const uniqueProductIds = new Set(receiptProducts.map(p => p.productId.toString()));

    return {
      success: true,
      receipt: newReceipt,
      stats: {
        totalItems: validItems.length,
        createdProducts: productsToCreate.length,
        receiptItems: receiptProducts.length,
        uniqueProducts: uniqueProductIds.size,
        totalAmount: totalAmount,
        warnings: validationErrors,
        errors: errorsRecording
      }
    };

  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, `Lỗi Import Receipt: ${error.message}`);
  }
};

/**
 * Preview Receipt Excel Data (Optional - useful for UI to show table before submit)
 */
const previewImportReceipt = async (fileBuffer) => {
  const rawData = parseExcelFile(fileBuffer);
  const items = rawData.map((row, index) => mapRowToReceiptItem(row, index));
  // Simple validation check
  const validationErrors = [];
  items.forEach((item, index) => {
    const errors = validateItemData(item, index);
    validationErrors.push(...errors);
  });
  
  return {
    total: items.length,
    items: items.slice(0, 10), // Preview 10
    totalQuantity: items.reduce((sum, i) => sum + (i.quantity || 0), 0),
    totalAmount: items.reduce((sum, i) => sum + ((i.quantity || 0) * (i.importPrice || 0)), 0),
    validationErrors
  };
};

// ============ SERVICE LOGIC ============
const getStats = async (branchId, period, startDate, endDate) => {
  return await ImportReceipt.getStats(branchId, period, startDate, endDate);
};

const getErrorStats = async (branchId) => {
  return await ImportReceipt.getErrorStats(branchId);
};

const create = async (data, user) => {
  // Validate user - should always exist due to authMiddleware
  // JWT payload contains userId, not _id
  const userId = user._id || user.userId;
  if (!user || !userId) {
    throw new ApiError(400, "Thông tin người dùng không hợp lệ. Vui lòng đăng nhập lại.");
  }

  // Validate branch access
  validateBranchAccess(user, data.branchId || null, "create import receipt");
  
  // Validate and enrich listProduct
  if (!data.listProduct || data.listProduct.length === 0) {
    throw new ApiError(400, "Danh sách sản phẩm không được rỗng");
  }

  // Fetch product details to enrich data
  const productIds = data.listProduct.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).select('name barcode');
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  // Enrich and validate each product
  let calculatedTotal = 0;
  const enrichedProducts = data.listProduct.map((item, index) => {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      throw new ApiError(400, `Sản phẩm không tồn tại: ${item.productId}`);
    }

    // Auto-calculate subtotal if not provided
    const subtotal = item.subtotal || (item.quantity * item.importPrice);
    calculatedTotal += subtotal;

    return {
      productId: item.productId,
      productName: item.productName || product.name,
      barcode: item.barcode || product.barcode || "",
      quantity: item.quantity || 0,
      importPrice: item.importPrice || 0,
      subtotal: subtotal,
    };
  });

  // Use calculated total if not provided
  const totalAmount = data.totalAmount || calculatedTotal;
  
  // Create receipt
  return await ImportReceipt.createImportReceipt({
    ...data,
    listProduct: enrichedProducts,
    totalAmount: totalAmount,
    branchId: data.branchId,
    createdBy: userId
  });
};

const confirm = async (id, user) => {
  const receipt = await ImportReceipt.findById(id);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  
  // Validate branch access
  if (user) {
    validateBranchAccess(user, receipt.branchId, "confirm import receipt");
  }

  if (receipt.status === "completed") {
    throw new ApiError(400, "Receipt already completed");
  }
  
  // Bulk increase stock
  await BranchProduct.bulkIncreaseStock(receipt.branchId, receipt.listProduct);
  
  // Update status
  return await ImportReceipt.updateStatus(id, "completed");
};

const cancel = async (id, user) => {
  const receipt = await ImportReceipt.findById(id);
  if (!receipt) throw new ApiError(404, "Receipt not found");
  
  // Validate branch access
  if (user) {
    validateBranchAccess(user, receipt.branchId, "cancel import receipt");
  }

  if (receipt.status === "cancelled") {
    throw new ApiError(400, "Receipt already cancelled");
  }
  
  if (receipt.status === "completed") {
    // Revert stock using bulk decrease
    await BranchProduct.bulkDecreaseStock(receipt.branchId, receipt.listProduct);
  }
  
  return await ImportReceipt.updateStatus(id, "cancelled");
};

const markAsError = async (id, errorNote, user) => {
  const receipt = await ImportReceipt.findById(id);
  if (!receipt) throw new ApiError(404, "Receipt not found");

  // Validate branch access
  if (user) {
     validateBranchAccess(user, receipt.branchId, "mark error receipt");
  }
  
  if (receipt.isError) {
      throw new ApiError(400, "Receipt already marked as error");
  }

  // If was completed, revert stock using bulk decrease
  if (receipt.status === "completed") {
    await BranchProduct.bulkDecreaseStock(receipt.branchId, receipt.listProduct);
  }
  
  return await ImportReceipt.markAsError(id, errorNote, user.userId || user._id);
};

const getAllErrorReceiptsPaginated = async (options, user) => {
  // Defense logic can be enhanced here if needed
  return await ImportReceipt.findAllErrorReceiptsPaginated(options);
};

const getAllErrorReceipts = async (filter, user) => {
  return await ImportReceipt.findAllErrorReceipts(filter);
};

const deleteErrorReceipt = async (id, user) => {
  // Logic to check permission or if safe to delete
  return await ImportReceipt.deleteErrorReceipt(id);
};

const getAllPaginated = async (options, user) => {
  // Defense: inject branchId if user is staff?
  // Controller usually handles this injection into `options` or passing `user`
  // Here we just pass options to Model
  if (user && user.role !== 'admin' && user.branchId) {
    options.branchId = user.branchId;
  }
  return await ImportReceipt.findAllImportReceiptsPaginated(options);
};

const getAll = async (filter, user) => {
  if (user && user.role !== 'admin' && user.branchId) {
    filter.branchId = user.branchId;
  }
  return await ImportReceipt.findAllImportReceipts(filter);
};

const getById = async (id, user) => {
  const receipt = await ImportReceipt.findImportReceiptById(id);
  if (user) {
     validateBranchAccess(user, receipt.branchId?._id || receipt.branchId, "view receipt");
  }
  return receipt;
};

const getByCode = async (code, user) => {
    const receipt = await ImportReceipt.findImportReceiptByCode(code);
    if (!receipt) throw new ApiError(404, "Receipt not found");
    if (user) {
        validateBranchAccess(user, receipt.branchId?._id || receipt.branchId, "view receipt");
    }
    return receipt;
};

const getByBarcode = async (barcode, user) => {
    const receipt = await ImportReceipt.findImportReceiptByBarcode(barcode);
     if (!receipt) throw new ApiError(404, "Receipt not found");
    if (user) {
        validateBranchAccess(user, receipt.branchId?._id || receipt.branchId, "view receipt");
    }
    return receipt;
};

const getByBranch = async (branchId, filter) => {
  return await ImportReceipt.findImportReceiptsByBranch(branchId, filter);
};

const getByDateRange = async (startDate, endDate, branchId) => {
  return await ImportReceipt.findImportReceiptsByDateRange(startDate, endDate, branchId);
};

const getTotalImport = async (period, branchId) => {
  // Need to calculate start/end date from period
  // For simplicity, delegating to helper inside model if present or calculating here
  // Model `getTotalImportByDateRange` expects startDate/endDate.
  // We can use `buildDateFilter` from utils/dateUtils in model, but here let's assume controller passed valid range
  // Wait, controller passes `period`.
  const { buildDateFilter } = await import("../utils/dateUtils.js");
  const dateFilter = buildDateFilter({ period });
  // dateFilter is like { createdAt: { $gte: ..., $lte: ... } }
  
  if (!dateFilter || !dateFilter.createdAt) {
      // fallback or error
      return { totalAmount: 0, count: 0 };
  }
  
  return await ImportReceipt.getTotalImportByDateRange(
      dateFilter.createdAt.$gte, 
      dateFilter.createdAt.$lte, 
      branchId
  );
};

export const importReceiptService = {
  importReceiptFromExcel,
  previewImportReceipt,
  getStats,
  getErrorStats,
  create,
  confirm,
  cancel,
  markAsError,
  getAllErrorReceiptsPaginated,
  getAllErrorReceipts,
  deleteErrorReceipt,
  getAllPaginated,
  getAll,
  getById,
  getByCode,
  getByBarcode,
  getByBranch,
  getByDateRange,
  getTotalImport
};
