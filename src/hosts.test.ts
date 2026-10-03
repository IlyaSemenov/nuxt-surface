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

test("surface hosts resolve back to their surfaces regardless of case", () => {
  const hosts = defineSurfaceHosts({ site: null, docs: "Docs", regional: "EU.Docs" })
  for (const id of ["site", "docs", "regional"] as const) {
    const hostname = new URL(hosts.url("https://example.com:8443", id)).hostname
    expect(hosts.resolve(hostname, "example.com")).toEqual({ surface: id })
    expect(hosts.hostname("Example.COM", id)).toBe(hostname)
  }
  expect(hosts.url("https://example.com", "docs")).toBe("https://docs.example.com/")
  expect(hosts.hostname("example.com", "regional")).toBe("eu.docs.example.com")
})

test("declared subdomains are lowercased and read-only", () => {
  const { subdomains } = defineSurfaceHosts({ site: null, docs: "Docs" })
  expect(subdomains).toEqual({ site: null, docs: "docs" })
  expect(Object.isFrozen(subdomains)).toBe(true)
})

test("only null denotes the base host", () => {
  expect(() => defineSurfaceHosts({ site: "" })).toThrow("Use null for the base host")
})

test("surface IDs must not be empty", () => {
  expect(() => defineSurfaceHosts({ "": "docs" })).toThrow("IDs must not be empty")
})

test("subdomains are ASCII hostname labels that URLs accept", () => {
  for (const subdomain of ["док", "a/b", "docs:8080", "docs.", "eu..docs"]) {
    expect(() => defineSurfaceHosts({ docs: subdomain })).toThrow("Use Punycode")
  }
  expect(() => defineSurfaceHosts({ docs: "xn--a" })).toThrow("docs subdomain xn--a is not a valid")
})

test("hostname arguments are ASCII", () => {
  const hosts = defineSurfaceHosts({ site: null, docs: "docs" })
  expect(() => hosts.resolve("док.example.com", "example.com")).toThrow(
    "hostname док.example.com must be ASCII",
  )
  expect(() => hosts.resolve("docs.xn--e1afmkfd.xn--p1ai", "пример.рф")).toThrow(
    "hostname пример.рф must be ASCII",
  )
  expect(() => hosts.hostname("пример.рф", "docs")).toThrow("hostname пример.рф must be ASCII")
})

test("internationalized hosts work in Punycode", () => {
  const baseUrl = new URL("https://пример.рф")
  const hosts = defineSurfaceHosts({ site: null, docs: "xn--d1aml" })
  const hostname = hosts.hostname(baseUrl.hostname, "docs")
  expect(hostname).toBe("xn--d1aml.xn--e1afmkfd.xn--p1ai")
  expect(new URL(hosts.url(baseUrl, "docs")).hostname).toBe(hostname)
  expect(hosts.resolve(new URL("https://док.пример.рф").hostname, baseUrl.hostname)).toEqual({
    surface: "docs",
  })
  expect(hosts.resolve(new URL("https://пример.орг").hostname, baseUrl.hostname)).toEqual({
    domain: "xn--e1afmkfd.xn--c1avg",
  })
})

test("unknown surfaces have no host", () => {
  const subdomains: Record<string, string | null> = { site: null }
  const hosts = defineSurfaceHosts(subdomains)
  expect(() => hosts.hostname("example.com", "typo")).toThrow("unknown surface typo")
  expect(() => hosts.url("https://example.com", "typo")).toThrow("unknown surface typo")
})

test("hosts keep the subdomains they were defined with", () => {
  const subdomains: Record<string, string | null> = { site: null, docs: "docs" }
  const hosts = defineSurfaceHosts(subdomains)
  subdomains.docs = "manuals"
  subdomains.blog = "blog"
  expect(hosts.subdomains).toEqual({ site: null, docs: "docs" })
  expect(hosts.hostname("example.com", "docs")).toBe("docs.example.com")
  expect(hosts.resolve("manuals.example.com", "example.com")).toEqual({ subdomain: "manuals" })
})
