import { useNuxtApp } from "#app/nuxt"

import { infrastructureComponent, selectRoutes, surfaces } from "./surfaces.mjs"

// The payload carries the SSR selection through hydration; page HMR reuses the same app state.
const key = "nuxt-surface"

/** Read the surface selected for the current Nuxt app, or null for a document without one. */
export function useSurface() {
  const id = useNuxtApp().payload.state[key]
  if (id === undefined) {
    throw new Error(
      "nuxt-surface: no surface has been selected yet. Call selectSurfaceRoutes() from routes() in app/router.options.ts.",
    )
  }
  return id
}

/** Select a surface once per Nuxt app and return its routes at public paths; null selects no routes. */
export function selectSurfaceRoutes(routes, select) {
  const state = useNuxtApp().payload.state
  if (state[key] === undefined) {
    const id = select()
    // Only an explicit null means no surface; undefined usually comes from missing context.
    // hasOwn converts keys to strings, so an array like ["site"] would pass without the type check.
    if (id !== null && (typeof id !== "string" || !Object.hasOwn(surfaces, id))) {
      throw new Error(
        `nuxt-surface: unknown surface ID ${String(id)}. Expected null or one of: ${Object.keys(surfaces).join(", ")}. The selector must return synchronously.`,
      )
    }
    state[key] = id
  }
  // Without routes, Nuxt renders its 404 error page.
  return state[key] === null
    ? []
    : selectRoutes(routes, surfaces, state[key], infrastructureComponent)
}
