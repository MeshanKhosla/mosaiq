import { Link, createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { authClient } from '~/lib/auth-client'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const queryClient = useQueryClient()
  const { data: user } = useSuspenseQuery(
    convexQuery(api.auth.getCurrentUser, {})
  )
  const {
    data: { viewer, numbers },
  } = useSuspenseQuery(convexQuery(api.myFunctions.listNumbers, { count: 10 }))

  const addNumber = useMutation(api.myFunctions.addNumber)

  const handleSignOut = async () => {
    await authClient.signOut()
    // Refetch the user query immediately to update the UI
    await queryClient.refetchQueries({
      queryKey: convexQuery(api.auth.getCurrentUser, {}).queryKey,
    })
  }

  return (
    <main className="p-8 flex flex-col gap-16">
      <div className="flex justify-between items-center max-w-lg mx-auto w-full">
        <h1 className="text-4xl font-bold">
          Convex + Tanstack Start
        </h1>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex flex-col items-end">
                <p className="text-sm font-medium">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm px-4 py-2 rounded-md transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/signin"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-md transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-8 max-w-lg mx-auto">
        <p>Welcome {viewer ?? 'Anonymous'}!</p>
        <p>
          Click the button below and open this page in another window - this
          data is persisted in the Convex cloud database!
        </p>
        <p>
          <button
            className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2"
            onClick={() => {
              void addNumber({ value: Math.floor(Math.random() * 10) })
            }}
          >
            Add a random number
          </button>
        </p>
        <p>
          Numbers:{' '}
          {numbers.length === 0 ? 'Click the button!' : numbers.join(', ')}
        </p>
        <p>
          Edit{' '}
          <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
            convex/myFunctions.ts
          </code>{' '}
          to change your backend
        </p>
        <p>
          Edit{' '}
          <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
            src/routes/index.tsx
          </code>{' '}
          to change your frontend
        </p>
        <p>
          Open{' '}
          <Link
            to="/anotherPage"
            className="text-blue-600 underline hover:no-underline"
          >
            another page
          </Link>{' '}
          to send an action.
        </p>
        <div className="flex flex-col">
          <p className="text-lg font-bold">Useful resources:</p>
          <div className="flex gap-2">
            <div className="flex flex-col gap-2 w-1/2">
              <ResourceCard
                title="Convex docs"
                description="Read comprehensive documentation for all Convex features."
                href="https://docs.convex.dev/home"
              />
              <ResourceCard
                title="Stack articles"
                description="Learn about best practices, use cases, and more from a growing
            collection of articles, videos, and walkthroughs."
                href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
              />
            </div>
            <div className="flex flex-col gap-2 w-1/2">
              <ResourceCard
                title="Templates"
                description="Browse our collection of templates to get started quickly."
                href="https://www.convex.dev/templates"
              />
              <ResourceCard
                title="Discord"
                description="Join our developer community to ask questions, trade tips & tricks,
            and show off your projects."
                href="https://www.convex.dev/community"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function ResourceCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
      <a href={href} className="text-sm underline hover:no-underline">
        {title}
      </a>
      <p className="text-xs">{description}</p>
    </div>
  )
}
