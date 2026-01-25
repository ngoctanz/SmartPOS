"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCirclePlusFilled, type Icon } from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { ROUTES } from "@/configs/routes.config";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: Icon;
  }[];
}) {
  const pathname = usePathname();

  // Grouping logic
  const groups = [
    {
      label: "",
      items: items.filter((i) => i.url === ROUTES.DASHBOARD),
    },
    {
      label: "Sản phẩm & Kho",
      items: items.filter((i) =>
        [ROUTES.PRODUCTS, ROUTES.PRODUCT_TYPES].includes(
          i.url
        )
      ),
    },
    {
      label: "Giao dịch",
      items: items.filter((i) =>
        [ROUTES.IMPORTS, ROUTES.INVOICES].includes(i.url)
      ),
    },
    {
      label: "Hệ thống",
      items: items.filter((i) =>
        [ROUTES.USERS, ROUTES.BRANCHES].includes(i.url)
      ),
    },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                size="lg"
                className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground shadow-sm transition-all"
              >
                <Link
                  href={ROUTES.CREATE_INVOICE}
                  className="flex justify-center font-medium"
                >
                  <IconCirclePlusFilled className="!size-5" />
                  <span>Tạo đơn nhanh</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {groups.map((group, index) => (
        <Fragment key={index}>
          <SidebarGroup className="py-0">
            {group.label && (
              <SidebarGroupLabel className="px-2 py-2 text-xs font-semibold uppercase text-muted-foreground/70">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={pathname === item.url}
                      className="transition-colors"
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {index < groups.length - 1 && (
            <div className="mx-4 my-2 h-[1px] bg-sidebar-border/50" />
          )}
        </Fragment>
      ))}
    </>
  );
}
