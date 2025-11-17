import { useState } from 'react';
import {
  Database,
  FileText,
  Home,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAction, useQuery } from 'convex/react';
import { useCustomer } from 'autumn-js/react';
import { api } from '../../convex/_generated/api';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
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
  const subscriptionStatus = useQuery(
    api.datasources.getSubscriptionStatus,
    session ? {} : 'skip',
  );
  const cancelSubscription = useAction(
    api.datasources.cancelSubscriptionAction,
  );
  const { checkout } = useCustomer();
  const syncSubscription = useAction(api.datasources.syncSubscriptionStatus);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  const handleCancelSubscriptionClick = () => {
    setShowCancelDialog(true);
  };

  const handleCancelSubscriptionConfirm = async () => {
    setShowCancelDialog(false);
    try {
      await cancelSubscription({ productId: 'pro' });
      window.location.reload();
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      setErrorMessage('Failed to cancel subscription. Please try again.');
      setShowErrorDialog(true);
    }
  };

  const handleUpgradeClick = () => {
    setShowUpgradeDialog(true);
  };

  const handleUpgradeConfirm = async () => {
    setShowUpgradeDialog(false);
    try {
      await checkout({
        productId: 'pro',
      });
      await syncSubscription();
      window.location.reload();
    } catch (err) {
      console.error('Checkout failed:', err);
      setErrorMessage('Failed to upgrade. Please try again.');
      setShowErrorDialog(true);
    }
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
                        preload="intent"
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
                    {subscriptionStatus?.hasPro && (
                      <p className="text-xs leading-none text-primary font-medium mt-1">
                        Pro Plan Active
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!subscriptionStatus?.hasPro && (
                  <>
                    <DropdownMenuItem onClick={handleUpgradeClick}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Upgrade to Pro (Free!)
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {subscriptionStatus?.hasPro && (
                  <>
                    <DropdownMenuItem
                      onClick={handleCancelSubscriptionClick}
                      className="text-destructive dark:text-red-400 focus:text-destructive dark:focus:text-red-400"
                    >
                      Cancel Subscription
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
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

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your Pro subscription? You will be
              downgraded to the free plan (20 datasources limit).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscriptionConfirm}
            >
              Cancel Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to Pro</DialogTitle>
            <DialogDescription>
              Upgrade to Pro (Free!) to unlock up to 50 datasources (currently
              limited to 20). This upgrade is free.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpgradeConfirm}>Confirm Upgrade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowErrorDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
