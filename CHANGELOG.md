# nuxt-surface

## 0.3.0

### Minor Changes

- 72accbe: Surface hosts rename `url()` to `getUrl()` and `hostname()` to `getHostname()`.

## 0.2.0

### Minor Changes

- a8e5142: Surface hosts take only ASCII hostnames: `defineSurfaceHosts()` accepts subdomains of dot-separated ASCII letters, digits, and hyphens that URLs accept, and `resolve()` and `hostname()` throw for Unicode.
- 44e5211: `defineSurfaceHosts()` rejects empty surface IDs.
- ae0b4b6: Nuxt is an optional peer dependency, so `nuxt-surface/hosts` installs without Nuxt.
- 44e5211: Unmapped hosts from `resolve()` have an undefined `surface`, so `host.surface` checks narrow the result, now exported as `ResolvedHost`.
- 3d37029: Surface hosts build a surface's hostname with `hostname()`.
- 3d37029: Surface hosts expose the declared subdomain of each surface as `subdomains`.

### Patch Changes

- e6bfdd5: `url()` throws instead of returning the base host when it can't build the surface's hostname, such as on an IP address.
- 3d37029: Surface hosts throw for an unknown surface ID instead of building the base host.

## 0.1.0

### Minor Changes

- b4dbc32: Initial beta release.
