# Mobile Stats Card Optimization

## Vấn đề

Stats cards trên mobile quá to, chiếm nhiều không gian màn hình mà thông tin thì ít.

## Giải pháp

### 1. Thêm Compact Mode cho StatsCard

**File:** `FE/components/common/stats-card.tsx`

Thêm prop `compact?: boolean` để enable mobile-optimized layout:

```typescript
interface StatsCardProps {
  // ... existing props
  compact?: boolean; // New prop
}
```

### 2. Compact Mode Changes

Khi `compact={true}`:

#### Padding & Spacing
- Card: `py-0 gap-0` (thay vì `py-6 gap-6`)
- Header: `pb-1.5 px-3 pt-3` (thay vì `pb-2`)
- Content: `px-3 pb-3` (thay vì default padding)

#### Typography
- Title: `text-xs` (thay vì `text-sm`)
- Value: `text-xl` (thay vì `text-3xl`)
- Trend badge: `text-[10px]` (thay vì `text-xs`)

#### Icon
- Container: `h-7 w-7` (thay vì `h-9 w-9`)
- Icon: `h-3.5 w-3.5` (thay vì `h-5 w-5`)

#### Other
- Description: Hidden in compact mode (không hiển thị)
- Margin: `mt-1` (thay vì `mt-2`)

### 3. Grid Layout Optimization

**File:** `FE/app/trang-quan-ly/nhap-hang/page.tsx`

```typescript
<div className={cn(
  "grid grid-cols-2 lg:grid-cols-4",
  isMobile ? "gap-2" : "gap-3 sm:gap-4"
)}>
  <StatsCard compact={isMobile} {...props} />
</div>
```

- Mobile: `gap-2` (8px)
- Desktop: `gap-3 sm:gap-4` (12-16px)

## Kết quả

### Desktop (compact={false})
- Card height: ~140px
- Font size: Large (3xl value)
- Full description visible
- Comfortable spacing

### Mobile (compact={true})
- Card height: ~80px (giảm ~43%)
- Font size: Smaller (xl value)
- No description (save space)
- Tight spacing
- Gap giữa cards: 8px

## Sử dụng

```typescript
import { useIsMobile } from "@/hooks/useIsMobile";
import { StatsCard } from "@/components/common/stats-card";

function MyPage() {
  const isMobile = useIsMobile();
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
      <StatsCard
        title="Total"
        value={100}
        icon={FileText}
        description="Description text"
        compact={isMobile} // Enable compact on mobile
      />
    </div>
  );
}
```

## Best Practices

1. **Always use with useIsMobile hook** - Tự động detect device
2. **Adjust grid gap** - Giảm gap trên mobile để tiết kiệm không gian
3. **Hide descriptions on mobile** - Component tự động ẩn description
4. **Keep titles short** - Tiêu đề ngắn gọn cho mobile (< 15 chars)
5. **Use formatSmartCurrency** - Tự động format số lớn (1.2M thay vì 1,200,000)

## Responsive Breakpoints

- Mobile: < 768px (compact mode)
- Tablet: 768px - 1024px (normal mode, 2 columns)
- Desktop: > 1024px (normal mode, 4 columns)

## Performance

- No additional bundle size
- No extra re-renders
- CSS-only optimizations
- Minimal prop changes

## Browser Support

- All modern browsers
- iOS Safari 14+
- Chrome Mobile 90+
- Samsung Internet 14+
