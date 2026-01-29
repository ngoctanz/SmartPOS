"use client";

import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format.utils";
import { Banknote, CreditCard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodStatsProps {
  cashCount: number;
  cashAmount: number;
  transferCount: number;
  transferAmount: number;
  cardCount?: number;
  cardAmount?: number;
  className?: string;
}

export function PaymentMethodStats({
  cashCount,
  cashAmount,
  transferCount,
  transferAmount,
  cardCount = 0,
  cardAmount = 0,
  className,
}: PaymentMethodStatsProps) {
  const mainStats = [
    {
      label: "Tiền mặt",
      count: cashCount,
      amount: cashAmount,
      icon: Banknote,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      label: "Chuyển khoản",
      count: transferCount,
      amount: transferAmount,
      icon: Smartphone,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
  ];

  const hasCardPayment = cardCount > 0 || cardAmount > 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main payment methods - Cash and Transfer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {mainStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.label}
              className={cn(
                "p-3 border transition-all hover:shadow-sm",
                stat.borderColor,
                stat.bgColor
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "p-2 rounded-lg bg-white shadow-sm flex-shrink-0",
                      stat.color
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground truncate">
                      {stat.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stat.count} đơn
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-lg sm:text-xl font-bold tabular-nums", stat.color)}>
                    {formatCurrency(stat.amount)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Card payment - shown separately if exists */}
      {hasCardPayment && (
        <Card className="p-3 border transition-all hover:shadow-sm border-purple-200 bg-purple-50">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 rounded-lg bg-white shadow-sm text-purple-600 flex-shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  Thẻ
                </p>
                <p className="text-xs text-muted-foreground">
                  {cardCount} đơn
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg sm:text-xl font-bold text-purple-600 tabular-nums">
                {formatCurrency(cardAmount)}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
