export default defineNuxtConfig({
  modules: ["nuxt-surface"],
  surface: {
    surfaces: { tenant: "/", empty: "/missing" },
  },
  experimental: { scanPageMeta: false },
  devtools: { enabled: false },
  compatibilityDate: "2026-09-23",
})
