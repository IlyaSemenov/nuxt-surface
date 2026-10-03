import module, { type ModuleOptions } from "nuxt-surface"
import {
  defineSurfaceHosts,
  type ResolvedHost,
  type SurfaceHosts,
  type UnmappedHost,
} from "nuxt-surface/hosts"

const options: ModuleOptions = { surfaces: { docs: "/docs" } }
const hosts = defineSurfaceHosts({ site: null, docs: "docs" })
const host: ResolvedHost<"site" | "docs"> = hosts.resolve("docs.example.com", "example.com")
const surface: "site" | "docs" | undefined = host.surface
const unmapped: UnmappedHost | undefined = host.surface !== undefined ? undefined : host
const mapped: { surface: "site" | "docs" } | undefined = host.surface === "docs" ? host : undefined
// Undefined checks also narrow results with plain string IDs, where truthiness checks don't.
const anyHost: ResolvedHost<string> = host
const anyUnmapped: UnmappedHost | undefined = anyHost.surface !== undefined ? undefined : anyHost
const subdomain: string | null = hosts.subdomains.docs
// @ts-expect-error Surface URLs accept only mapped surfaces.
hosts.getUrl("https://example.com", "tenant")
// @ts-expect-error Surface hostnames accept only mapped surfaces.
hosts.getHostname("example.com", "tenant")
// @ts-expect-error Declared subdomains are read-only.
hosts.subdomains.docs = "manuals"
// @ts-expect-error Declared subdomains are read-only.
hosts.subdomains = { site: null, docs: "manuals" }
// @ts-expect-error Declared subdomains list only mapped surfaces.
void hosts.subdomains.tenant
// Explicit IDs check the map against an existing union.
const explicit: SurfaceHosts<"site" | "docs"> = defineSurfaceHosts<"site" | "docs">({
  site: null,
  docs: "docs",
})
// @ts-expect-error Explicit IDs require a subdomain for each surface.
defineSurfaceHosts<"site" | "docs">({ site: null })
// @ts-expect-error Explicit IDs reject other surfaces.
defineSurfaceHosts<"site" | "docs">({ site: null, docs: "docs", blog: "blog" })
void [module, options, surface, unmapped, mapped, anyUnmapped, subdomain, explicit]
