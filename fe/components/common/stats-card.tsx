import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  trend,
}: StatsCardProps) {
  // Helper to determine trend color/style if it's a string
  const getTrendStyle = (type: string) => {
    switch (type) {
      case "positive":
        return "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded";
      case "critical":
        return "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded font-semibold";
      case "neutral":
      default:
        return "text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded";
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

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md border-border/60",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="p-1.5 bg-primary/5 rounded-full ring-1 ring-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            {trend && typeof trend === "object" ? (
              <span
                className={cn(
                  "font-medium px-1.5 py-0.5 rounded",
                  trend.positive
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-rose-600 bg-rose-50"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            ) : trend && typeof trend === "string" ? (
              <span className={cn("font-medium", getTrendStyle(trend))}>
                {getTrendLabel(trend)}
              </span>
            ) : null}
            <span className="line-clamp-1">{description}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
