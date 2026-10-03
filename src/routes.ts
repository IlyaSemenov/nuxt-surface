// Shared by build-time validation and, through a generated template, by runtime selection.

/** Path fields shared by Nuxt's resolved pages and Vue Router records. */
interface RouteTree {
  path: string
  children?: RouteTree[]
}

/** Find the surface whose prefix contains a top-level path, falling back to the `/` surface. */
export function surfaceOf(path: string, surfaces: Record<string, string>): string | undefined {
  const ids = Object.keys(surfaces)
  return (
    ids.find(
      id => surfaces[id] !== "/" && (path === surfaces[id] || path.startsWith(`${surfaces[id]}/`)),
    ) ?? ids.find(id => surfaces[id] === "/")
  )
}

/** Keep Nuxt's infrastructure routes unchanged and move the surface's top-level routes to public paths. */
export function selectRoutes<T extends { path: string; component?: unknown }>(
  routes: readonly T[],
  surfaces: Record<string, string>,
  id: string,
  infrastructureComponent?: unknown,
): T[] {
  const prefix = surfaces[id]!
  return routes.flatMap(route => {
    // Nuxt imports its redirect and component-test stubs synchronously; _sync itself is not emitted.
    if (infrastructureComponent !== undefined && route.component === infrastructureComponent)
      return [route]
    if (surfaceOf(route.path, surfaces) !== id) return []
    // Generated records are shared between SSR requests; relative children follow their copied parent.
    return [prefix === "/" ? route : { ...route, path: route.path.slice(prefix.length) || "/" }]
  })
}

/** Reject resolved pages that runtime selection cannot assign to exactly one surface. */
export function validateSurfacePages(pages: RouteTree[], surfaces: Record<string, string>): void {
  const found = new Set<string>()
  for (const page of pages) {
    const id = surfaceOf(page.path, surfaces)
    if (!id) {
      throw new Error(
        `nuxt-surface: route ${page.path} is outside every surface prefix. Declare a "/" surface for the remaining pages.`,
      )
    }
    const foreign = foreignChild(page.children, page.path, id, surfaces)
    if (foreign) {
      throw new Error(
        `nuxt-surface: route ${page.path} of surface ${id} contains ${foreign} of another surface. A parent page cannot span surfaces.`,
      )
    }
    found.add(id)
  }
  for (const [id, prefix] of Object.entries(surfaces)) {
    if (!found.has(id)) throw new Error(`nuxt-surface: surface ${id} has no pages under ${prefix}.`)
  }
}

function foreignChild(
  children: RouteTree[] = [],
  parent: string,
  id: string,
  surfaces: Record<string, string>,
): string | undefined {
  for (const child of children) {
    // Nested absolute paths are public paths and stay unchanged at runtime.
    if (child.path.startsWith("/")) continue
    const path = `${parent.replace(/\/$/, "")}/${child.path}`
    if (surfaceOf(path, surfaces) !== id) return path
    const foreign = foreignChild(child.children, path, id, surfaces)
    if (foreign) return foreign
  }
}
