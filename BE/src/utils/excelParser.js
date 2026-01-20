import xlsx from "xlsx";
import ApiError from "./apiError.js";

/**
 * Normalize string for flexible matching
 * Removes special characters, extra spaces, and converts to lowercase
 */
export const normalizeString = (str) => {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Parse Excel file buffer and extract data
 * @param {Buffer} fileBuffer - Excel file buffer
 * @returns {Array} - Array of parsed objects
 */
export const parseExcelFile = (fileBuffer) => {
  try {
    const workbook = xlsx.read(fileBuffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = xlsx.utils.sheet_to_json(worksheet, { 
      raw: false,
      defval: "",
      blankrows: false 
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
 * Helper to get cell value from row with flexible header matching
 * @param {Object} row - Excel row data
 * @param {Array} possibleHeaders - List of possible header names
 * @returns {String} - Cell value
 */
export const getCellValue = (row, possibleHeaders) => {
  // 1. Exact match
  for (const header of possibleHeaders) {
    const value = row[header];
    if (value !== undefined && value !== null && value !== "") {
      return String(value).trim();
    }
  }
  
  // 2. Fuzzy match - Priority based on keywords order
  const normalizedHeaders = possibleHeaders.map(h => normalizeString(h));
  
  for (const targetHeader of normalizedHeaders) {
    for (const [actualHeader, actualValue] of Object.entries(row)) {
      const normalizedActual = normalizeString(actualHeader);
      
      if (normalizedActual.includes(targetHeader) || targetHeader.includes(normalizedActual)) {
        if (actualValue !== undefined && actualValue !== null && actualValue !== "") {
          return String(actualValue).trim();
        }
      }
    }
  }
  
  return "";
};
