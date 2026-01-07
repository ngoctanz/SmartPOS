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
        return "";
    }
  };

  return (
    <Card
      className={cn(
        "overflow-hidden hover:shadow-md transition-shadow duration-200",
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && typeof trend === "object" ? (
              <span
                className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded-md",
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
                  "text-xs font-medium px-2 py-0.5 rounded-md",
                  getTrendStyle(trend)
                )}
              >
                {getTrendLabel(trend)}
              </span>
            ) : null}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
