import { defineApp } from 'convex/server';
import betterAuth from '@convex-dev/better-auth/convex.config';
import r2 from '@convex-dev/r2/convex.config.js';
import autumn from '@useautumn/convex/convex.config';

const app = defineApp();
app.use(betterAuth);
app.use(r2);
app.use(autumn);

export default app;
