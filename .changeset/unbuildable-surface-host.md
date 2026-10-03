---
"nuxt-surface": patch
---

`url()` throws instead of returning the base host when it can't build the surface's hostname, such as on an IP address.
