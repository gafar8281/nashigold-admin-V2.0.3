import { useMemo, type ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  LayoutDashboardIcon,
  UsersIcon,
  Building2Icon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  MegaphoneIcon,
  MessageSquareWarningIcon,
  LogOutIcon,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { canAccessSection, type AppSection } from "@/lib/permissions"
import { ROLE_LABELS } from "@/lib/constants"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const NAV_ITEMS: Array<{ section: AppSection; to: string; label: string; icon: LucideIcon }> = [
  { section: "dashboard", to: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { section: "employees", to: "/employees", label: "Employees", icon: UsersIcon },
  { section: "branches", to: "/branches", label: "Branches", icon: Building2Icon },
  { section: "attendance", to: "/attendance", label: "Attendance", icon: CalendarCheckIcon },
  { section: "leave-requests", to: "/leave-requests", label: "Leave Requests", icon: CalendarDaysIcon },
  { section: "complaints", to: "/complaints", label: "Complaints", icon: MessageSquareWarningIcon },
  { section: "announcements", to: "/announcements", label: "Announcements", icon: MegaphoneIcon },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const { email, role, logout } = useAuth()
  const location = useLocation()

  const navItems = useMemo(
    () => NAV_ITEMS.filter((item) => canAccessSection(role, item.section)),
    [role]
  )

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <span className="font-heading text-sm font-semibold group-data-[collapsible=icon]:hidden">
              Nashi Gold Admin
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive =
                    item.to === "/"
                      ? location.pathname === "/"
                      : location.pathname.startsWith(item.to)
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        render={<Link to={item.to} />}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton size="lg">
                      <Avatar size="sm">
                        <AvatarFallback>
                          {email?.slice(0, 1).toUpperCase() ?? "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex flex-col truncate text-left group-data-[collapsible=icon]:hidden">
                        <span className="truncate text-sm">{email}</span>
                        {role && (
                          <span className="truncate text-xs text-muted-foreground">
                            {ROLE_LABELS[role]}
                          </span>
                        )}
                      </span>
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent align="start" side="top">
                  <DropdownMenuItem onClick={logout}>
                    <LogOutIcon />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
