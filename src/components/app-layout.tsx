import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar"
import { AppSidebar } from "./app-sidebar"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "18rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex items-center gap-4 p-4 border-b">
          <SidebarTrigger />
        </div>
        <div className="flex-1 p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

