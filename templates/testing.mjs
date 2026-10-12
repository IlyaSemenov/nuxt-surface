import { useNuxtApp } from "#app/nuxt"
import routerOptions from "#build/router.options.mjs"
import generatedRoutes from "#build/routes"

import { isSurfaceIdOrNull, stateKey, surfaces } from "./surfaces.mjs"

/** Switch the running Nuxt app to another surface and return a function that switches it back. */
export async function replaceSurface(id) {
  const nuxtApp = useNuxtApp()
  const previous = nuxtApp.payload.state[stateKey]
  if (previous === undefined) {
    throw new Error(
      "nuxt-surface: no surface has been selected yet. Call selectSurfaceRoutes() from routes() in app/router.options.ts before replaceSurface().",
    )
  }
  if (!isSurfaceIdOrNull(id, surfaces)) {
    throw new Error(
      `nuxt-surface: unknown surface ID ${String(id)}. Expected null or one of: ${Object.keys(surfaces).join(", ")}.`,
    )
  }
  await applySurface(nuxtApp, id)
  let restoring
  // Concurrent and repeated calls share one restore; a failed restore can be retried.
  return () =>
    (restoring ??= applySurface(nuxtApp, previous).catch(error => {
      restoring = undefined
      throw error
    }))
}

/**
 * Store the surface ID and replace the router's routes with the app's routes for it.
 *
 * On failure, restore the previous ID and attempt to reinstall cleared routes.
 * Throw an AggregateError if recovery also fails.
 */
async function applySurface(nuxtApp, id) {
  const state = nuxtApp.payload.state
  const previous = state[stateKey]
  state[stateKey] = id
  let cleared = false
  try {
    const routes = await resolveRoutes(nuxtApp)
    cleared = true
    installRoutes(nuxtApp.$router, routes)
  } catch (error) {
    state[stateKey] = previous
    if (cleared) {
      try {
        installRoutes(nuxtApp.$router, await resolveRoutes(nuxtApp))
      } catch (restoreError) {
        throw new AggregateError(
          [error, restoreError],
          "nuxt-surface: replacing the surface failed, and so did restoring the previous one.",
        )
      }
    }
    throw error
  }
}

/** Call the app's routes() for the surface ID in the payload. */
async function resolveRoutes(nuxtApp) {
  // The same call as Nuxt's router plugin and route HMR, so transforms in the app's routes() apply too.
  // selectSurfaceRoutes() finds the stored ID and does not call the selector.
  return routerOptions.routes
    ? ((await nuxtApp.runWithContext(() => routerOptions.routes(generatedRoutes))) ??
        generatedRoutes)
    : generatedRoutes
}

/** Replace all route records without rematching the current route. */
function installRoutes(router, routes) {
  router.clearRoutes()
  for (const route of routes) router.addRoute(route)
}
