import type { RouterConfig } from "@nuxt/schema"

import { useNuxtApp } from "#app/nuxt"
import { useRequestContext } from "#nuxt-request-context/client"
import { selectSurfaceRoutes, type SurfaceId } from "#nuxt-surface"

export default {
  routes: routes =>
    selectSurfaceRoutes(routes, () => {
      const state = useNuxtApp().payload.state
      state.selectorCalls = Number(state.selectorCalls ?? 0) + 1
      const surface = useRequestContext().surface
      const invalid: Record<string, unknown> = { undefined: undefined, array: ["site"] }
      if (Object.hasOwn(invalid, surface)) return invalid[surface] as SurfaceId
      return surface === "none" ? null : (surface as SurfaceId)
    }),
} satisfies RouterConfig
