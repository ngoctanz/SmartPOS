# Import Receipt Components

## Components

### Desktop
- `ImportItemsTable` - Table layout cho desktop
- `ImportSummary` - Sidebar summary cho desktop  
- `SmartProductInput` - Input với auto-focus cho máy quét

### Mobile
- `ImportItemsMobile` - Card-based layout cho mobile
- `ImportSummaryMobile` - Fixed bottom bar + Sheet modal
- `SmartProductInputMobile` - Touch-optimized input

### Shared
- `ConfirmDialog` - Dialog xác nhận tạo phiếu
- `ImportReceiptDetailTable` - Chi tiết phiếu nhập
- `ErrorReceiptsTab` - Tab hiển thị phiếu lỗi

## Usage

```tsx
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  ImportItemsTable,
  ImportItemsMobile,
  ImportSummary,
  ImportSummaryMobile,
} from "@/components/import-receipt";

function ImportPage() {
  const isMobile = useIsMobile();
  
  return (
    <>
      {isMobile ? (
        <ImportItemsMobile {...props} />
      ) : (
        <ImportItemsTable {...props} />
      )}
      
      {isMobile ? (
        <ImportSummaryMobile {...props} />
      ) : (
        <ImportSummary {...props} />
      )}
    </>
  );
}
```

## Props

### ImportItemsMobile / ImportItemsTable

```typescript
interface Props {
  items: ImportItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onUpdatePrice: (productId: string, price: number) => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
}
```

### ImportSummaryMobile / ImportSummary

```typescript
interface Props {
  items: ImportItem[];
  branches: Branch[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  supplierName: string;
  onSupplierChange: (name: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  isAdmin: boolean;
  onSubmit: () => void;
  disabled: boolean;
}
```

## Mobile Optimizations

1. **Touch-friendly controls**: Plus/Minus buttons, larger tap targets
2. **No auto-focus**: Tránh bàn phím bật tự động
3. **Blur after selection**: Ẩn bàn phím sau khi chọn sản phẩm
4. **Fixed bottom bar**: Summary luôn hiển thị ở dưới
5. **Sheet modal**: Form inputs trong modal dễ tương tác
6. **Safe area support**: Hỗ trợ notch và home indicator

## Testing

```bash
# Desktop
- Keyboard shortcuts (F9, Enter)
- Auto-focus behavior
- Barcode scanner

# Mobile  
- Touch interactions
- Keyboard handling
- Scroll behavior
- Fixed bottom bar
- Sheet modal
```
