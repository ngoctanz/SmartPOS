type EventCallback = () => void;

const listeners = new Map<string, Set<EventCallback>>();

export const Events = {
  // Khi dữ liệu thay đổi (thêm, sửa, xóa) ảnh hưởng đến thống kê
  DATA_CHANGED: 'DATA_CHANGED',
};

export const eventBus = {
  /**
   * Đăng ký lắng nghe sự kiện
   */
  on(event: string, callback: EventCallback) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)?.add(callback);
    
    // Trả về hàm cleanup
    return () => this.off(event, callback);
  },

  /**
   * Hủy đăng ký lắng nghe
   */
  off(event: string, callback: EventCallback) {
    listeners.get(event)?.delete(callback);
  },

  /**
   * Phát sự kiện
   */
  emit(event: string) {
    listeners.get(event)?.forEach((cb) => cb());
  },
};
