import { CaretDown, Sparkle } from "@phosphor-icons/react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { navItems } from "@/components/wrytr/prototype-data"
import { UserAvatar } from "@/components/wrytr/ui-bits"
import { cn } from "@/lib/utils"

export function AppSidebar() {
  return (
    <Sidebar variant="floating" collapsible="icon" className="p-2">
      <SidebarHeader className="px-4 py-5 pb-6 group-data-[collapsible=icon]:px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="px-1 text-3xl font-medium tracking-normal text-foreground group-data-[collapsible=icon]:hidden">
            wrytr
          </div>
          <div className="hidden size-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground group-data-[collapsible=icon]:flex">
            w
          </div>
          <SidebarTrigger className="size-8 shrink-0 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    isActive={item.active}
                    size="lg"
                    tooltip={item.label}
                    className={cn(
                      "h-10 gap-3 rounded-lg px-3",
                      item.active &&
                        "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-4 px-4 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="h-10 gap-3 rounded-lg px-3 text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <Sparkle className="size-4" />
              <span>Upgrade</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarSeparator className="mx-0" />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-12 gap-3 rounded-lg px-0 hover:bg-transparent">
              <UserAvatar />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">Alex Mercer</span>
                <span className="block text-xs text-muted-foreground">Premium</span>
              </span>
              <CaretDown className="size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
