import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["src/index.ts", "src/hosts.ts", "src/routes.ts"],
  format: "esm",
  dts: true,
  exports: false,
  publint: true,
  attw: { profile: "esm-only" },
})
