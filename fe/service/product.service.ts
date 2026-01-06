import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api.service";
import { ApiResponse } from "./api.config";

export interface Product {
  _id: string;
  name: string;
  barcode: string;
  categoryId: string;
  categoryName?: string;
  unit: string;
  importPrice: number;
  salePrice: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  barcode: string;
  categoryId: string;
  unit: string;
  importPrice: number;
  salePrice: number;
  description?: string;
  image?: string;
}

export interface UpdateProductRequest {
  name?: string;
  barcode?: string;
  categoryId?: string;
  unit?: string;
  importPrice?: number;
  salePrice?: number;
  description?: string;
  image?: string;
  isActive?: boolean;
}

export interface UpdatePriceRequest {
  salePrice: number;
}

export interface SearchProductParams {
  keyword?: string;
  categoryId?: string;
  isActive?: boolean;
}

const productService = {
  /**
   * Lấy tất cả sản phẩm
   * GET /api/v1/product
   */
  getAll: async (): Promise<ApiResponse<Product[]>> => {
    return apiGet<Product[]>("/product");
  },

  /**
   * Tìm kiếm sản phẩm
   * GET /api/v1/product/search
   */
  search: async (
    params: SearchProductParams
  ): Promise<ApiResponse<Product[]>> => {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append("keyword", params.keyword);
    if (params.categoryId) queryParams.append("categoryId", params.categoryId);
    if (params.isActive !== undefined)
      queryParams.append("isActive", String(params.isActive));

    return apiGet<Product[]>(`/product/search?${queryParams.toString()}`);
  },

  /**
   * Lấy sản phẩm theo barcode
   * GET /api/v1/product/barcode/:barcode
   */
  getByBarcode: async (barcode: string): Promise<ApiResponse<Product>> => {
    return apiGet<Product>(`/product/barcode/${barcode}`);
  },

  /**
   * Lấy sản phẩm theo loại
   * GET /api/v1/product/category/:categoryId
   */
  getByCategory: async (
    categoryId: string
  ): Promise<ApiResponse<Product[]>> => {
    return apiGet<Product[]>(`/product/category/${categoryId}`);
  },

  /**
   * Lấy chi tiết sản phẩm
   * GET /api/v1/product/:id
   */
  getById: async (id: string): Promise<ApiResponse<Product>> => {
    return apiGet<Product>(`/product/${id}`);
  },

  /**
   * Tạo sản phẩm mới
   * POST /api/v1/product
   */
  create: async (data: CreateProductRequest): Promise<ApiResponse<Product>> => {
    return apiPost<Product>("/product", data);
  },

  /**
   * Cập nhật sản phẩm
   * PUT /api/v1/product/:id
   */
  update: async (
    id: string,
    data: UpdateProductRequest
  ): Promise<ApiResponse<Product>> => {
    return apiPut<Product>(`/product/${id}`, data);
  },

  /**
   * Cập nhật giá bán
   * PATCH /api/v1/product/:id/price
   */
  updatePrice: async (
    id: string,
    data: UpdatePriceRequest
  ): Promise<ApiResponse<Product>> => {
    return apiPatch<Product>(`/product/${id}/price`, data);
  },

  /**
   * Xóa sản phẩm
   * DELETE /api/v1/product/:id
   */
  remove: async (id: string): Promise<ApiResponse> => {
    return apiDelete(`/product/${id}`);
  },
};

export default productService;
