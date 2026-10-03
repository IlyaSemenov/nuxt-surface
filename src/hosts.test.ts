import { describe, expect, test } from "bun:test"

import { defineSurfaceHosts } from "./hosts"

describe("surface hosts", () => {
  const hosts = defineSurfaceHosts({ site: null, docs: "docs" })

  test("hostnames resolve to surfaces or describe unmapped hosts", () => {
    expect(hosts.resolve("Example.com", "example.COM")).toEqual({ surface: "site" })
    expect(hosts.resolve("docs.example.com", "example.com")).toEqual({ surface: "docs" })
    expect(hosts.resolve("eu.acme.example.com", "example.com")).toEqual({ subdomain: "eu.acme" })
    expect(hosts.resolve("acme.org", "example.com")).toEqual({ domain: "acme.org" })
    expect(hosts.resolve("notexample.com", "example.com")).toEqual({ domain: "notexample.com" })
  })

  test("surface URLs keep the protocol, port and path", () => {
    expect(hosts.url("https://example.localhost:5480", "docs", "/guide?id=42#examples")).toBe(
      "https://docs.example.localhost:5480/guide?id=42#examples",
    )
    expect(hosts.url("https://example.com", "site")).toBe("https://example.com/")
    expect(hosts.url("https://example.com/base/", "docs", "guide")).toBe(
      "https://docs.example.com/base/guide",
    )
  })

  test("paths cannot replace the base origin", () => {
    for (const path of [
      "//elsewhere.test/guide",
      "http://elsewhere.test/guide",
      "https://example.com/guide",
      "http://example.com:8443/guide",
      " /\\elsewhere.test/guide",
      "blob:https://example.com:8443/id",
    ]) {
      expect(() => hosts.url("https://example.com:8443", "docs", path)).toThrow(
        "path must not change",
      )
    }
    expect(hosts.url("https://example.com:8443", "docs", "https://example.com:8443/guide")).toBe(
      "https://docs.example.com:8443/guide",
    )
  })
})

test("an unclaimed base hostname is an unmapped domain", () => {
  expect(defineSurfaceHosts({ docs: "docs" }).resolve("example.com", "example.com")).toEqual({
    domain: "example.com",
  })
})

test("surfaces cannot share a host", () => {
  expect(() => defineSurfaceHosts({ site: null, landing: null })).toThrow("share the base host")
  expect(() => defineSurfaceHosts({ docs: "docs", manuals: "docs" })).toThrow("share the docs host")
  expect(() => defineSurfaceHosts({ docs: "docs", manuals: "DOCS" })).toThrow("share the docs host")
})

test("surface URLs resolve back to their surfaces regardless of subdomain case", () => {
  const hosts = defineSurfaceHosts({ site: null, docs: "Docs", regional: "EU.Docs" })
  for (const id of ["site", "docs", "regional"] as const) {
    const hostname = new URL(hosts.url("https://example.com:8443", id)).hostname
    expect(hosts.resolve(hostname, "example.com")).toEqual({ surface: id })
  }
  expect(hosts.url("https://example.com", "docs")).toBe("https://docs.example.com/")
})

test("only null denotes the base host", () => {
  expect(() => defineSurfaceHosts({ site: "" })).toThrow("Use null for the base host")
})

test("surface IDs must not be empty", () => {
  expect(() => defineSurfaceHosts({ "": "docs" })).toThrow("IDs must not be empty")
})
