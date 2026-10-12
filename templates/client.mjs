import { useNuxtApp } from "#app/nuxt"

import {
  infrastructureComponent,
  isSurfaceIdOrNull,
  selectRoutes,
  stateKey,
  surfaces,
} from "./surfaces.mjs"

/** Read the surface selected for the current Nuxt app, or null for a document without one. */
export function useSurface() {
  const id = useNuxtApp().payload.state[stateKey]
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
  if (state[stateKey] === undefined) {
    const id = select()
    // Only an explicit null means no surface; undefined usually comes from missing context.
    if (!isSurfaceIdOrNull(id, surfaces)) {
      throw new Error(
        `nuxt-surface: unknown surface ID ${String(id)}. Expected null or one of: ${Object.keys(surfaces).join(", ")}. The selector must return synchronously.`,
      )
    }
    state[stateKey] = id
  }
  // Without routes, Nuxt renders its 404 error page.
  return state[stateKey] === null
    ? []
    : selectRoutes(routes, surfaces, state[stateKey], infrastructureComponent)
}
