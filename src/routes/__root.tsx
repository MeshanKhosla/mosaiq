/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router';
import * as React from 'react';
import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest } from '@tanstack/react-start/server';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import {
  fetchSession,
  getCookieName,
} from '@convex-dev/better-auth/react-start';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ConvexQueryClient } from '@convex-dev/react-query';
import type { ConvexReactClient } from 'convex/react';
import type { QueryClient } from '@tanstack/react-query';
import { authClient } from '~/lib/auth-client';
import { ThemeProvider } from '~/components/theme-provider';
import appCss from '~/styles/app.css?url';

// Get auth information for SSR using available cookies
const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const { createAuth } = await import('../../convex/auth');
    const { session } = await fetchSession(getRequest());
    const sessionCookieName = getCookieName(createAuth);
    const token = getCookie(sessionCookieName);
    return {
      userId: session?.user.id,
      token,
    };
  } catch (error) {
    // Return empty auth data if there's an error (e.g., during stream closure)
    console.error('Error in fetchAuth:', error);
    return {
      userId: undefined,
      token: undefined,
    };
  }
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  beforeLoad: async (ctx) => {
    // all queries, mutations and action made with TanStack Query will be
    // authenticated by an identity token.
    try {
      const { token } = await fetchAuth();

      // During SSR only (the only time serverHttpClient exists),
      // set the auth token to make HTTP queries with.
      if (token) {
        ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
      }
    } catch (error) {
      // Silently handle errors during SSR to prevent stream closure issues
      // This can happen during page refreshes when the stream is already closing
      console.error('Error fetching auth in beforeLoad:', error);
    }
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Mosaiq',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/favicon-32x32.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/favicon-16x16.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  notFoundComponent: () => <div>Route not found</div>,
  component: RootComponent,
});

function RootComponent() {
  const context = useRouteContext({ from: Route.id });
  return (
    <ConvexBetterAuthProvider
      client={context.convexClient}
      authClient={authClient}
    >
      <RootDocument>
        <Outlet />
        {import.meta.env.DEV && (
          <ReactQueryDevtools
            initialIsOpen={false}
            buttonPosition="bottom-left"
          />
        )}
      </RootDocument>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="mosaiq-theme">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
