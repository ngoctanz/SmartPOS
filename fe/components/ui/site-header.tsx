"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center border-b bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-200">
      <div className="flex w-full items-center gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-2 md:gap-3">
          <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-primary transition-colors" />
          <Separator orientation="vertical" className="h-6" />
        </div>
      </div>
    </header>
  );
}
