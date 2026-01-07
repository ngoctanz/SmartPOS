import { apiPost } from "./api.service";
import { ApiResponse } from "./api.config";

export interface UploadResponse {
  url: string;
  publicId: string;
}

const uploadService = {
  uploadImage: async (file: File): Promise<ApiResponse<UploadResponse>> => {
    const formData = new FormData();
    formData.append("image", file);

    return apiPost<UploadResponse>("/upload/image", formData);
  },
};

export default uploadService;
