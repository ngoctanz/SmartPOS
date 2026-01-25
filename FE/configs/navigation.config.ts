import { ROUTES } from "@/configs/routes.config";
import {
  IconBuildingStore,
  IconDashboard,
  IconFileInvoice,
  IconFolder,
  IconPackage,
  IconTruck,
  IconUsers,
} from '@tabler/icons-react';

export const navItems = {
  user: {
    name: '',
    email: '',
    avatar: '',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: ROUTES.DASHBOARD,
      icon: IconDashboard,
    },
    {
      title: 'Quản lý loại sản phẩm',
      url: ROUTES.PRODUCT_TYPES,
      icon: IconFolder,
    },
    {
      title: 'Quản lý sản phẩm',
      url: ROUTES.PRODUCTS,
      icon: IconPackage,
    },
    {
      title: 'Quản lý nhập hàng',
      url: ROUTES.IMPORTS,
      icon: IconTruck,
    },
    {
      title: 'Quản lý hóa đơn',
      url: ROUTES.INVOICES,
      icon: IconFileInvoice,
    },
    {
      title: 'Quản lý user',
      url: ROUTES.USERS,
      icon: IconUsers,
    },
    {
      title: 'Quản lý chi nhánh',
      url: ROUTES.BRANCHES,
      icon: IconBuildingStore,
    },
  ],
};
