import { expect, test } from "bun:test"

import module from "nuxt-surface"
import { defineSurfaceHosts } from "nuxt-surface/hosts"
import pkg from "nuxt-surface/package.json"

test("public package exports", () => {
  expect(typeof module).toBe("function")
  expect(defineSurfaceHosts({ docs: "docs" }).url("https://example.com", "docs")).toBe(
    "https://docs.example.com/",
  )
  expect(pkg.name).toBe("nuxt-surface")
})
