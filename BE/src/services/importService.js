import xlsx from "xlsx";
import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

/**
 * Parse Excel file buffer and extract product data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Array} - Array of parsed product objects
 */
const parseExcelFile = (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const rawData = xlsx.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: "",
      blankrows: false // Skip completely blank rows
    });

    if (!rawData || rawData.length === 0) {
      throw new ApiError(400, "File Excel không có dữ liệu");
    }

    return rawData;
  } catch (error) {
    throw new ApiError(400, `Lỗi đọc file Excel: ${error.message}`);
  }
};

/**
 * Normalize string for flexible matching
 * Removes special characters, extra spaces, and converts to lowercase
 */
const normalizeString = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
};

/**
 * Map Excel row to product object
 * Handles various column name formats with flexible matching
 */
const mapRowToProduct = (row, rowIndex) => {
  // Find column values with flexible header matching
  const getCellValue = (possibleHeaders) => {
    // First try exact match
    for (const header of possibleHeaders) {
      const value = row[header];
      if (value !== undefined && value !== null && value !== "") {
        return String(value).trim();
      }
    }
    
    // Then try normalized match (for headers like "Nhóm hàng(3 Cấp)")
    const normalizedHeaders = possibleHeaders.map(h => normalizeString(h));
    for (const [actualHeader, actualValue] of Object.entries(row)) {
      const normalizedActual = normalizeString(actualHeader);
      if (normalizedHeaders.some(nh => normalizedActual.includes(nh) || nh.includes(normalizedActual))) {
        if (actualValue !== undefined && actualValue !== null && actualValue !== "") {
          return String(actualValue).trim();
        }
      }
    }
    
    return "";
  };

  // Extract data with multiple possible column names
  const categoryName = getCellValue([
    "nhom hang", "nhóm hàng",
    "loai san pham", "loại sản phẩm", 
    "loai", "category"
  ]);
  
  const barcode = getCellValue([
    "ma vach", "mã vạch",
    "barcode"
  ]);
  
  const name = getCellValue([
    "ten hang", "tên hàng",
    "ten san pham", "tên sản phẩm",
    "name", "product name"
  ]);
  
  const price = getCellValue([
    "gia ban", "giá bán",
    "price", "sale price"
  ]);
  
  const images = getCellValue([
    "hinh anh", "hình ảnh",
    "images", "image"
  ]);

  return {
    categoryName,
    barcode: barcode || undefined, // undefined if empty to avoid unique constraint
    name,
    price: price ? parseFloat(String(price).replace(/[^\d.-]/g, "")) : 0,
    images: images ? images.split(",").map(url => url.trim()).filter(url => url) : [],
    _rowIndex: rowIndex, // Track original row for debugging
  };
};

/**
 * Validate product data
 */
const validateProductData = (product, rowIndex) => {
  const errors = [];

  if (!product.categoryName) {
    errors.push(`Dòng ${rowIndex + 2}: Thiếu tên loại sản phẩm`);
  }

  if (!product.name) {
    errors.push(`Dòng ${rowIndex + 2}: Thiếu tên sản phẩm`);
  }

  if (product.name && product.name.length < 2) {
    errors.push(`Dòng ${rowIndex + 2}: Tên sản phẩm phải có ít nhất 2 ký tự`);
  }

  if (product.price < 0) {
    errors.push(`Dòng ${rowIndex + 2}: Giá bán không được âm`);
  }

  return errors;
};

/**
 * Get or create category by name (optimized)
 */
const getOrCreateCategory = async (categoryName, categoryCache) => {
  // Check cache first
  if (categoryCache.has(categoryName)) {
    return categoryCache.get(categoryName);
  }

  // Normalize for case-insensitive comparison
  const normalizedName = categoryName.trim();
  
  // Try to find existing category with exact match (case-insensitive)
  let category = await Category.findOne({ 
    name: { $regex: new RegExp(`^${normalizedName}$`, "i") } 
  });

  // Create if not exists
  if (!category) {
    try {
      category = await Category.createCategory({ name: normalizedName });
    } catch (error) {
      // Handle duplicate key error (race condition)
      if (error.code === 11000) {
        category = await Category.findOne({ 
          name: { $regex: new RegExp(`^${normalizedName}$`, "i") } 
        });
      } else {
        throw error;
      }
    }
  }

  // Cache it
  categoryCache.set(categoryName, category);
  return category;
};

