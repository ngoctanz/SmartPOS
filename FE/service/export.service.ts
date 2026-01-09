import { APP_CONFIG } from "@/constants/config";

class ExportService {
  private readonly BASE_URL = "/export";

  /**
   * Export products to Excel
   */
  async exportProducts(filters?: {
    categoryId?: string;
    status?: string;
    search?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    
    if (filters?.categoryId) {
      params.append("categoryId", filters.categoryId);
    }
    if (filters?.status) {
      params.append("status", filters.status);
    }
    if (filters?.search) {
      params.append("search", filters.search);
    }

    const url = `${APP_CONFIG.API.BASE_URL}${this.BASE_URL}/products?${params.toString()}`;
    
    const response = await fetch(url, {
      method: "GET",
      credentials: "include", // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Export failed");
    }

    return response.blob();
  }

  /**
   * Download import template
   */
  async downloadTemplate(): Promise<Blob> {
    const url = `${APP_CONFIG.API.BASE_URL}${this.BASE_URL}/template`;
    
    const response = await fetch(url, {
      method: "GET",
      credentials: "include", // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Download template failed");
    }

    return response.blob();
  }

  /**
   * Export products by category
   */
  async exportByCategory(): Promise<Blob> {
    const url = `${APP_CONFIG.API.BASE_URL}${this.BASE_URL}/products/by-category`;
    
    const response = await fetch(url, {
      method: "GET",
      credentials: "include", // Include cookies for auth
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || "Export by category failed");
    }

    return response.blob();
  }

  /**
   * Helper to trigger download
   */
  downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const exportService = new ExportService();
export default exportService;
