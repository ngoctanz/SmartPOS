"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format.utils";
import {
  calculateChange,
  suggestPaymentAmounts,
  thousandsToDong,
  formatThousands,
} from "@/utils/payment.utils";

interface CashPaymentInputProps {
  totalAmount: number;
  customerPaid: number | null;
  onCustomerPaidChange: (amount: number | null) => void;
  onEnterPress?: () => void;
}

export function CashPaymentInput({
  totalAmount,
  customerPaid,
  onCustomerPaidChange,
  onEnterPress,
}: CashPaymentInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState<string>("");
  const suggestions = React.useMemo(
    () => suggestPaymentAmounts(totalAmount),
    [totalAmount]
  );

  // Sync input value with customerPaid (chỉ khi không focus)
  React.useEffect(() => {
    // Không sync nếu input đang focus
    if (document.activeElement === inputRef.current) return;
    
    if (customerPaid === null || customerPaid === totalAmount) {
      setInputValue("");
    } else {
      setInputValue(String(customerPaid / 1000));
    }
  }, [customerPaid, totalAmount]);

  // Handle input change (đơn vị: nghìn đồng)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Cho phép rỗng hoặc số
    if (value && !/^\d*\.?\d*$/.test(value)) return;
    
    setInputValue(value);
    
    if (!value) {
      onCustomerPaidChange(null);
      return;
    }

    const thousands = parseFloat(value);
    if (!isNaN(thousands)) {
      onCustomerPaidChange(thousandsToDong(thousands));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    
    if (e.key === "Enter" && onEnterPress) {
      e.preventDefault();
      onEnterPress();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (amount: number) => {
    onCustomerPaidChange(amount);
    if (amount === totalAmount) {
      setInputValue("");
    } else {
      setInputValue(String(amount / 1000));
    }
  };

  // Calculate change
  const change = customerPaid ? calculateChange(totalAmount, customerPaid) : 0;
  const isEnough = customerPaid ? customerPaid >= totalAmount : true;

  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()} data-no-autofocus>
      {/* Input tiền khách đưa */}
      <div className="space-y-1.5">
        <Label className="text-sm text-muted-foreground">
          Tiền khách đưa (nghìn đồng)
        </Label>
        <div className="relative flex items-center">
          <Input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            placeholder={`${totalAmount / 1000}`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.stopPropagation()}
            className="pr-16 text-right text-lg font-semibold h-11"
            autoComplete="off"
          />
          <span className="absolute right-3 text-base text-muted-foreground font-medium">
            .000đ
          </span>
        </div>
      </div>

      {/* Gợi ý mệnh giá */}
      <div className="flex flex-wrap gap-2">
        {suggestions.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant={customerPaid === amount ? "default" : "outline"}
            size="sm"
            className="h-9 px-3 text-sm font-medium"
            onClick={(e) => {
              e.stopPropagation();
              handleSuggestionClick(amount);
            }}
          >
            {formatThousands(amount)}
          </Button>
        ))}
      </div>

      {/* Hiển thị tiền thối */}
      {customerPaid !== null && customerPaid > 0 && (
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Tiền khách đưa:</span>
            <span className="font-medium">{formatCurrency(customerPaid)}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Tiền thối:</span>
            <span className={`font-bold text-lg ${isEnough ? "text-green-600" : "text-red-500"}`}>
              {isEnough ? formatCurrency(change) : `Thiếu ${formatCurrency(totalAmount - customerPaid)}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
