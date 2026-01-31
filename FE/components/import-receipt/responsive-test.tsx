"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Monitor } from "lucide-react";

/**
 * Component để test responsive behavior
 * Chỉ dùng trong development
 */
export function ResponsiveTest() {
  const isMobile = useIsMobile();
  const [windowSize, setWindowSize] = React.useState({
    width: 0,
    height: 0,
  });

  React.useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 p-3 z-50 shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        {isMobile ? (
          <Smartphone className="h-4 w-4 text-primary" />
        ) : (
          <Monitor className="h-4 w-4 text-primary" />
        )}
        <Badge variant={isMobile ? "default" : "secondary"}>
          {isMobile ? "Mobile" : "Desktop"}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Width: {windowSize.width}px</div>
        <div>Height: {windowSize.height}px</div>
        <div>Touch: {('ontouchstart' in window) ? "Yes" : "No"}</div>
      </div>
    </Card>
  );
}
