'use client';

import {
  IconDashboard,
  IconDatabase,
  IconDiscount,
  IconFileDescription,
  IconFolder,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconUsers,
  IconShoppingCart,
} from '@tabler/icons-react';
import type * as React from 'react';

import { NavDocuments } from '@/components/ui/nav-documents';
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

const data = {
  user: {
    name: 'Admin',
    email: 'admin@gamestore.com',
    avatar: '',
  },
  navMain: [
    {
      title: 'Tổng quan',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Quản lý tài khoản',
      url: '/dashboard/accounts',
      icon: IconDatabase,
    },
    {
      title: 'Tài khoản đã bán',
      url: '/dashboard/sold-accounts',
      icon: IconShoppingCart,
    },
    {
      title: 'Quản lý danh mục',
      url: '/dashboard/categories',
      icon: IconFolder,
    },
    {
      title: 'Giảm giá',
      url: '/dashboard/discounts',
      icon: IconDiscount,
    },
    {
      title: 'Giao dịch',
      url: '/dashboard/orders',
      icon: IconListDetails,
    },
    {
      title: 'Nạp tiền',
      url: '/dashboard/topups',
      icon: IconReport,
    },
    {
      title: 'Người dùng',
      url: '/dashboard/users',
      icon: IconUsers,
    },
    {
      title: 'Thông báo',
      url: '/dashboard/notifications',
      icon: IconReport,
    },
  ],
  documents: [
    {
      name: 'Nhật ký hệ thống (Logs)',
      url: '/dashboard/logs',
      icon: IconFileDescription,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#" className="flex items-center gap-2">
                <img 
                  src="/images/logo.png" 
                  alt="Shop Ac VN Logo" 
                  className="h-8 w-8 object-contain"
                />
                <span className="text-base font-semibold">Shop Ac VN</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
