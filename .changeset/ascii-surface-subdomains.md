---
"nuxt-surface": minor
---

Surface hosts take only ASCII hostnames: `defineSurfaceHosts()` accepts subdomains of dot-separated ASCII letters, digits, and hyphens that URLs accept, and `resolve()` and `hostname()` throw for Unicode.
