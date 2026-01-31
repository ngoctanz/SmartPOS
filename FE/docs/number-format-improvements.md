# Number Format Improvements - Vietnamese Style

## Tổng quan

Cải thiện cách hiển thị số tiền trong hệ thống để dễ đọc hơn theo phong cách Việt Nam, với format chi tiết và tooltip hiển thị thông tin đầy đủ.

## Vấn đề trước đây

### Format cũ
- **1,554,000,000** → "1.5 tỷ đ" (không rõ ràng)
- **100,500,000** → "100.5 triệu đ" (số thập phân khó đọc)
- **123,400** → "123.4 nghìn đ" (không tự nhiên)

### Nhược điểm
- Sử dụng số thập phân (1.5, 100.5) không phù hợp với cách đọc tiếng Việt
- Thiếu thông tin chi tiết
- Khó đọc và dễ nhầm lẫn

## Giải pháp mới

### Format mới - Kiểu Việt Nam
- **1,554,000,000** → "1 tỷ 554 triệu đ" ✅
- **100,500,000** → "100 triệu 500 nghìn đ" ✅
- **123,400** → "123 nghìn 4 trăm đ" ✅
- **50,000,000** → "50 triệu đ" ✅
- **2,000,000,000** → "2 tỷ đ" ✅

### Ưu điểm
- Dễ đọc, tự nhiên theo cách nói tiếng Việt
- Hiển thị đầy đủ thông tin (tỷ + triệu, triệu + nghìn, nghìn + trăm)
- Không dùng số thập phân
- Tooltip hiển thị chi tiết khi hover

## API Changes

### 1. formatCompactNumber()

```typescript
// Signature mới
formatCompactNumber(value: number, detailed: boolean = false): string

// Examples
formatCompactNumber(1_554_000_000, false) // "1 tỷ"
formatCompactNumber(1_554_000_000, true)  // "1 tỷ 554 triệu"
formatCompactNumber(100_500_000, true)    // "100 triệu 500 nghìn"
formatCompactNumber(123_400, true)        // "123 nghìn 4 trăm"
```

### 2. formatSmartCurrency()

```typescript
// Behavior mới: Luôn hiển thị chi tiết
formatSmartCurrency(1_554_000_000) // "1 tỷ 554 triệu đ"
formatSmartCurrency(100_500_000)   // "100 triệu 500 nghìn đ"
formatSmartCurrency(5_000_000)     // "5.000.000 ₫" (< 10M: full format)
```

### 3. formatDetailedNumber() - NEW

```typescript
// Luôn hiển thị chi tiết, không có "đ"
formatDetailedNumber(1_554_000_000) // "1 tỷ 554 triệu"
formatDetailedNumber(100_500_000)   // "100 triệu 500 nghìn"
```

### 4. formatDetailedCurrency() - NEW

```typescript
// Luôn hiển thị chi tiết, có "đ"
formatDetailedCurrency(1_554_000_000) // "1 tỷ 554 triệu đ"
formatDetailedCurrency(100_500_000)   // "100 triệu 500 nghìn đ"
```

## Component Updates

### 1. StatsCard - Thêm Tooltip với Mobile Support

```typescript
<StatsCard
  title="Tổng doanh thu"
  value={formatSmartCurrency(stats?.totalRevenue || 0)}
  icon={DollarSign}
  description="Doanh thu từ các đơn thành công"
  showDetailedTooltip={true}  // NEW: Enable tooltip
  rawValue={stats?.totalRevenue || 0}  // NEW: Raw value for tooltip
/>
```

**Tooltip hiển thị:**
- Dòng 1: "1 tỷ 554 triệu đ" (detailed format)
- Dòng 2: "Chính xác: 1.554.000.000 đ" (exact number)

**Mobile Support:**
- Desktop: Hover để hiển thị tooltip
- Mobile: Tap/Click để toggle tooltip
- Visual feedback: `active:scale-95` khi tap
- Auto close khi tap ra ngoài

### 2. SectionCards (Dashboard)

Tự động thêm tooltip cho các card tiền tệ:

```typescript
const cards = [
  {
    title: "Tổng doanh thu",
    value: formatSmartCurrency(stats?.revenue || 0),
    rawValue: stats?.revenue || 0,  // NEW
    showTooltip: true,  // NEW
    // ...
  },
  // ...
]
```

## Files Changed

### Core Utils
- ✅ `FE/utils/number.utils.ts` - Cập nhật logic format

### Components
- ✅ `FE/components/common/stats-card.tsx` - Thêm tooltip support
- ✅ `FE/components/ui/section-cards.tsx` - Thêm tooltip cho dashboard

