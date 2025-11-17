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
import type { ConvexReactClient } from 'convex/react';
import type { QueryClient } from '@tanstack/react-query';
import { authClient } from '~/lib/auth-client';
import { ThemeProvider } from '~/components/theme-provider';
import { DuckDBProvider } from '~/components/duckdb-provider';
import appCss from '~/styles/app.css?url';

// Get auth information for SSR using available cookies
export const fetchAuth = createServerFn({ method: 'GET' }).handler(async () => {
  const { createAuth } = await import('../../convex/auth');
  const { session } = await fetchSession(getRequest());
  const sessionCookieName = getCookieName(createAuth);
  const token = getCookie(sessionCookieName);
  return {
    userId: session?.user.id,
    token,
  };
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
}>()({
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
    beforeLoad: async () => {
      const { userId, token } = await fetchAuth();
      return { userId, token };
    },
    component: RootComponent,
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
      <DuckDBProvider>
        <RootDocument>
          <Outlet />
          {import.meta.env.DEV && (
            <ReactQueryDevtools
              initialIsOpen={false}
              buttonPosition="bottom-left"
            />
          )}
        </RootDocument>
      </DuckDBProvider>
    </ConvexBetterAuthProvider>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const storageKey = 'mosaiq-theme';
                const stored = localStorage.getItem(storageKey);
                const theme = stored === 'dark' || stored === 'light' ? stored : 'dark';
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(theme);
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider defaultTheme="dark" storageKey="mosaiq-theme">
          {children}
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  );
}
