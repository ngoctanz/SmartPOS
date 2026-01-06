import { FetchError } from "@/service";

export interface ErrorDetail {
  title: string;
  message: string;
  statusCode?: number;
  suggestion?: string;
}

export function parseError(error: unknown): ErrorDetail {
  if (error instanceof FetchError) {
    const statusCode = error.statusCode;
    const message = error.message?.toLowerCase() || "";

    // Authentication errors (401)
    if (statusCode === 401) {
      if (
        message.includes("invalid") ||
        message.includes("incorrect") ||
        message.includes("wrong") ||
        message.includes("password")
      ) {
        return {
          title: "Đăng nhập thất bại",
          message: "Email hoặc mật khẩu không đúng",
          statusCode,
          suggestion: "Vui lòng kiểm tra lại thông tin đăng nhập của bạn",
        };
      }
      if (message.includes("not found") || message.includes("user")) {
        return {
          title: "Tài khoản không tồn tại",
          message: "Email này chưa được đăng ký trong hệ thống",
          statusCode,
          suggestion: "Vui lòng kiểm tra lại email hoặc liên hệ quản trị viên",
        };
      }
      if (message.includes("disabled") || message.includes("inactive")) {
        return {
          title: "Tài khoản bị khóa",
          message: "Tài khoản của bạn đã bị vô hiệu hóa",
          statusCode,
          suggestion: "Vui lòng liên hệ quản trị viên để được hỗ trợ",
        };
      }
      return {
        title: "Xác thực thất bại",
        message: error.message || "Phiên đăng nhập đã hết hạn",
        statusCode,
        suggestion: "Vui lòng đăng nhập lại",
      };
    }

    // Bad request (400)
    if (statusCode === 400) {
      return {
        title: "Dữ liệu không hợp lệ",
        message: error.message || "Thông tin bạn nhập không đúng định dạng",
        statusCode,
        suggestion: "Vui lòng kiểm tra lại các trường thông tin",
      };
    }

    // Forbidden (403)
    if (statusCode === 403) {
      return {
        title: "Không có quyền truy cập",
        message: "Bạn không có quyền thực hiện thao tác này",
        statusCode,
        suggestion: "Liên hệ quản trị viên nếu bạn cần quyền truy cập",
      };
    }

    // Not found (404)
    if (statusCode === 404) {
      return {
        title: "Không tìm thấy",
        message: error.message || "Dữ liệu bạn tìm kiếm không tồn tại",
        statusCode,
        suggestion: "Vui lòng kiểm tra lại hoặc làm mới trang",
      };
    }

    // Conflict (409)
    if (statusCode === 409) {
      return {
        title: "Dữ liệu đã tồn tại",
        message: error.message || "Thông tin này đã có trong hệ thống",
        statusCode,
        suggestion: "Vui lòng sử dụng thông tin khác",
      };
    }

    // Validation error (422)
    if (statusCode === 422) {
      return {
        title: "Lỗi xác thực",
        message: error.message || "Dữ liệu không hợp lệ",
        statusCode,
        suggestion: "Vui lòng kiểm tra lại thông tin đã nhập",
      };
    }

    // Rate limit (429)
    if (statusCode === 429) {
      return {
        title: "Quá nhiều yêu cầu",
        message: "Bạn đã thực hiện quá nhiều thao tác",
        statusCode,
        suggestion: "Vui lòng chờ một chút rồi thử lại",
      };
    }

    // Server errors (500+)
    if (statusCode >= 500) {
      return {
        title: "Lỗi hệ thống",
        message: "Máy chủ đang gặp sự cố",
        statusCode,
        suggestion: "Vui lòng thử lại sau hoặc liên hệ hỗ trợ kỹ thuật",
      };
    }

    // Network error (0)
    if (statusCode === 0) {
      return {
        title: "Lỗi kết nối",
        message: "Không thể kết nối đến máy chủ",
        statusCode,
        suggestion: "Vui lòng kiểm tra kết nối internet của bạn",
      };
    }

    // Generic error
    return {
      title: "Có lỗi xảy ra",
      message: error.message || "Đã có lỗi xảy ra khi xử lý yêu cầu",
      statusCode,
      suggestion: "Vui lòng thử lại sau",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Lỗi",
      message: error.message,
      suggestion: "Vui lòng thử lại sau",
    };
  }

  return {
    title: "Lỗi không xác định",
    message: "Đã có lỗi không xác định xảy ra",
    suggestion: "Vui lòng tải lại trang và thử lại",
  };
}

export function getErrorMessage(error: unknown): string {
  const { message } = parseError(error);
  return message;
}

export function getFullErrorMessage(error: unknown): string {
  const { message, suggestion } = parseError(error);
  return suggestion ? `${message}. ${suggestion}` : message;
}
