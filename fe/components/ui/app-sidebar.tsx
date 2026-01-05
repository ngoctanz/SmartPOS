'use client';


import type * as React from 'react';

import { NavMain } from '@/components/ui/nav-main';
import { NavUser } from '@/components/ui/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import Image from 'next/image';
import { ROUTES } from '@/configs/routes.config';
import { navItems } from '@/configs/navigation.config';


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5 hover:bg-transparent active:bg-transparent">
              <a href="#" className="flex items-center gap-2">
                <Image 
                  src="/logo/KiotViet-Logo-Horizontal.svg" 
                  alt="KiotViet Logo" 
                  width={120}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navItems.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
