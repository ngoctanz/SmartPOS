import { parseExcelFile, getCellValue } from "../utils/excelParser.js";
import { Product } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import ApiError from "../utils/apiError.js";

/**
 * Map Excel row to product object
 * Handles various column name formats with flexible matching
 */
const mapRowToProduct = (row, rowIndex) => {
  // Extract data with multiple possible column names
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
  
  const desc = getCellValue(row, [
    "mo ta", "mô tả",
    "description", "desc"
  ]);

  return {
    categoryName,
    barcode: barcode || undefined, 
    name,
    price: price ? parseFloat(String(price).replace(/[^\d.-]/g, "")) : 0,
    images: images ? images.split(",").map(url => url.trim()).filter(url => url) : [],
    desc,
    _rowIndex: rowIndex, 
  };
};

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


const createCategoriesInBulk = async (products) => {
  const uniqueCategoryNames = [...new Set(
    products
      .map(p => p.categoryName)
      .filter(name => name && name.trim())
      .map(name => name.trim())
  )];

  const categoryCache = new Map();
  const existingCategories = await Category.find({
    name: { 
      $in: uniqueCategoryNames.map(name => new RegExp(`^${name}$`, "i"))
    }
  }).lean();
  existingCategories.forEach(cat => {
    const matchingName = uniqueCategoryNames.find(
      name => name.toLowerCase() === cat.name.toLowerCase()
    );
    if (matchingName) {
      categoryCache.set(matchingName, cat);
    }
  });
  const missingCategoryNames = uniqueCategoryNames.filter(
    name => !categoryCache.has(name)
  );

  if (missingCategoryNames.length > 0) {
    try {
      const newCategories = await Category.insertMany(
        missingCategoryNames.map(name => ({ 
          name,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        { ordered: false }
      );
      newCategories.forEach((cat, index) => {
        categoryCache.set(missingCategoryNames[index], cat);
      });
    } catch (error) {
      if (error.code === 11000 && error.writeErrors) {
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

const importProducts = async (fileBuffer) => {
  try {
    const rawData = parseExcelFile(fileBuffer);
    
    const products = rawData.map((row, index) => mapRowToProduct(row, index));
    
    const validationErrors = [];
    const validProducts = [];
    
    products.forEach((product, index) => {
      const errors = validateProductData(product, index);
      if (errors.length > 0) {
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

    const categoryCache = await createCategoriesInBulk(validProducts);

    const barcodes = validProducts
      .map(p => p.barcode)
      .filter(barcode => barcode && barcode.trim());
    
    const existingProducts = await Product.find({ 
      barcode: { $in: barcodes } 
    }).select('_id barcode').lean();
    
    const existingBarcodeMap = new Map(
      existingProducts.map(p => [p.barcode, p._id])
    );

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

    if (bulkOps.length > 0) {
      const BATCH_SIZE = 500;
      
      for (let i = 0; i < bulkOps.length; i += BATCH_SIZE) {
        const batch = bulkOps.slice(i, i + BATCH_SIZE);
        
        try {
          await Product.bulkWrite(batch, { 
            ordered: false,
          });
        } catch (error) {
          if (error.writeErrors) {
            error.writeErrors.forEach((writeError) => {
              const opIndex = writeError.index + i;
              const productData = validProducts[opIndex];
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

const previewExcelData = async (fileBuffer) => {
  try {
    const rawData = parseExcelFile(fileBuffer);
    const products = rawData.map((row, index) => mapRowToProduct(row, index));
    const validationErrors = [];
    products.forEach((product, index) => {
      const errors = validateProductData(product, index);
      validationErrors.push(...errors);
    });

    const uniqueCategories = [...new Set(products.map(p => p.categoryName).filter(Boolean))];

    return {
      total: products.length,
      preview: products.slice(0, 10),
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
