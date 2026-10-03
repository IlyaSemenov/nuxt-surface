import module, { type ModuleOptions } from "nuxt-surface"
import { defineSurfaceHosts, type ResolvedHost, type UnmappedHost } from "nuxt-surface/hosts"

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
hosts.url("https://example.com", "tenant")
// @ts-expect-error Surface hostnames accept only mapped surfaces.
hosts.hostname("example.com", "tenant")
// @ts-expect-error Declared subdomains are read-only.
hosts.subdomains.docs = "manuals"
// @ts-expect-error Declared subdomains are read-only.
hosts.subdomains = { site: null, docs: "manuals" }
// @ts-expect-error Declared subdomains list only mapped surfaces.
void hosts.subdomains.tenant
void [module, options, surface, unmapped, mapped, anyUnmapped, subdomain]
