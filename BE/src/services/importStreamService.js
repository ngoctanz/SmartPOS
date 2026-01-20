import { normalizeString, getCellValue } from "../utils/excelParser.js";
import xlsx from "xlsx";
import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

const CHUNK_SIZE = 1000; // Process 1000 rows at a time
const BULK_BATCH_SIZE = 500; // BulkWrite batch size

/**
 * Parse Excel file in streaming mode
 */
const parseExcelFileStream = (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { 
      type: "buffer",
      cellDates: true,
      cellNF: false,
      cellText: false,
    });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get range
    const range = xlsx.utils.decode_range(worksheet['!ref']);
    const totalRows = range.e.r - range.s.r;
    
    return {
      worksheet,
      range,
      totalRows,
    };
  } catch (error) {
    throw new ApiError(400, `Lỗi đọc file Excel: ${error.message}`);
  }
};

/**
 * Process Excel rows in chunks
 */
const processChunk = (worksheet, startRow, endRow, headers) => {
  const chunk = [];
  
  for (let row = startRow; row <= endRow; row++) {
    const rowData = {};
    
    headers.forEach((header, colIndex) => {
      const cellAddress = xlsx.utils.encode_cell({ r: row, c: colIndex });
      const cell = worksheet[cellAddress];
      rowData[header] = cell ? String(cell.v).trim() : "";
    });
    
    chunk.push(rowData);
  }
  
  return chunk;
};

/**
 * Map Excel row to product object
 */
const mapRowToProduct = (row) => {
  const categoryName = getCellValue(row, [
    "nhom hang", "nhóm hàng",
    "loai san pham", "loại sản phẩm", 
    "loai", "category"
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
  
  const price = getCellValue(row, [
    "gia ban", "giá bán",
    "price", "sale price"
  ]);
  
  const images = getCellValue(row, [
    "hinh anh", "hình ảnh",
    "images", "image"
  ]);

  return {
    categoryName,
    barcode: barcode || undefined,
    name,
    price: price ? parseFloat(String(price).replace(/[^\d.-]/g, "")) : 0,
    images: images ? images.split(",").map(url => url.trim()).filter(url => url) : [],
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
 * Create categories in bulk
 */
const createCategoriesInBulk = async (categoryNames) => {
  const uniqueNames = [...new Set(categoryNames.map(name => name.trim()))];
  const categoryCache = new Map();

  // Fetch existing categories
  const existingCategories = await Category.find({
    name: { $in: uniqueNames }
  }).lean();

  existingCategories.forEach(cat => {
    categoryCache.set(cat.name.toLowerCase(), cat);
  });

  // Create missing categories
  const missingNames = uniqueNames.filter(
    name => !categoryCache.has(name.toLowerCase())
  );

  if (missingNames.length > 0) {
    try {
      const newCategories = await Category.insertMany(
        missingNames.map(name => ({ 
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        { ordered: false }
      );

      newCategories.forEach(cat => {
        categoryCache.set(cat.name.toLowerCase(), cat);
      });
    } catch (error) {
      if (error.code === 11000) {
        const retryCategories = await Category.find({
          name: { $in: missingNames }
        }).lean();

        retryCategories.forEach(cat => {
          categoryCache.set(cat.name.toLowerCase(), cat);
        });
      }
    }
  }

  return categoryCache;
};

/**
 * Import products with streaming for large files
 */
const importProductsStream = async (fileBuffer, onProgress) => {
  try {
    // Parse Excel structure
    const { worksheet, range, totalRows } = parseExcelFileStream(fileBuffer);
    
    // Get headers from first row
    const headers = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = xlsx.utils.encode_cell({ r: range.s.r, c: col });
      const cell = worksheet[cellAddress];
      headers.push(cell ? String(cell.v).trim() : `Column${col}`);
    }

    const results = {
      total: totalRows,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    // Process in chunks
    let processedRows = 0;
    const allCategoryNames = new Set();
    const allProducts = [];

    // First pass: collect all data and validate
    for (let startRow = range.s.r + 1; startRow <= range.e.r; startRow += CHUNK_SIZE) {
      const endRow = Math.min(startRow + CHUNK_SIZE - 1, range.e.r);
      const chunk = processChunk(worksheet, startRow, endRow, headers);
      
      chunk.forEach((row, index) => {
        const product = mapRowToProduct(row);
        const rowIndex = startRow - range.s.r - 1 + index;
        
        const errors = validateProductData(product, rowIndex);
        if (errors.length > 0) {
          results.errors.push(...errors.map(err => ({ error: err })));
          results.failed++;
        } else {
          allProducts.push(product);
          if (product.categoryName) {
            allCategoryNames.add(product.categoryName);
          }
        }
      });

      processedRows += chunk.length;
      if (onProgress) {
        onProgress({
          phase: 'parsing',
          processed: processedRows,
          total: totalRows,
          percentage: Math.round((processedRows / totalRows) * 100),
        });
      }
    }

    if (results.errors.length > 100) {
      throw new ApiError(400, `Quá nhiều lỗi validation (${results.errors.length}). Vui lòng kiểm tra file Excel.`);
    }

    // Create all categories
    if (onProgress) {
      onProgress({ phase: 'categories', message: 'Đang tạo danh mục...' });
    }
    const categoryCache = await createCategoriesInBulk([...allCategoryNames]);

    // Get all existing products by barcode
    if (onProgress) {
      onProgress({ phase: 'checking', message: 'Đang kiểm tra sản phẩm tồn tại...' });
    }
    const barcodes = allProducts
      .map(p => p.barcode)
      .filter(barcode => barcode && barcode.trim());
    
    const existingProducts = await Product.find({ 
      barcode: { $in: barcodes } 
    }).select('_id barcode').lean();
    
    const existingBarcodeMap = new Map(
      existingProducts.map(p => [p.barcode, p._id])
    );

    // Prepare bulk operations
    const bulkOps = [];
    allProducts.forEach((productData, index) => {
      const category = categoryCache.get(productData.categoryName.toLowerCase());
      
      if (!category) {
        results.failed++;
        results.errors.push({
          row: index + 2,
          name: productData.name,
          error: `Không tìm thấy loại sản phẩm: ${productData.categoryName}`,
        });
        return;
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

      const existingId = productData.barcode ? existingBarcodeMap.get(productData.barcode) : null;

      if (existingId) {
        bulkOps.push({
          updateOne: {
            filter: { _id: existingId },
            update: { $set: productPayload },
          },
        });
        results.updated++;
      } else {
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
    });

    // Execute bulk operations in batches
    if (bulkOps.length > 0) {
      let processedOps = 0;
      
      for (let i = 0; i < bulkOps.length; i += BULK_BATCH_SIZE) {
        const batch = bulkOps.slice(i, i + BULK_BATCH_SIZE);
        
        try {
          await Product.bulkWrite(batch, { ordered: false });
        } catch (error) {
          if (error.writeErrors) {
            error.writeErrors.forEach((writeError) => {
              const opIndex = writeError.index + i;
              const productData = allProducts[opIndex];
              results.failed++;
              results.errors.push({
                row: opIndex + 2,
                name: productData?.name || 'Unknown',
                error: writeError.errmsg || writeError.message,
              });
            });
          }
        }

        processedOps += batch.length;
        if (onProgress) {
          onProgress({
            phase: 'importing',
            processed: processedOps,
            total: bulkOps.length,
            percentage: Math.round((processedOps / bulkOps.length) * 100),
          });
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

export const importStreamService = {
  importProductsStream,
};
