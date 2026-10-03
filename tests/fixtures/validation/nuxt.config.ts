export default defineNuxtConfig({
  modules: ["nuxt-surface"],
  surface: { surfaces: JSON.parse(process.env.SURFACE_TEST_SURFACES!) },
  routeRules: { "/old": { redirect: "/" } },
  experimental: { scanPageMeta: false },
  devtools: { enabled: false },
  compatibilityDate: "2026-09-23",
})
