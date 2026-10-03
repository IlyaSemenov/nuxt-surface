// Pure host mapping for Nitro, the Nuxt app, and server packages outside Nuxt.

/** A request host that no surface claims, described for an application-specific lookup. */
export type UnmappedHost =
  /** A subdomain of the base hostname, possibly nested, such as `acme` or `eu.acme`. */
  | { subdomain: string; surface?: undefined }
  /** Any other hostname, including the base hostname when no surface claims it. */
  | { domain: string; surface?: undefined }

/** The result of `resolve()`: a surface, or a host that no surface claims; compare `surface` with `undefined` to tell them apart. */
export type ResolvedHost<Id extends string> = { surface: Id } | UnmappedHost

/** Hosts of the surfaces passed to `defineSurfaceHosts()`. */
export interface SurfaceHosts<Id extends string> {
  /** Lowercased subdomain of each surface; `null` marks the base hostname. */
  readonly subdomains: Readonly<Record<Id, string | null>>
  /** Find the surface of a request hostname, or describe a host that no surface claims; both hostnames must be ASCII, as `URL.hostname` returns them. */
  resolve(hostname: string, baseHostname: string): ResolvedHost<Id>
  /** Build the lowercased hostname of a surface on an ASCII base hostname. */
  hostname(baseHostname: string, surface: Id): string
  /** Build an absolute URL on a surface's host, keeping the protocol and port of the base URL. */
  url(baseUrl: string | URL, surface: Id, path?: string): string
}

/** Map surfaces to ASCII subdomains of a base hostname; `null` places a surface on the base hostname itself. */
export function defineSurfaceHosts<const T extends Record<string, string | null>>(
  subdomains: T,
): SurfaceHosts<keyof T & string> {
  const surfaceBySubdomain = new Map<string | null, keyof T & string>()
  const subdomainBySurface = new Map<string, string | null>()
  for (const [surface, value] of Object.entries(subdomains)) {
    // Empty IDs would be falsy and break truthiness checks of `host.surface`.
    if (!surface) throw new Error("nuxt-surface: surface IDs must not be empty.")
    if (value === "")
      throw new Error(
        `nuxt-surface: surface ${surface} has an empty subdomain. Use null for the base host.`,
      )
    // URLs convert Unicode hostnames to Punycode, which resolve() would not match.
    if (value !== null && !/^[a-z\d-]+(?:\.[a-z\d-]+)*$/i.test(value))
      throw new Error(
        `nuxt-surface: surface ${surface} subdomain must be dot-separated labels of ASCII letters, digits, and hyphens. Use Punycode for Unicode names.`,
      )
    const subdomain = value === null ? null : value.toLowerCase()
    // URLs also reject some ASCII labels, such as invalid Punycode, so url() could never build them.
    if (
      subdomain !== null &&
      !setHostname(new URL("http://example.invalid"), `${subdomain}.example.invalid`)
    )
      throw new Error(
        `nuxt-surface: surface ${surface} subdomain ${value} is not a valid hostname.`,
      )
    const other = surfaceBySubdomain.get(subdomain)
    if (other !== undefined)
      throw new Error(
        `nuxt-surface: surfaces ${other} and ${surface} share the ${subdomain ?? "base"} host.`,
      )
    surfaceBySubdomain.set(subdomain, surface)
    subdomainBySurface.set(surface, subdomain)
  }

  const surfaceSubdomains = Object.freeze(Object.fromEntries(subdomainBySurface))

  function surfaceHostname(baseHostname: string, surface: keyof T & string) {
    const base = asciiHostname(baseHostname)
    const subdomain = subdomainBySurface.get(surface)
    // Only null denotes the base host; an unknown ID must not silently land there.
    if (subdomain === undefined) throw new Error(`nuxt-surface: unknown surface ${surface}.`)
    return subdomain === null ? base : `${subdomain}.${base}`
  }

  return {
    subdomains: surfaceSubdomains as Record<keyof T & string, string | null>,
    resolve(hostname, baseHostname) {
      const host = asciiHostname(hostname)
      const base = asciiHostname(baseHostname)
      const subdomain =
        host === base
          ? null
          : host.endsWith(`.${base}`)
            ? host.slice(0, -base.length - 1)
            : undefined
      if (subdomain === undefined) return { domain: host }
      const surface = surfaceBySubdomain.get(subdomain)
      if (surface !== undefined) return { surface }
      return subdomain === null ? { domain: host } : { subdomain }
    },
    hostname: surfaceHostname,
    url(baseUrl, surface, path = "/") {
      const base = new URL(baseUrl)
      const url = new URL(path, base)
      // Compare parsed URLs: backslashes and whitespace can also change the host; blob: keeps the inner origin.
      if (url.origin !== base.origin || url.protocol !== base.protocol)
        throw new Error("nuxt-surface: path must not change the base URL's origin.")
      url.hostname = surfaceHostname(url.hostname, surface)
      return url.href
    },
  }
}

/** Lowercase a hostname, rejecting Unicode, which never matches the Punycode hostnames of URLs. */
function asciiHostname(hostname: string): string {
  if (/[\u0080-\uffff]/.test(hostname))
    throw new Error(
      `nuxt-surface: hostname ${hostname} must be ASCII, as new URL(url).hostname returns it.`,
    )
  return hostname.toLowerCase()
}

/** Set a URL's hostname and tell whether it took: URL setters silently keep the old hostname instead of throwing. */
function setHostname(url: URL, hostname: string): boolean {
  url.hostname = hostname
  return url.hostname === hostname
}
