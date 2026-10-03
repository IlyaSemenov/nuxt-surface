export default defineNuxtConfig({
  modules: [["nuxt-request-context", { provider: "./server/request-context.ts" }], "nuxt-surface"],
  surface: {
    surfaces: { site: "/trees/site", docs: "/trees/docs", tenant: "/" },
  },
  routeRules: { "/old": { redirect: "/section/42" } },
  // bun test sets NODE_ENV=test, and Nuxt's test mode disables client route-rule redirects.
  test: false,
  ssr: process.env.SURFACE_TEST_SPA !== "true",
  devtools: { enabled: false },
  compatibilityDate: "2026-09-23",
})
