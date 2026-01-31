import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDetailedCurrency, formatNumber } from "@/utils/number.utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  trend?:
    | {
        value: number;
        label: string;
        positive?: boolean;
      }
    | "neutral"
    | "positive"
    | "critical";
  /** Compact mode for mobile - smaller padding, text, and icon */
  compact?: boolean;
  /** Show detailed tooltip on hover (for currency values) */
  showDetailedTooltip?: boolean;
  /** Raw numeric value for tooltip (if value is already formatted string) */
  rawValue?: number;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  trend,
  compact = false,
  showDetailedTooltip = false,
  rawValue,
}: StatsCardProps) {
  // Helper to determine trend color/style if it's a string
  const getTrendStyle = (type: string) => {
    switch (type) {
      case "positive":
        return "text-emerald-600 bg-emerald-50";
      case "critical":
        return "text-rose-600 bg-rose-50 font-semibold";
      case "neutral":
      default:
        return "text-muted-foreground bg-muted";
    }
  };

  const getTrendLabel = (type: string) => {
    switch (type) {
      case "positive":
        return "Tốt";
      case "critical":
        return "Cảnh báo";
      case "neutral":
      default:
        return "-";
    }
  };

  // Determine if we should show tooltip
  const numericValue = rawValue ?? (typeof value === "number" ? value : null);
  const shouldShowTooltip = showDetailedTooltip && numericValue !== null && numericValue >= 1_000;

  // State for mobile tap
  const [isMobileTooltipOpen, setIsMobileTooltipOpen] = React.useState(false);

  const valueDisplay = (
    <div className={cn(
      "font-bold tracking-tight",
      compact ? "text-xl" : "text-3xl"
    )}>{value}</div>
  );

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow duration-200",
        compact && "py-0 gap-0",
        className
      )}
    >
      <CardHeader className={cn(
        "flex flex-row items-center justify-between space-y-0",
        compact ? "pb-1.5 px-3 pt-3" : "pb-2"
      )}>
        <CardTitle className={cn(
          "font-medium text-muted-foreground text-primary",
          compact ? "text-xs" : "text-sm"
        )}>
          {title}
        </CardTitle>
        <div className={cn(
          "rounded-lg bg-primary/10 flex items-center justify-center",
          compact ? "h-7 w-7" : "h-9 w-9"
        )}>
          <Icon className={cn(
            "text-primary",
            compact ? "h-3.5 w-3.5" : "h-5 w-5"
          )} />
        </div>
      </CardHeader>
      <CardContent className={compact ? "px-3 pb-3" : ""}>
        {shouldShowTooltip ? (
          <TooltipProvider>
            <Tooltip 
              delayDuration={200}
              open={isMobileTooltipOpen}
              onOpenChange={setIsMobileTooltipOpen}
            >
              <TooltipTrigger asChild>
                <div 
                  className="cursor-help active:scale-95 transition-transform"
                  onClick={() => setIsMobileTooltipOpen(!isMobileTooltipOpen)}
                  onMouseEnter={() => setIsMobileTooltipOpen(true)}
                  onMouseLeave={() => setIsMobileTooltipOpen(false)}
                >
                  {valueDisplay}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{formatDetailedCurrency(numericValue!)}</p>
                  <p className="text-xs text-muted-foreground">
                    Chính xác: {formatNumber(numericValue!)} đ
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          valueDisplay
        )}
        {(description || trend) && (
          <div className={cn(
            "flex items-center gap-2",
            compact ? "mt-1" : "mt-2"
          )}>
            {trend && typeof trend === "object" ? (
              <span
                className={cn(
                  "font-medium px-2 py-0.5 rounded-md",
                  compact ? "text-[10px]" : "text-xs",
                  trend.positive
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-rose-600 bg-rose-50"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            ) : trend && typeof trend === "string" ? (
              <span
                className={cn(
                  "font-medium px-2 py-0.5 rounded-md",
                  compact ? "text-[10px]" : "text-xs",
                  getTrendStyle(trend)
                )}
              >
                {getTrendLabel(trend)}
              </span>
            ) : null}
            {description && !compact && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
