export interface BaseEntity {
  _id: string;
  createdAt: string; 
  updatedAt: string; 
}

export type PaginationParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export type ApiResponse<T> = {
  data: T;
  message: string;
  total?: number;
  page?: number;
  totalPages?: number;
};
