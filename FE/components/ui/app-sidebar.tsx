"use client";

import type * as React from "react";

import { NavMain } from "@/components/ui/nav-main";
import { NavUser } from "@/components/ui/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { navItems } from "@/configs/navigation.config";
import { useAuth } from "@/hooks/useAuth";
import { useMemo, ComponentProps } from "react";

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();

  const filteredNavMain = useMemo(() => {
    if (user?.role !== "admin") {
      return navItems.navMain.filter(
        (item) =>
          item.title !== "Quản lý user" && item.title !== "Quản lý chi nhánh"
      );
    }
    return navItems.navMain;
  }, [user]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent active:bg-transparent h-auto"
            >
              <a
                href="#"
                className="flex items-center gap-2 justify-center w-full"
              >
                <Image
                  src="/logo/smartpos-logo.png"
                  alt="SmartPOS Logo"
                  width={240}
                  height={80}
                  className="h-20 w-auto object-contain"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navItems.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
