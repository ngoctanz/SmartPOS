import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  className,
  trend,
}: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(description || trend) && (
          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  trend.positive ? "text-emerald-500" : "text-rose-500"
                )}
              >
                {trend.positive ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            )}
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
