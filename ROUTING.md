# Routing and Preloading

TanStack Start uses file-based routing where each file in `src/routes` becomes a route. Routes can define loaders that run before the component renders.

Loaders prefetch data for faster navigation. When you hover over a link with `preload="intent"`, the loader runs immediately. The router has `defaultPreload: 'intent'` configured globally, so all links prefetch on hover by default.

Loaders use `ensureQueryData` to fetch and cache data in React Query. This works with Convex queries via `convexQuery` from `@convex-dev/react-query`. The `ConvexQueryClient` is configured in the router to handle Convex query keys and execution.

During server-side rendering, loaders should skip execution since authentication isn't available. Check `typeof window === 'undefined'` to detect server-side and return early. Prefetching is only needed for client-side navigation.

Components use `useSuspenseQuery` with `convexQuery` to access the preloaded data. Suspense queries suspend until data is available, eliminating loading states. The data comes from the cache if prefetched, or fetches fresh if not.

The router context provides `queryClient` and `convexClient` to all routes. The `ConvexQueryClient` bridges React Query and Convex, managing subscriptions and keeping query results in sync with the database.
