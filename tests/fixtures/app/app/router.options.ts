import type { RouterConfig } from "nuxt/schema"

import { useNuxtApp } from "#app/nuxt"
import { useRequestContext } from "#nuxt-request-context/client"
import { selectSurfaceRoutes, type SurfaceId } from "#nuxt-surface"

export default {
  routes: (routes) => {
    const selected = selectSurfaceRoutes(routes, () => {
      const state = useNuxtApp().payload.state
      state.selectorCalls = Number(state.selectorCalls ?? 0) + 1
      const surface = useRequestContext().surface
      const invalid: Record<string, unknown> = { undefined: undefined, array: ["site"] }
      if (Object.hasOwn(invalid, surface)) return invalid[surface] as SurfaceId
      return surface === "none" ? null : (surface as SurfaceId)
    })
    // Browser tests make the next routes() call fail, or return a route the router rejects.
    const state = useNuxtApp().payload.state
    const failure = state.routesFailure
    delete state.routesFailure
    if (failure === "throw") throw new Error("routes() failed")
    return failure === "invalid" ? [...selected, { ...selected[0]!, name: undefined, path: "/:broken(" }] : selected
  },
} satisfies RouterConfig
