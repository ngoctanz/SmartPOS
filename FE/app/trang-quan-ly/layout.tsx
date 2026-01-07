import { AppSidebar } from "@/components/ui/app-sidebar";
import { SiteHeader } from "@/components/ui/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
