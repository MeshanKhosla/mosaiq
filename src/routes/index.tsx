import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from '~/components/app-layout'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Mosaiq
          </h1>
          <p className="text-muted-foreground">
            Your minimal and beautiful dashboard
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
