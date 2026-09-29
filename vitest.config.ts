import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  // tsconfigPaths resolves the "@/*" alias from tsconfig.json, so tests import
  // modules by the same specifier the app uses rather than a relative path.
  plugins: [tsconfigPaths(), react()],
  // tsconfig.json sets "jsx": "preserve" for Next's own compiler, which would
  // otherwise leave JSX untransformed here and fail with "React is not defined".
  esbuild: { jsx: "automatic" },
  test: {
    // jsdom by default because most of what is worth testing here is a React
    // component. Route handlers opt out with a `@vitest-environment node`
    // docblock, since they are server code and never see a DOM.
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    // e2e/ is a separate bespoke runner (npm run test:e2e) that boots servers.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    // Route handlers and lib/server read process.env at call time; isolating
    // files keeps one suite's env edits and module mocks out of another's.
    isolate: true,
  },
});
