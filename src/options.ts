/** Configure the page tree of each surface. */
export interface ModuleOptions {
  /** Surface IDs mapped to static route prefixes; the `/` surface owns pages outside other prefixes. */
  surfaces: Record<string, string>
}

/** Reject declarations whose ownership would depend on declaration order. */
export function validateSurfaces(surfaces: Record<string, string>): void {
  const entries = Object.entries(surfaces)
  if (!entries.length)
    throw new Error("nuxt-surface: declare at least one surface in surface.surfaces.")
  for (const [id, prefix] of entries) {
    for (const [otherId, otherPrefix] of entries) {
      if (
        id !== otherId &&
        (prefix === otherPrefix || (prefix !== "/" && otherPrefix.startsWith(`${prefix}/`)))
      ) {
        throw new Error(
          `nuxt-surface: surfaces ${id} (${prefix}) and ${otherId} (${otherPrefix}) overlap.`,
        )
      }
    }
  }
}
