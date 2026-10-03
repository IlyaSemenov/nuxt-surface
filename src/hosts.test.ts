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
    expect(hosts.url("https://example.localhost:5480", "docs", "/guide?id=42")).toBe(
      "https://docs.example.localhost:5480/guide?id=42",
    )
    expect(hosts.url("https://example.com", "site")).toBe("https://example.com/")
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
})
