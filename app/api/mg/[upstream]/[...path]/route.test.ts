// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, GET, POST } from "./route";

const BASE = "https://api.example.com";
const VIP_BASE = "https://vip.example.com";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_BASE_URL", BASE);
  vi.stubEnv("VIP_API_BASE_URL", VIP_BASE);
  vi.stubEnv("NEXT_PUBLIC_PROD_URL", "");
  vi.stubEnv("NEXT_PUBLIC_VIP_URL", "");
  vi.stubEnv("ADMIN_PROXY_SECRET", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

type Options = {
  method?: string;
  cookie?: string;
  headers?: Record<string, string>;
  body?: string;
  search?: string;
};

const call = (
  handler: typeof GET,
  upstream: string,
  path: string[],
  { method = "GET", cookie, headers = {}, body, search = "" }: Options = {},
) => {
  const url = `https://admin.example.com/api/mg/${upstream}/${path.join("/")}${search}`;
  const request = new NextRequest(url, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...headers },
    body,
  });
  return handler(request, { params: Promise.resolve({ upstream, path }) });
};

/** The Headers instance the proxy handed to fetch. */
const forwarded = (): Headers => fetchMock.mock.calls[0][1].headers;

const SESSION = "auth_token=tok";

describe("proxy authentication", () => {
  it("refuses an unauthenticated request", async () => {
    const response = await call(GET, "main", ["api", "profile"]);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
    // Tagged so the api client redirects a cookie-less caller to /login.
    expect(response.headers.get("x-mg-auth-expired")).toBe("1");
  });

  it("refuses an unauthenticated write", async () => {
    const response = await call(POST, "main", ["api", "admin", "assign-role"], {
      method: "POST",
      body: JSON.stringify({ role: "ADMIN", userId: "1" }),
    });

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an unauthenticated delete", async () => {
    const response = await call(DELETE, "main", ["api", "admin", "delete-user", "7"], {
      method: "DELETE",
    });

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("attaches the cookie's token as a bearer header", async () => {
    await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(forwarded().get("authorization")).toBe("Bearer tok");
  });

  it("ignores a caller-supplied Authorization header", async () => {
    await call(GET, "main", ["api", "profile"], {
      cookie: SESSION,
      headers: { authorization: "Bearer attacker-chosen" },
    });

    expect(forwarded().get("authorization")).toBe("Bearer tok");
  });

  it("does not hand the admin session cookie to the API", async () => {
    await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(forwarded().get("cookie")).toBeNull();
  });
});

describe("proxy public paths", () => {
  it.each([["forgot-password"], ["reset-password"]])(
    "lets an unauthenticated caller reach %s, which is unreachable with a session",
    async (endpoint) => {
      const response = await call(POST, "main", ["api", "auth", endpoint], {
        method: "POST",
        body: JSON.stringify({ email: "a@b.com" }),
      });

      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  it("sends no Authorization header when there is no session", async () => {
    await call(POST, "main", ["api", "auth", "forgot-password"], {
      method: "POST",
      body: "{}",
    });

    expect(forwarded().get("authorization")).toBeNull();
  });

  it("keeps the public set closed rather than matching a prefix", async () => {
    const response = await call(POST, "main", ["api", "auth", "forgot-password", "x"], {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(401);
  });

  it("does not make the vip upstream's same path public", async () => {
    const response = await call(POST, "vip", ["api", "auth", "forgot-password"], {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(401);
  });
});

describe("proxy upstream selection", () => {
  it("routes main to the main base", async () => {
    await call(GET, "main", ["api", "faq"], { cookie: SESSION });

    expect(String(fetchMock.mock.calls[0][0])).toBe(`${BASE}/api/faq`);
  });

  it("routes vip to the vip base", async () => {
    await call(GET, "vip", ["api", "payments"], { cookie: SESSION });

    expect(String(fetchMock.mock.calls[0][0])).toBe(`${VIP_BASE}/api/payments`);
  });

  it("404s an unknown upstream instead of guessing", async () => {
    const response = await call(GET, "evil", ["api", "faq"], { cookie: SESSION });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("says so plainly when the upstream is not configured", async () => {
    vi.stubEnv("VIP_API_BASE_URL", "");
    const response = await call(GET, "vip", ["api", "payments"], { cookie: SESSION });

    expect(response.status).toBe(500);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("proxy URL construction", () => {
  it("refuses a traversal segment", async () => {
    const response = await call(GET, "main", ["api", "..", "..", "etc"], {
      cookie: SESSION,
    });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a bare dot segment", async () => {
    const response = await call(GET, "main", ["api", ".", "faq"], { cookie: SESSION });

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cannot be steered to another origin by a scheme-like segment", async () => {
    await call(GET, "main", ["https:", "", "evil.example.com", "steal"], {
      cookie: SESSION,
    });

    const target = new URL(String(fetchMock.mock.calls[0][0]));
    expect(target.origin).toBe(BASE);
  });

  it("forwards the query string untouched", async () => {
    await call(GET, "main", ["api", "user", "all"], {
      cookie: SESSION,
      search: "?page=2&limit=10&search=a%20b",
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      `${BASE}/api/user/all?page=2&limit=10&search=a%20b`,
    );
  });
});

describe("proxy header hygiene", () => {
  it.each([
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
  ])("strips the caller's %s so the API's limiter is not steered", async (header) => {
    await call(GET, "main", ["api", "profile"], {
      cookie: SESSION,
      headers: { [header]: "203.0.113.9" },
    });

    expect(forwarded().get(header)).toBeNull();
  });

  it("strips a caller-supplied proxy secret rather than relaying a guess", async () => {
    await call(GET, "main", ["api", "profile"], {
      cookie: SESSION,
      headers: { "x-mg-proxy-secret": "guess" },
    });

    expect(forwarded().get("x-mg-proxy-secret")).toBeNull();
  });

  it("strips a caller-supplied client IP rather than relaying a spoof", async () => {
    await call(GET, "main", ["api", "profile"], {
      cookie: SESSION,
      headers: { "x-mg-client-ip": "203.0.113.9" },
    });

    expect(forwarded().get("x-mg-client-ip")).toBeNull();
  });

  it("sets the identity headers itself when a secret is configured", async () => {
    vi.stubEnv("ADMIN_PROXY_SECRET", "s3cret");

    await call(GET, "main", ["api", "profile"], {
      cookie: SESSION,
      headers: {
        "x-forwarded-for": "1.1.1.1, 203.0.113.4",
        "x-mg-client-ip": "9.9.9.9",
      },
    });

    expect(forwarded().get("x-mg-proxy-secret")).toBe("s3cret");
    expect(forwarded().get("x-mg-client-ip")).toBe("203.0.113.4");
  });

  it("keeps the content type so multipart boundaries survive", async () => {
    await call(POST, "main", ["api", "upload"], {
      method: "POST",
      cookie: SESSION,
      headers: { "content-type": "multipart/form-data; boundary=----abc" },
      body: "----abc\r\n",
    });

    expect(forwarded().get("content-type")).toBe(
      "multipart/form-data; boundary=----abc",
    );
  });
});

describe("proxy response handling", () => {
  it("does not let the API set cookies on the admin origin", async () => {
    fetchMock.mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "set-cookie": "sneaky=1", "content-type": "application/json" },
      }),
    );

    const response = await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("drops content-encoding, because fetch already decompressed the body", async () => {
    fetchMock.mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "content-encoding": "gzip", "content-type": "application/json" },
      }),
    );

    const response = await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(response.headers.get("content-encoding")).toBeNull();
  });

  it("passes the upstream status through", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 422 }));

    const response = await call(POST, "main", ["api", "faq"], {
      method: "POST",
      cookie: SESSION,
      body: "{}",
    });

    expect(response.status).toBe(422);
  });

  it("clears a session the API has rejected, so the panel stops looping", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/auth_token=;/);
    expect(header.toLowerCase()).toContain("max-age=0");
    // Tagged so the api client redirects to /login instead of a silent failure.
    expect(response.headers.get("x-mg-auth-expired")).toBe("1");
  });

  it("leaves the cookie alone on a 401 from a public path, which says nothing about it", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await call(POST, "main", ["api", "auth", "reset-password"], {
      method: "POST",
      body: "{}",
    });

    expect(response.headers.get("set-cookie")).toBeNull();
    // A wrong reset code is not a dead session, so it must not bounce to /login.
    expect(response.headers.get("x-mg-auth-expired")).toBeNull();
  });

  it("answers 502 when the upstream cannot be reached", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(response.status).toBe(502);
  });
});

describe("proxy request bodies", () => {
  it("forwards a write body verbatim", async () => {
    const payload = JSON.stringify({ role: "MODERATOR", userId: "42" });

    await call(POST, "main", ["api", "admin", "assign-role"], {
      method: "POST",
      cookie: SESSION,
      headers: { "content-type": "application/json" },
      body: payload,
    });

    const sent = fetchMock.mock.calls[0][1].body as ArrayBuffer;
    expect(new TextDecoder().decode(sent)).toBe(payload);
  });

  it("sends no body on a GET", async () => {
    await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("does not follow upstream redirects on the server's behalf", async () => {
    await call(GET, "main", ["api", "profile"], { cookie: SESSION });

    expect(fetchMock.mock.calls[0][1].redirect).toBe("manual");
  });
});
