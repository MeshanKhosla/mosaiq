import { Database, FileText, Home, LayoutDashboard } from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
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
  useSidebar,
} from '~/components/ui/sidebar';
import { ThemeToggle } from '~/components/theme-toggle';
import { authClient } from '~/lib/auth-client';
import { getInitials } from '~/lib/user-utils';

const menuItems = [
  {
    title: 'Home',
    url: '/',
    icon: Home,
  },
  {
    title: 'Datasources',
    url: '/datasources',
    icon: Database,
  },
  {
    title: 'Analyses',
    url: '/analyses',
    icon: FileText,
  },
  {
    title: 'Dashboards',
    url: '/dashboards',
    icon: LayoutDashboard,
  },
];

export function AppSidebar() {
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { setOpenMobile, isMobile } = useSidebar();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 flex flex-row items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Mosaiq</h1>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => {
                  const isHome = item.url === '/';
                  return session || isHome;
                })
                .map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.url}
                    >
                      <Link
                        to={item.url}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
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
        {session ? (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 flex-1 rounded-md px-2 py-2 hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(session.user.name, session.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-medium leading-none truncate">
                    {session.user.name || 'User'}
                  </p>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="right" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {session.user.email}
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
  );
}
