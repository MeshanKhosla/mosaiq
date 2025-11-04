import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

// Construct the base URL from the current origin
// In browser, use window.location.origin, fallback to env var or default
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/auth`;
  }
  // For SSR, try to use environment variable or default
  const siteUrl = (import.meta as any).env?.VITE_SITE_URL || "http://localhost:3000";
  return `${siteUrl}/api/auth`;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [convexClient()],
});
