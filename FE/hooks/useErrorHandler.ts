import { toast } from "sonner";
import { FetchError } from "@/service";

export const useErrorHandler = () => {
  const handleError = (error: unknown, defaultMessage?: string) => {
    let errorMessage = defaultMessage || "Đã có lỗi xảy ra";

    if (error instanceof FetchError) {
      const statusCode = error.statusCode;
      const message = error.message?.toLowerCase() || "";

      // Handle specific status codes
      switch (statusCode) {
        case 400:
          errorMessage = error.message || "Dữ liệu không hợp lệ";
          break;
        case 401:
          if (
            message.includes("invalid") ||
            message.includes("incorrect") ||
            message.includes("wrong")
          ) {
            errorMessage = "Email hoặc mật khẩu không đúng";
          } else {
            errorMessage = error.message || "Phiên đăng nhập hết hạn";
          }
          break;
        case 403:
          errorMessage = "Bạn không có quyền thực hiện thao tác này";
          break;
        case 404:
          errorMessage = error.message || "Không tìm thấy dữ liệu";
          break;
        case 409:
          errorMessage = error.message || "Dữ liệu đã tồn tại";
          break;
        case 422:
          errorMessage = error.message || "Dữ liệu không hợp lệ";
          break;
        case 429:
          errorMessage =
            "Bạn đã thực hiện quá nhiều yêu cầu. Vui lòng thử lại sau";
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = "Lỗi hệ thống. Vui lòng thử lại sau";
          break;
        case 0:
          errorMessage = "Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng";
          break;
        default:
          errorMessage = error.message || defaultMessage || "Đã có lỗi xảy ra";
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return errorMessage;
  };

  const showError = (error: unknown, title?: string) => {
    const message = handleError(error);
    toast.error(title || "Lỗi", {
      description: message,
      duration: 5000,
    });
  };

  const showSuccess = (message: string, title?: string) => {
    toast.success(title || "Thành công", {
      description: message,
      duration: 3000,
    });
  };

  const showWarning = (message: string, title?: string) => {
    toast.warning(title || "Cảnh báo", {
      description: message,
      duration: 4000,
    });
  };

  const showInfo = (message: string, title?: string) => {
    toast.info(title || "Thông báo", {
      description: message,
      duration: 3000,
    });
  };

  return {
    handleError,
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
};