### Pages
- ✅ `FE/app/trang-quan-ly/nhap-hang/page.tsx` - Áp dụng format mới
- ✅ `FE/app/trang-quan-ly/hoa-don/page.tsx` - Áp dụng format mới
- ✅ `FE/app/trang-quan-ly/page.tsx` - Dashboard (via SectionCards)

## Format Logic

### Tỷ (Billions)
```typescript
if (value >= 1_000_000_000) {
  const billions = Math.floor(value / 1_000_000_000);
  const millions = Math.floor((value % 1_000_000_000) / 1_000_000);
  
  if (detailed && millions > 0) {
    return `${billions} tỷ ${millions} triệu`;
  }
  return `${billions} tỷ`;
}
```

### Triệu (Millions)
```typescript
if (value >= 1_000_000) {
  const millions = Math.floor(value / 1_000_000);
  const thousands = Math.floor((value % 1_000_000) / 1_000);
  
  if (detailed && thousands > 0) {
    return `${millions} triệu ${thousands} nghìn`;
  }
  return `${millions} triệu`;
}
```

### Nghìn (Thousands)
```typescript
if (value >= 1_000) {
  const thousands = Math.floor(value / 1_000);
  const hundreds = Math.floor((value % 1_000) / 100);
  
  if (detailed && hundreds > 0) {
    return `${thousands} nghìn ${hundreds} trăm`;
  }
  return `${thousands} nghìn`;
}
```

## Examples

### Dashboard Stats
```
Tổng doanh thu: 1 tỷ 554 triệu đ
  [Hover] → Chi tiết: 1 tỷ 554 triệu đ
           Chính xác: 1.554.000.000 đ

Chi phí nhập hàng: 100 triệu 500 nghìn đ
  [Hover] → Chi tiết: 100 triệu 500 nghìn đ
           Chính xác: 100.500.000 đ
```

### Receipt Stats
```
Tổng doanh thu: 50 triệu đ
  [Hover] → Chi tiết: 50 triệu đ
           Chính xác: 50.000.000 đ
```

### Import Stats
```
Tổng giá trị nhập: 2 tỷ đ
  [Hover] → Chi tiết: 2 tỷ đ
           Chính xác: 2.000.000.000 đ
```

## Testing

### Test Cases
```typescript
// Tỷ
formatSmartCurrency(1_554_000_000) // "1 tỷ 554 triệu đ"
formatSmartCurrency(2_000_000_000) // "2 tỷ đ"

// Triệu
formatSmartCurrency(100_500_000) // "100 triệu 500 nghìn đ"
formatSmartCurrency(50_000_000)  // "50 triệu đ"

// Nghìn
formatSmartCurrency(123_400) // "123 nghìn 4 trăm đ"
formatSmartCurrency(50_000)  // "50 nghìn đ"

// Nhỏ hơn 10M: full format
formatSmartCurrency(5_000_000) // "5.000.000 ₫"
formatSmartCurrency(1_000)     // "1.000 ₫"
```

## Migration Guide

### Không cần migration!
- Tất cả thay đổi backward compatible
- Code cũ vẫn hoạt động
- Chỉ cần thêm `showDetailedTooltip` và `rawValue` để enable tooltip

### Recommended Updates
```typescript
// Before
<StatsCard
  value={formatCurrency(stats?.totalRevenue || 0)}
/>

// After
<StatsCard
  value={formatSmartCurrency(stats?.totalRevenue || 0)}
  showDetailedTooltip={true}
  rawValue={stats?.totalRevenue || 0}
/>
```

## Benefits

### User Experience
- ✅ Dễ đọc hơn (1 tỷ 554 triệu vs 1.5 tỷ)
- ✅ Tự nhiên theo cách nói tiếng Việt
- ✅ Thông tin đầy đủ ngay từ đầu
- ✅ Tooltip cho chi tiết chính xác

### Business Value
- ✅ Giảm nhầm lẫn khi đọc số liệu
- ✅ Tăng độ tin cậy của hệ thống
- ✅ Phù hợp với văn hóa Việt Nam
- ✅ Chuyên nghiệp hơn trong báo cáo

### Technical
- ✅ Không breaking changes
- ✅ Performance tốt (no extra API calls)
- ✅ Reusable utilities
- ✅ Type-safe với TypeScript

## Future Enhancements

1. **Configurable precision** - Cho phép config số đơn vị hiển thị
2. **Locale support** - Hỗ trợ nhiều ngôn ngữ
3. **Abbreviation mode** - Mode rút gọn hơn nữa (1.5T, 100M)
4. **Copy to clipboard** - Click để copy số chính xác
5. **Voice reading** - Đọc số bằng giọng nói
