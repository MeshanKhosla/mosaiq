# Mosaiq BI

A business intelligence platform for uploading, analyzing, and visualizing data. Upload CSV files as datasources, create analyses, and build interactive dashboards with multiple chart types.

Entry into https://www.convex.dev/hackathons/tanstack

## Tech Stack

### Frontend

- **React 19** - UI framework
- **TanStack Router** - File-based routing
- **TanStack Query** - Data fetching and caching
- **TanStack Table** - Data table components
- **ECharts** - Chart visualization library
- **ShadCN** - UI component library
- **Tailwind CSS** - Styling
- **DuckDB WASM** - Client-side data processing
- **Sentry** - For error monitoring

### Backend

- **Convex** - Real-time database and backend functions
- **Better Auth** - Authentication system

### Development

- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Bun** - Package manager and runtime

## Getting Started

1. Install dependencies:

```bash
bun install
```

2. Set up environment variables:

```bash
# Create .env file with:
VITE_CONVEX_URL=your_convex_url
VITE_SENTRY_DSN=your_sentry_dsn  # Optional: for error monitoring
# And the other convex URLs
CONVEX_DEPLOYMENT=your_convex_deployment
VITE_CONVEX_URL=https://your_convex.cloud
VITE_CONVEX_SITE_URL=https://your_convex.site
SITE_URL=your_site_url
```

3. Run development servers:

```bash
bun run dev
```

This starts both the web server and Convex backend concurrently.

## Scripts

- `bun run dev` - Start development servers (web + Convex)
- `bun run build` - Build for production
- `bun run lint` - Run TypeScript and ESLint checks
- `bun run format` - Format code with Prettier
