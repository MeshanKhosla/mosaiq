import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '~/components/ui/sidebar';
import { AppSidebar } from '~/components/app-sidebar';
import { Breadcrumb } from '~/components/breadcrumb';

interface BreadcrumbCTAButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive';
}

interface BreadcrumbEditingProps {
  isEditing?: boolean;
  editName?: string;
  hasFocusedRef?: React.MutableRefObject<boolean>;
  onEditClick?: () => void;
  onNameChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  ctaButtons?: Array<BreadcrumbCTAButton>;
}

export function AppLayout({
  children,
  breadcrumbEditingProps,
}: {
  children: React.ReactNode;
  breadcrumbEditingProps?: BreadcrumbEditingProps;
}) {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          '--sidebar-width': '10rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-background/50 backdrop-blur-sm">
          <SidebarTrigger />
          <Breadcrumb {...breadcrumbEditingProps} />
        </div>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
