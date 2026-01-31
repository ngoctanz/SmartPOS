# Mobile Quick Reference

## 🎯 Khi nào dùng Mobile Components?

```typescript
import { useIsMobile } from "@/hooks/useIsMobile";

const isMobile = useIsMobile();

// ✅ Conditional rendering
{isMobile ? <MobileComponent /> : <DesktopComponent />}
```

## 📱 Mobile Component Patterns

### 1. Input Fields

```typescript
// ❌ Tránh
<Input type="number" autoFocus />

// ✅ Nên dùng
<Input 
  type="number"
  inputMode="numeric"  // Keyboard type
  pattern="[0-9]*"     // iOS optimization
  enterKeyHint="done"  // Enter button label
/>
```

### 2. Focus Management

```typescript
// ❌ Tránh auto-focus
{!isMobile && <Input autoFocus />}

// ✅ Blur sau action
const handleSelect = (item) => {
  onSelect(item);
  if (isMobile) {
    inputRef.current?.blur();
  }
};
```

### 3. Touch Targets

```typescript
// ❌ Quá nhỏ
<Button size="sm" className="h-6 w-6" />

// ✅ Đủ lớn (min 44x44px)
<Button size="icon" className="h-11 w-11" />
```

### 4. Fixed Bottom Bar

```typescript
// ✅ Pattern
<div className="fixed bottom-0 left-0 right-0 safe-area-inset-bottom">
  {/* Content */}
</div>

{/* Spacer để tránh content bị che */}
<div className="h-32" />
```

### 5. Modal/Sheet

```typescript
// ✅ Mobile: Sheet từ dưới lên
<Sheet>
  <SheetContent side="bottom" className="h-[85vh]">
    {/* Content */}
  </SheetContent>
</Sheet>

// ✅ Desktop: Dialog ở giữa
<Dialog>
  <DialogContent>
    {/* Content */}
  </DialogContent>
</Dialog>
```

## 🔧 Common Patterns

### Responsive Layout

```typescript
<div className={cn(
  "flex gap-4",
  isMobile ? "flex-col" : "flex-row"
)}>
  <div className="flex-1">Main</div>
  {!isMobile && <div className="w-96">Sidebar</div>}
</div>
```

### Conditional Features

```typescript
// Disable keyboard shortcuts on mobile
useEffect(() => {
  if (isMobile) return;
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Desktop shortcuts
  };
  
  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [isMobile]);
```

### Touch-Optimized Controls

```typescript
// ✅ Plus/Minus buttons
<div className="flex items-center gap-1">
  <Button size="icon" onClick={() => decrease()}>
    <Minus className="h-4 w-4" />
  </Button>
  <Input value={value} className="text-center" />
  <Button size="icon" onClick={() => increase()}>
    <Plus className="h-4 w-4" />
  </Button>
</div>
```

## 🎨 Styling Tips

### Safe Areas

```css
/* Tailwind utility */
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Prevent Zoom

```css
/* Already in globals.css */
@media screen and (max-width: 768px) {
  input { font-size: 16px !important; }
}
```

### Touch Feedback

```typescript
// ✅ Use active: instead of hover: on mobile
<div className="active:bg-accent hover:bg-accent/50">
  {/* Content */}
</div>
```

## 🐛 Common Issues & Fixes

### Issue: Keyboard che input
```typescript
// Fix: Scroll into view
inputRef.current?.scrollIntoView({ 
  behavior: "smooth", 
  block: "center" 
});
```

### Issue: Double-tap zoom
```typescript
// Fix: Already handled in viewport meta
viewport: {
  userScalable: false,
}
```

### Issue: Focus loop
```typescript
// Fix: Disable auto-refocus on mobile
{!isMobile && <Input autoFocus />}
```

### Issue: Barcode scanner không hoạt động
```typescript
// Fix: Check keystroke timing
const isFromScanner = () => {
  const times = keystrokeTimesRef.current;
  if (times.length < 3) return false;
  const avgInterval = (times[times.length - 1] - times[0]) / (times.length - 1);
  return avgInterval < 50; // Scanner types fast
};
```

## 📊 Performance Checklist

- [ ] Component lazy loading
- [ ] Optimized re-renders (useCallback, useMemo)
- [ ] Debounced search
- [ ] Virtual scrolling for long lists
- [ ] Image optimization (lazy load, proper sizes)
- [ ] Bundle size check

## 🧪 Testing Checklist

### Desktop
- [ ] Keyboard shortcuts
- [ ] Auto-focus
- [ ] Hover states
- [ ] Table layout

### Mobile
- [ ] Touch interactions
- [ ] No auto-focus
- [ ] Keyboard handling
- [ ] Fixed bottom bar
- [ ] Safe areas
- [ ] Orientation change

## 📚 Resources

- [Mobile Optimization Guide](./mobile-optimization.md)
- [Import Receipt Components](../components/import-receipt/README.md)
- [Changelog](../CHANGELOG-MOBILE.md)
