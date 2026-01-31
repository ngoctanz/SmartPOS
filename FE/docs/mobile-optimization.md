# Mobile Optimization Guide

## Tổng quan

Trang nhập hàng đã được tối ưu hóa cho mobile với các component riêng biệt và xử lý logic phù hợp với thiết bị di động.

## Các thay đổi chính

### 1. Responsive Components

#### Desktop Components
- `ImportItemsTable`: Bảng dạng table với nhiều cột
- `ImportSummary`: Sidebar cố định bên phải
- `SmartProductInput`: Auto-focus với logic phức tạp cho máy quét

#### Mobile Components  
- `ImportItemsMobile`: Card-based layout, dễ tương tác trên màn hình nhỏ
- `ImportSummaryMobile`: Fixed bottom bar + Sheet modal cho thông tin chi tiết
- `SmartProductInputMobile`: Tối ưu cho touch, tự động ẩn bàn phím sau khi chọn

### 2. Hook Detection

```typescript
import { useIsMobile } from "@/hooks/useIsMobile";

const isMobile = useIsMobile(); // Detect based on screen width + touch capability
```

### 3. Focus Management

**Desktop:**
- Auto-focus vào search input
- Auto-refocus sau mỗi action
- Keyboard shortcuts (F9, Enter)

**Mobile:**
- Không auto-focus (tránh bàn phím bật tự động)
- Blur input sau khi chọn sản phẩm
- Disable keyboard shortcuts
- Touch-optimized controls

### 4. Input Handling

**Barcode Scanner:**
- Vẫn hoạt động trên cả desktop và mobile
- Detect rapid typing (< 50ms giữa các keystroke)
- Auto-submit khi phát hiện barcode

**Manual Input:**
- Desktop: Debounce 300-400ms
- Mobile: Thêm nút Search để control rõ ràng
- `inputMode="numeric"` cho số lượng
- `inputMode="decimal"` cho giá tiền
- `enterKeyHint="search"` cho UX tốt hơn

### 5. UI/UX Improvements

**Mobile-specific:**
- Card layout thay vì table
- Larger touch targets (min 44x44px)
- Plus/Minus buttons cho quantity
- Tap-to-edit cho giá nhập
- Fixed bottom bar cho summary
- Sheet modal cho form inputs
- Safe area insets support (notch, home indicator)

**Performance:**
- Lazy rendering cho danh sách dài
- Optimized re-renders với useCallback
- Prevent zoom on input focus (font-size: 16px)

## Best Practices

### 1. Testing trên Mobile

```bash
# Test trên thiết bị thật hoặc emulator
# Kiểm tra:
- Barcode scanner hoạt động
- Keyboard không che input
- Touch targets đủ lớn
- Scroll smooth
- Fixed bottom bar không che nội dung
```

### 2. Xử lý Focus

```typescript
// ❌ Tránh auto-focus trên mobile
{!isMobile && <Input autoFocus />}

// ✅ Blur sau action trên mobile
if (isMobile) {
  inputRef.current?.blur();
}
```

### 3. Keyboard Shortcuts

```typescript
// ❌ Không disable hoàn toàn
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      // Always handle
    }
  };
});

// ✅ Conditional based on device
useEffect(() => {
  if (isMobile) return; // Skip on mobile
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Desktop shortcuts
  };
});
```

### 4. Input Types

```typescript
// ✅ Sử dụng đúng input type và mode
<Input
  type="number"
  inputMode="numeric"  // Hiện bàn phím số
  pattern="[0-9]*"     // iOS optimization
/>

<Input
  type="number"
  inputMode="decimal"  // Hiện bàn phím số + dấu thập phân
  step="1000"          // Increment step
/>
```

### 5. Safe Areas

```css
/* Sử dụng safe-area-inset cho notch/home indicator */
.fixed-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

## Troubleshooting

### Vấn đề: Bàn phím che input
**Giải pháp:** Sử dụng `scrollIntoView` hoặc adjust layout khi keyboard xuất hiện

### Vấn đề: Double-tap zoom
**Giải pháp:** 
- Set `user-scalable=no` trong viewport
- Hoặc sử dụng `touch-action: manipulation`

### Vấn đề: Focus loop trên mobile
**Giải pháp:** Disable auto-refocus logic khi `isMobile === true`

### Vấn đề: Barcode scanner không hoạt động
**Giải pháp:** 
- Kiểm tra keystroke timing detection
- Test với scanner thật, không phải keyboard
- Verify input không bị blur quá sớm

## Performance Metrics

**Target:**
- First Input Delay: < 100ms
- Touch response: < 50ms  
- Scroll FPS: 60fps
- Bundle size increase: < 10KB

## Future Improvements

1. **PWA Support:** Add service worker, offline capability
2. **Camera Barcode:** Sử dụng camera để quét barcode
3. **Haptic Feedback:** Rung nhẹ khi thêm sản phẩm thành công
4. **Voice Input:** Nhập bằng giọng nói
5. **Gesture Controls:** Swipe to delete, pull to refresh
