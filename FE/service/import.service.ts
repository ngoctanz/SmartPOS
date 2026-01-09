import { apiPost } from "./api.service";
import { ApiResponse } from "./api.config";

export interface ImportPreviewResult {
  total: number;
  preview: Array<{
    categoryName: string;
    barcode?: string;
    name: string;
    price: number;
    images: string[];
  }>;
  categories: string[];
  validationErrors: string[];
  isValid: boolean;
}

export interface ImportResult {
  total: number;
  parsed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    name: string;
    barcode?: string;
    error: string;
  }>;
  hasMoreErrors?: boolean;
  totalErrors?: number;
}

class ImportService {
  private readonly BASE_URL = "/import";

  /**
   * Preview Excel data before importing
   */
  async previewExcel(file: File): Promise<ImportPreviewResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiPost<ImportPreviewResult>(
      `${this.BASE_URL}/preview`,
      formData,
      {
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        },
      }
    );

    return response.data;
  }

  /**
   * Import products from Excel file
   */
  async importProducts(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiPost<{
      summary: {
        total: number;
        parsed: number;
        created: number;
        updated: number;
        skipped: number;
        failed: number;
      };
      errors: Array<{
        row: number;
        name: string;
        barcode?: string;
        error: string;
      }>;
      hasMoreErrors: boolean;
      totalErrors: number;
    }>(
      `${this.BASE_URL}/products`,
      formData,
      {
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        },
      }
    );

    // Transform nested response to flat structure
    return {
      total: response.data.summary.total,
      parsed: response.data.summary.parsed,
      created: response.data.summary.created,
      updated: response.data.summary.updated,
      skipped: response.data.summary.skipped,
      failed: response.data.summary.failed,
      errors: response.data.errors,
      hasMoreErrors: response.data.hasMoreErrors,
      totalErrors: response.data.totalErrors,
    };
  }
}

export const importService = new ImportService();
export default importService;

