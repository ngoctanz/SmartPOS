export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
  API_VERSION: "v1",
  TIMEOUT: 30000,
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}${endpoint}`;
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  access_token?: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
}

export class FetchError extends Error {
  statusCode: number;
  data?: any;

  constructor(message: string, statusCode: number, data?: any) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.name = "FetchError";
  }
}
