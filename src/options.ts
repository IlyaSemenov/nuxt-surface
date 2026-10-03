/** Configure the page tree of each surface. */
export interface ModuleOptions {
  /** Surface IDs mapped to static route prefixes; the `/` surface owns pages outside other prefixes. */
  surfaces: Record<string, string>
}

/** Require nonempty IDs and static absolute prefixes with unambiguous ownership. */
export function validateSurfaces(surfaces: Record<string, string>): void {
  const entries = Object.entries(surfaces)
  if (!entries.length)
    throw new Error("nuxt-surface: declare at least one surface in surface.surfaces.")
  for (const [id, prefix] of entries) {
    if (!id) throw new Error("nuxt-surface: surface IDs must not be empty.")
    // Nonempty segments without route params, wildcards, or optional groups.
    if (prefix !== "/" && !/^(?:\/[^/:*?()]+)+$/.test(prefix))
      throw new Error(
        `nuxt-surface: surface ${id} prefix must be a static absolute path without a trailing slash (except "/").`,
      )
  }
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
