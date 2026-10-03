export default defineNuxtConfig({
  modules: [["nuxt-request-context", { provider: "./server/request-context.ts" }], "nuxt-surface"],
  surface: {
    surfaces: { site: "/trees/site", docs: "/trees/docs", tenant: "/" },
  },
  ssr: process.env.SURFACE_TEST_SPA !== "true",
  devtools: { enabled: false },
  compatibilityDate: "2026-09-23",
})
