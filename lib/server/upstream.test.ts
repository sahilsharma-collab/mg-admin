// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clientIdentityHeaders, isUpstream, upstreamBase } from "./upstream";

const ENV_KEYS = [
  "API_BASE_URL",
  "VIP_API_BASE_URL",
  "NEXT_PUBLIC_PROD_URL",
  "NEXT_PUBLIC_VIP_URL",
  "ADMIN_PROXY_SECRET",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("isUpstream", () => {
  it("accepts the two known upstreams", () => {
    expect(isUpstream("main")).toBe(true);
    expect(isUpstream("vip")).toBe(true);
  });

  it.each(["", "MAIN", "evil.example.com", "https://evil.example.com", "../vip"])(
    "rejects %o, so the upstream can never be a caller-supplied URL",
    (value) => {
      expect(isUpstream(value)).toBe(false);
    },
  );
});

describe("upstreamBase", () => {
  it("prefers the server-only API_BASE_URL over the published fallback", () => {
    process.env.API_BASE_URL = "https://internal.example.com";
    process.env.NEXT_PUBLIC_PROD_URL = "https://public.example.com";

    expect(upstreamBase("main")).toBe("https://internal.example.com");
  });

  it("falls back to NEXT_PUBLIC_PROD_URL, which is what is configured today", () => {
    process.env.NEXT_PUBLIC_PROD_URL = "https://public.example.com";

    expect(upstreamBase("main")).toBe("https://public.example.com");
  });

  it("resolves vip from its own pair of variables", () => {
    process.env.API_BASE_URL = "https://main.example.com";
    process.env.VIP_API_BASE_URL = "https://vip.example.com";

    expect(upstreamBase("vip")).toBe("https://vip.example.com");
  });

  it("strips trailing slashes so joining a path cannot double one", () => {
    process.env.API_BASE_URL = "https://internal.example.com///";

    expect(upstreamBase("main")).toBe("https://internal.example.com");
  });

  it("is undefined, not an empty string, when nothing is configured", () => {
    expect(upstreamBase("main")).toBeUndefined();
  });

  it("treats an empty variable as unconfigured rather than as a base of ''", () => {
    process.env.API_BASE_URL = "";
    process.env.NEXT_PUBLIC_PROD_URL = "";

    expect(upstreamBase("main")).toBeUndefined();
  });
});

describe("clientIdentityHeaders", () => {
  it("sends nothing when no secret is configured", () => {
    expect(clientIdentityHeaders("203.0.113.4")).toEqual({});
  });

  it("sends nothing when there is no forwarded address to report", () => {
    process.env.ADMIN_PROXY_SECRET = "s3cret";

    expect(clientIdentityHeaders(null)).toEqual({});
  });

  it("forwards the rightmost hop, which is the only entry this server observed", () => {
    process.env.ADMIN_PROXY_SECRET = "s3cret";

    expect(clientIdentityHeaders("1.1.1.1, 2.2.2.2, 203.0.113.4")).toEqual({
      "x-mg-proxy-secret": "s3cret",
      "x-mg-client-ip": "203.0.113.4",
    });
  });

  it("trims the whitespace the header's comma separation leaves behind", () => {
    process.env.ADMIN_PROXY_SECRET = "s3cret";

    expect(clientIdentityHeaders("1.1.1.1,   203.0.113.4  ")["x-mg-client-ip"]).toBe(
      "203.0.113.4",
    );
  });

  it("sends nothing for a header that is present but empty", () => {
    process.env.ADMIN_PROXY_SECRET = "s3cret";

    expect(clientIdentityHeaders("")).toEqual({});
  });
});
