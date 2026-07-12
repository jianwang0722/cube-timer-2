import { join } from "node:path";
import { build, defineConfig, type Plugin } from "vite";
import { defineConfig as defineTestConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * cubing.js spawns its scramble/search worker by resolving
 * "./search-worker-entry.js" relative to its own chunk at runtime. Our
 * production bundle inlines cubing but never emits that file, so the worker
 * 404s and scrambles never load (dev serves it from node_modules, hence
 * works). The shipped file can't just be copied either: it uses bare and
 * relative imports that a browser won't resolve from /assets/. So after the
 * main build, run a child build that bundles the worker entry (dynamic
 * imports inlined) into the single self-contained file the runtime looks
 * for: /assets/search-worker-entry.js.
 */
function bundleCubingSearchWorker(): Plugin {
  return {
    name: "bundle-cubing-search-worker",
    apply: "build",
    async writeBundle(options) {
      const outDir = options.dir ?? "dist";
      await build({
        configFile: false,
        logLevel: "warn",
        build: {
          lib: {
            entry: "node_modules/cubing/dist/lib/cubing/chunks/search-worker-entry.js",
            formats: ["es"],
            fileName: () => "search-worker-entry.js",
          },
          outDir: join(outDir, "assets"),
          emptyOutDir: false,
          target: "esnext",
          rolldownOptions: {
            output: { inlineDynamicImports: true },
          },
        },
      });
    },
  };
}

export default mergeConfig(
  defineConfig({
    plugins: [react(), bundleCubingSearchWorker()],
  }),
  defineTestConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
    },
  }),
);
