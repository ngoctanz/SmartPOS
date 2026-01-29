# Enter Flow Optimization - Tạo Hóa Đơn

## Tổng quan

Tối ưu hóa flow phím Enter cho trang tạo hóa đơn, đảm bảo tốc độ và an toàn.

## Flow Tiền Mặt

```
IDLE → [Enter] Tạo đơn + In → IDLE
```

- Cooldown: 300ms sau khi tạo đơn
- Auto focus input sau khi hoàn thành
- Optimistic print: Pre-render HTML, chờ API success → trigger print

## Flow Chuyển Khoản

```
IDLE → [Enter] Tạo draft → QR_PREVIEW
     → [Enter] In bill (có QR)
     → [O] Hoàn thành → TRANSFER_SUCCESS
     → [Enter] OK → IDLE
```

- **Không cooldown** sau tạo draft → Enter ngay để in
- **Không cooldown** khi in bill → In bao nhiêu lần cũng được
- Cooldown 300ms chỉ khi đóng success dialog
- Auto focus input sau khi đóng dialog

## Bảo vệ An toàn

### 1. Race Condition Protection
- `isProcessing`: Chặn duplicate submit
- `isOnCooldown`: Chặn spam trong cooldown period
- Refs để tránh stale closure

### 2. Data Validation
- `canPrintDraft`: Chỉ in khi `draftData.receiptCode` đã có
- Double-check trong `handlePrintDraftReceipt`
- Validation trước khi confirm QR

### 3. Image Loading (QR Code)
- Đợi QR image load xong trước khi in
- Check `img.complete && img.naturalWidth > 0`
- Fallback timeout: 1000ms (thường load trong 50-200ms)

### 4. API Safety
- Tiền mặt: `optimisticPrint` - chờ API success → trigger print
- Chuyển khoản: `createDraft` API success → set `draftData` → cho phép in

## Files Liên quan

- `FE/hooks/useEnterFlow.ts` - Logic xử lý phím Enter
- `FE/app/trang-quan-ly/hoa-don/tao-moi/page.tsx` - Page tạo hóa đơn
- `FE/utils/print-queue.ts` - Queue manager cho in ấn
- `FE/utils/optimistic-print.ts` - Optimistic print cho tiền mặt
- `FE/hooks/useQRDraft.ts` - Quản lý draft chuyển khoản

## Performance

- Tiền mặt: ~100-250ms (pre-render + API + print)
- Chuyển khoản: 
  - Tạo draft: ~200-500ms (API)
  - In bill: ~50-200ms (QR load + print)
  - Tổng: ~250-700ms cho toàn bộ flow
