import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'

const routeMap: Record<string, string> = {
  '/': 'Home',
  '/dashboard': 'Dashboard',
  '/signin': 'Sign In',
  '/signup': 'Sign Up',
}

export function Breadcrumb() {
  const router = useRouterState()
  const pathname = router.location.pathname

  // Get the current page name
  const getCurrentPage = () => {
    if (routeMap[pathname]) {
      return routeMap[pathname]
    }
    const lastSegment = pathname.split('/').pop()
    if (lastSegment && lastSegment.length > 0) {
      return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
    }
    return 'Page'
  }

  const currentPage = getCurrentPage()

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link
        to="/"
        className="text-muted-foreground hover:text-accent-foreground transition-colors"
      >
        Home
      </Link>
      {pathname !== '/' && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <span className="text-accent-foreground font-medium">
            {currentPage}
          </span>
        </>
      )}
    </nav>
  )
}
