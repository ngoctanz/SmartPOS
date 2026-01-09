import xlsx from "xlsx";
import fs from "fs";

/**
 * Debug script to analyze Excel file and find missing rows
 * Usage: node src/scripts/debugExcelImport.js <path-to-excel-file>
 */

const debugExcelFile = (filePath) => {
  console.log(`\n🔍 Analyzing Excel file: ${filePath}\n`);

  // Read file
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = xlsx.read(fileBuffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  console.log(`📄 Sheet name: ${sheetName}`);

  // Get range
  const range = xlsx.utils.decode_range(worksheet["!ref"]);
  console.log(`📊 Range: ${worksheet["!ref"]}`);
  console.log(`📏 Total rows (including header): ${range.e.r + 1}`);
  console.log(`📏 Data rows: ${range.e.r}`);

  // Parse with different options
  console.log("\n--- Parsing with default options ---");
  const data1 = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: "",
  });
  console.log(`✅ Parsed rows: ${data1.length}`);

  console.log("\n--- Parsing with blankrows: false ---");
  const data2 = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: "",
    blankrows: false,
  });
  console.log(`✅ Parsed rows: ${data2.length}`);

  console.log("\n--- Parsing with blankrows: true ---");
  const data3 = xlsx.utils.sheet_to_json(worksheet, {
    raw: false,
    defval: "",
    blankrows: true,
  });
  console.log(`✅ Parsed rows: ${data3.length}`);

  // Check for empty rows
  console.log("\n--- Checking for empty/invalid rows ---");
  let emptyRows = 0;
  let rowsWithoutName = 0;
  let rowsWithoutCategory = 0;

  data1.forEach((row, index) => {
    const isEmpty = Object.values(row).every(
      (val) => !val || String(val).trim() === ""
    );
    if (isEmpty) {
      emptyRows++;
      console.log(`⚠️ Row ${index + 2}: Completely empty`);
    }

    // Check for missing critical fields
    const hasName = Object.keys(row).some((key) => {
      const normalized = key.toLowerCase().replace(/[^\w\s]/g, "");
      return (
        (normalized.includes("ten") || normalized.includes("name")) &&
        row[key] &&
        String(row[key]).trim()
      );
    });

    const hasCategory = Object.keys(row).some((key) => {
      const normalized = key.toLowerCase().replace(/[^\w\s]/g, "");
      return (
        (normalized.includes("nhom") ||
          normalized.includes("loai") ||
          normalized.includes("category")) &&
        row[key] &&
        String(row[key]).trim()
      );
    });

    if (!hasName) {
      rowsWithoutName++;
      if (rowsWithoutName <= 5) {
        console.log(`⚠️ Row ${index + 2}: Missing product name`);
        console.log(`   Data:`, JSON.stringify(row).substring(0, 100));
      }
    }

    if (!hasCategory) {
      rowsWithoutCategory++;
      if (rowsWithoutCategory <= 5) {
        console.log(`⚠️ Row ${index + 2}: Missing category`);
      }
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   - Empty rows: ${emptyRows}`);
  console.log(`   - Rows without name: ${rowsWithoutName}`);
  console.log(`   - Rows without category: ${rowsWithoutCategory}`);

  // Show headers
  console.log("\n--- Column Headers ---");
  if (data1.length > 0) {
    const headers = Object.keys(data1[0]);
    headers.forEach((header, index) => {
      console.log(`${index + 1}. "${header}"`);
    });
  }

  // Show first few rows
  console.log("\n--- First 3 rows (sample) ---");
  data1.slice(0, 3).forEach((row, index) => {
    console.log(`\nRow ${index + 2}:`);
    Object.entries(row).forEach(([key, value]) => {
      if (value && String(value).trim()) {
        console.log(`  ${key}: ${String(value).substring(0, 50)}`);
      }
    });
  });

  // Check for duplicate barcodes
  console.log("\n--- Checking for duplicate barcodes ---");
  const barcodes = new Map();
  data1.forEach((row, index) => {
    const barcode = Object.entries(row).find(([key]) => {
      const normalized = key.toLowerCase().replace(/[^\w\s]/g, "");
      return normalized.includes("vach") || normalized.includes("barcode");
    })?.[1];

    if (barcode && String(barcode).trim()) {
      const barcodeStr = String(barcode).trim();
      if (barcodes.has(barcodeStr)) {
        console.log(
          `⚠️ Duplicate barcode "${barcodeStr}" at rows ${barcodes.get(barcodeStr)} and ${index + 2}`
        );
      } else {
        barcodes.set(barcodeStr, index + 2);
      }
    }
  });

  console.log(`\n✅ Analysis complete!\n`);
};

// Run script
const filePath = process.argv[2];
if (!filePath) {
  console.error("❌ Please provide Excel file path");
  console.log("Usage: node src/scripts/debugExcelImport.js <path-to-excel-file>");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

debugExcelFile(filePath);
