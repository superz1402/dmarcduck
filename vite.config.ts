import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import vinext from "vinext";

// vinext = Next.js API surface on Vite, Cloudflare Workers as primary target.
// The vinext() plugin auto-detects src/app/ and loads next.config.mjs (security
// headers). The cloudflare() plugin emits the worker build + wrangler config.
// viteEnvironment is required for the App Router: RSC must run in workerd with
// ssr as its child environment (see vinext init-cloudflare.ts docs).
//
// Tailwind is wired via its native Vite plugin (@tailwindcss/vite) rather than
// the PostCSS route: in the cloudflare()-configured rsc environment, Vite's
// postcss-import cannot resolve the bare `@import "tailwindcss"` specifier,
// while the Vite plugin handles it in every environment by design.
export default defineConfig({
  plugins: [
    tailwindcss(),
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
});