/**
 * Create all categories in bulk before importing products (optimized)
 */
const createCategoriesInBulk = async (products) => {
  // Get unique category names
  const uniqueCategoryNames = [...new Set(
    products
      .map(p => p.categoryName)
      .filter(name => name && name.trim())
      .map(name => name.trim())
  )];

  const categoryCache = new Map();

  // Step 1: Fetch all existing categories in one query
  const existingCategories = await Category.find({
    name: { 
      $in: uniqueCategoryNames.map(name => new RegExp(`^${name}$`, "i"))
    }
  }).lean();

  // Build cache from existing categories
  existingCategories.forEach(cat => {
    // Find matching name (case-insensitive)
    const matchingName = uniqueCategoryNames.find(
      name => name.toLowerCase() === cat.name.toLowerCase()
    );
    if (matchingName) {
      categoryCache.set(matchingName, cat);
    }
  });

  // Step 2: Create missing categories
  const missingCategoryNames = uniqueCategoryNames.filter(
    name => !categoryCache.has(name)
  );

  if (missingCategoryNames.length > 0) {
    // Use insertMany for bulk creation
    try {
      const newCategories = await Category.insertMany(
        missingCategoryNames.map(name => ({ 
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        { ordered: false } // Continue on duplicate errors
      );

      // Add to cache
      newCategories.forEach((cat, index) => {
        categoryCache.set(missingCategoryNames[index], cat);
      });
    } catch (error) {
      // Handle duplicate key errors (race condition)
      if (error.code === 11000 && error.writeErrors) {
        // Fetch the categories that failed to insert
        const failedNames = error.writeErrors.map((err, idx) => 
          missingCategoryNames[err.index]
        );
        
        const retryCategories = await Category.find({
          name: { $in: failedNames }
        }).lean();

        retryCategories.forEach(cat => {
          const matchingName = failedNames.find(
            name => name.toLowerCase() === cat.name.toLowerCase()
          );
          if (matchingName) {
            categoryCache.set(matchingName, cat);
          }
        });
      }
    }
  }

  return categoryCache;
};

/**
 * Import products from Excel file with optimized bulk operations
 */
const importProducts = async (fileBuffer) => {
  try {
    // Parse Excel
    const rawData = parseExcelFile(fileBuffer);
    
    // Map and validate
    const products = rawData.map((row, index) => mapRowToProduct(row, index));
    
    const validationErrors = [];
    const validProducts = [];
    
    products.forEach((product, index) => {
      const errors = validateProductData(product, index);
      if (errors.length > 0) {
        // Store as objects for consistency
        errors.forEach(errMsg => {
          validationErrors.push({
            row: product._rowIndex + 2,
            name: product.name || 'N/A',
            barcode: product.barcode || 'N/A',
            error: errMsg.replace(`Dòng ${product._rowIndex + 2}: `, ''),
          });
        });
      } else {
        validProducts.push(product);
      }
    });

    // Step 1: Create all categories first
    const categoryCache = await createCategoriesInBulk(validProducts);

    // Step 2: Get all existing products by barcode in one query
    const barcodes = validProducts
      .map(p => p.barcode)
      .filter(barcode => barcode && barcode.trim());
    
    const existingProducts = await Product.find({ 
      barcode: { $in: barcodes } 
    }).select('_id barcode').lean();
    
    const existingBarcodeMap = new Map(
      existingProducts.map(p => [p.barcode, p._id])
    );

    // Step 3: Prepare bulk operations
    const bulkOps = [];
    const results = {
      total: rawData.length,
      parsed: validProducts.length,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: validationErrors.length,
      errors: [...validationErrors],
    };

    // Track duplicate handling
    const processedBarcodes = new Set();

    validProducts.forEach((productData) => {
      try {
        const category = categoryCache.get(productData.categoryName);
        
        if (!category) {
          results.skipped++;
          results.errors.push({
            row: productData._rowIndex + 2,
            name: productData.name,
            barcode: productData.barcode,
            error: `Không tìm thấy loại sản phẩm: ${productData.categoryName}`,
          });
          return;
        }

        // Check if this barcode was already processed (duplicate in file)
        if (productData.barcode && processedBarcodes.has(productData.barcode)) {
          results.skipped++;
          results.errors.push({
            row: productData._rowIndex + 2,
            name: productData.name,
            barcode: productData.barcode,
            error: `Barcode trùng lặp trong file Excel. Chỉ sản phẩm đầu tiên được xử lý.`,
          });
          return;
        }

        // Mark barcode as processed
        if (productData.barcode) {
          processedBarcodes.add(productData.barcode);
        }

        const productPayload = {
          categoryId: category._id,
          name: productData.name,
          barcode: productData.barcode,
          currentSalePrice: productData.price,
          images: productData.images,
          unit: "cái",
          status: "active",
          updatedAt: new Date(),
        };

        // Check if product exists
        const existingId = productData.barcode ? existingBarcodeMap.get(productData.barcode) : null;

        if (existingId) {
          // Update existing product
          bulkOps.push({
            updateOne: {
              filter: { _id: existingId },
              update: { $set: productPayload },
            },
          });
          results.updated++;
        } else {
          // Insert new product
          bulkOps.push({
            insertOne: {
              document: {
                ...productPayload,
                createdAt: new Date(),
              },
            },
          });
          results.created++;
        }
      } catch (error) {
        results.skipped++;
        results.errors.push({
          row: productData._rowIndex + 2,
          name: productData.name,
          barcode: productData.barcode,
          error: error.message,
        });
      }
    });

    // Step 4: Execute bulk operations in batches
    if (bulkOps.length > 0) {
      const BATCH_SIZE = 500;
      
      for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
        const batch = bulkOps.slice(i, i + BATCH_SIZE);
        
        try {
          await Product.bulkWrite(batch, { 
            ordered: false,
          });
        } catch (error) {
          // Handle bulk write errors
          if (error.writeErrors) {
            error.writeErrors.forEach((writeError) => {
              const opIndex = writeError.index + i;
              const productData = validProducts[opIndex];
              
              // Adjust counts
              if (bulkOps[opIndex].insertOne) {
                results.created--;
              } else if (bulkOps[opIndex].updateOne) {
                results.updated--;
              }
              results.skipped++;
              
              results.errors.push({
                row: productData?._rowIndex + 2 || opIndex + 2,
                name: productData?.name || 'Unknown',
                barcode: productData?.barcode || 'N/A',
                error: writeError.code === 11000 
                  ? `Barcode đã tồn tại trong database`
                  : (writeError.errmsg || writeError.message),
              });
            });
          }
        }
      }
    }

    return results;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi import: ${error.message}`);
  }
};

/**
 * Preview Excel data without importing
 */
const previewExcelData = async (fileBuffer) => {
  try {
    const rawData = parseExcelFile(fileBuffer);
    const products = rawData.map((row, index) => mapRowToProduct(row, index));
    
    // Validate
    const validationErrors = [];
    products.forEach((product, index) => {
      const errors = validateProductData(product, index);
      validationErrors.push(...errors);
    });

    // Get unique categories
    const uniqueCategories = [...new Set(products.map(p => p.categoryName).filter(Boolean))];

    return {
      total: products.length,
      preview: products.slice(0, 10), // First 10 rows
      categories: uniqueCategories,
      validationErrors,
      isValid: validationErrors.length === 0,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, `Lỗi preview: ${error.message}`);
  }
};

export const importService = {
  importProducts,
  previewExcelData,
};
