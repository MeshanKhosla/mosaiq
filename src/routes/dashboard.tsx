import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '~/components/app-layout'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your dashboard content goes here
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
