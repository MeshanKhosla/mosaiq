import { Home, LayoutDashboard } from 'lucide-react'
import { Link, useRouterState } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Avatar, AvatarFallback } from './ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from './ui/sidebar'
import { ThemeToggle } from './theme-toggle'
import { authClient } from '~/lib/auth-client'

const menuItems = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
]

export function AppSidebar() {
  const router = useRouterState()
  const queryClient = useQueryClient()
  const currentPath = router.location.pathname
  const { data: user } = useSuspenseQuery(
    convexQuery(api.auth.getCurrentUser, {}),
  )

  const handleSignOut = async () => {
    await authClient.signOut()
    await queryClient.refetchQueries({
      queryKey: convexQuery(api.auth.getCurrentUser, {}).queryKey,
    })
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return '?'
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Mosaiq</h1>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        {user ? (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 flex-1 rounded-md px-2 py-2 hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium leading-none truncate">
                    {user.name || 'User'}
                  </p>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href="/signin"
              className="flex items-center gap-2 flex-1 rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              Sign in
            </a>
            <ThemeToggle />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
