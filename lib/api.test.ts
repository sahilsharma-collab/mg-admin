// @vitest-environment node
import { describe, expect, it } from "vitest";

import { api, vipApi, withQuery } from "./api";

describe("api clients", () => {
  it("points every main-API call at the same-origin proxy", () => {
    expect(api.defaults.baseURL).toBe("/api/mg/main");
  });

  it("points VIP calls at the VIP leg of the same proxy", () => {
    expect(vipApi.defaults.baseURL).toBe("/api/mg/vip");
  });

  it.each([
    ["main", api],
    ["vip", vipApi],
  ])(
    "gives the %s client a relative base, so no backend origin is shipped to the browser",
    (_name, client) => {
      expect(client.defaults.baseURL?.startsWith("/")).toBe(true);
      expect(client.defaults.baseURL).not.toMatch(/^https?:/);
    },
  );

  it("sets no default Authorization header — the proxy attaches the token", () => {
    const headers = api.defaults.headers as unknown as Record<string, unknown>;
    expect(headers.Authorization).toBeUndefined();
    expect((headers.common as Record<string, unknown>)?.Authorization).toBeUndefined();
  });
});

describe("withQuery", () => {
  it("returns the bare path when nothing survives filtering", () => {
    expect(withQuery("/api/user/all", { page: "", search: null })).toBe("/api/user/all");
  });

  it("appends the values that are present", () => {
    expect(withQuery("/api/user/all", { page: 2, limit: 10 })).toBe(
      "/api/user/all?page=2&limit=10",
    );
  });

  it.each([
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("drops %s rather than sending a blank filter", (_label, value) => {
    expect(withQuery("/api/user/all", { search: value, page: 1 })).toBe(
      "/api/user/all?page=1",
    );
  });

  it("keeps a literal zero, which is a value and not an absence", () => {
    expect(withQuery("/api/user/all", { page: 0 })).toBe("/api/user/all?page=0");
  });

  it("keeps false, for the same reason", () => {
    expect(withQuery("/api/user/all", { blocked: false })).toBe(
      "/api/user/all?blocked=false",
    );
  });

  it("percent-encodes a value so it cannot add a parameter of its own", () => {
    expect(withQuery("/api/user/all", { search: "a&limit=999" })).toBe(
      "/api/user/all?search=a%26limit%3D999",
    );
  });

  it("encodes a value that would otherwise end the path", () => {
    expect(withQuery("/api/user/all", { search: "x#y" })).toBe(
      "/api/user/all?search=x%23y",
    );
  });
});
