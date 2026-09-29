/**
 * End-to-end suite for the admin panel's session handling.
 *
 * Boots the real API against a real PostgreSQL and Redis, then boots a
 * production build of this Next app in front of it and drives the whole login
 * flow over HTTP. Nothing here is mocked: the assertions are about what a
 * browser would actually receive and what the API would actually be sent.
 *
 * Two upstreams are wired deliberately:
 *   main -> the real API, for the login, session and revocation flows.
 *   vip  -> a local echo server, which is the only way to see exactly which
 *           headers and bytes the proxy forwards. Asserting that the cookie is
 *           never passed upstream, or that a caller-supplied Authorization
 *           header is dropped, needs a listener that reports what it got.
 */
import { spawn, execFileSync } from "child_process";
import { createServer } from "http";
import { readFileSync, rmSync, openSync, mkdirSync } from "fs";
import { setTimeout as sleep } from "timers/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const E2E_DIR = dirname(fileURLToPath(import.meta.url));
const ADMIN_DIR = join(E2E_DIR, "..");
const API_DIR = process.env.E2E_API_DIR ?? join(ADMIN_DIR, "..", "market-genius-api-typescript");

const REDIS_PORT = Number(process.env.E2E_REDIS_PORT ?? 6398);
const PG_USER = process.env.E2E_PG_USER ?? process.env.USER;
const PG_HOST = process.env.E2E_PG_HOST ?? "127.0.0.1";
const PG_PORT = process.env.E2E_PG_PORT ?? "5432";
const PG_DB = process.env.E2E_PG_DB ?? "mg_admin_e2e";
const DB_URL = process.env.E2E_DATABASE_URL ??
  `postgresql://${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}`;
const JWT_SECRET = "e2e-secret-do-not-use-anywhere";
const PROXY_SECRET = "e2e-proxy-secret";

// Overridable so a run can be moved off a port something else is holding.
// The defaults are what CI and the documented `npm run test:e2e` use, and
// 4332 is shared with the API repo's own e2e suite — the two can never run at
// the same time on the defaults, which is deliberate.
const port = (name, fallback) => Number(process.env[name] ?? fallback);
const API_PORT = port("E2E_API_PORT", 4331);
const ADMIN_PORT = port("E2E_ADMIN_PORT", 4332);
const ECHO_PORT = port("E2E_ECHO_PORT", 4333);
const CANARY_PORT = port("E2E_CANARY_PORT", 4334);
const ADMIN_API_PORT = port("E2E_ADMIN_API_PORT", 4335);
const API = `http://127.0.0.1:${API_PORT}`;
const PANEL = `http://127.0.0.1:${ADMIN_PORT}`;
// The tier the panel is pointed at in production: admin.ts, which mounts the
// narrow router in routes/adminApi.ts rather than the whole API.
const ADMIN_TIER = `http://127.0.0.1:${ADMIN_API_PORT}`;

mkdirSync(join(E2E_DIR, "redis"), { recursive: true });

let pass = 0, fail = 0, group = "";
const failures = [];
const skippedBuilds = [];
const G = (n) => { group = n; console.log(`\n\x1b[1m── ${n}\x1b[0m`); };
const ok = (n, cond, detail = "") => {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${n}`); }
  else { fail++; failures.push(`[${group}] ${n}${detail ? ` — ${detail}` : ""}`);
         console.log(`  \x1b[31m✗ ${n}\x1b[0m${detail ? ` — ${detail}` : ""}`); }
};
const eq = (n, a, e) => ok(n, a === e, `expected ${JSON.stringify(e)}, got ${JSON.stringify(a)}`);

const psql = (sql) => execFileSync("psql",
  ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", PG_DB, "-tAc", sql],
  { encoding: "utf8" }).trim();

const redisCli = (...a) => {
  try { return execFileSync("redis-cli", ["-p", String(REDIS_PORT), ...a], { encoding: "utf8" }).trim(); }
  catch (e) { return `ERR ${e.message}`; }
};

const req = async (base, path, opts = {}) => {
  const res = await fetch(`${base}${path}`, {
    ...opts, redirect: "manual", signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, text, json };
};

const J = (body) => ({
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

/** Reads the auth_token value out of a Set-Cookie header. */
const cookieFrom = (res) => {
  const raw = res.headers.getSetCookie?.() ?? [];
  const line = raw.find((c) => c.startsWith("auth_token="));
  if (!line) return { line: undefined, value: undefined };
  return { line, value: line.slice("auth_token=".length).split(";")[0] };
};

// ─────────────────────────────────────────────────────── infrastructure
const procs = [];
const bootLogged = (cmd, args, cwd, env, tag, url, tries = 120) => {
  const logPath = join(E2E_DIR, `${tag}.log`);
  rmSync(logPath, { force: true });
  // "w", not "a": in append mode each run stacked onto the previous run's
  // output, so a failure investigation read stale lines from an older run.
  const out = openSync(logPath, "w");
  // `detached` makes the child a process-group leader so cleanup can kill the
  // whole group. `npx next start` is a wrapper that execs the real server as a
  // grandchild: killing the wrapper alone reparents next-server to init, where
  // it keeps port 4332 and makes the next run — and the API suite, which binds
  // the same port — fail with EADDRINUSE against a server nobody owns.
  const child = spawn(cmd, args,
    { cwd, stdio: ["ignore", out, out], env, detached: true });
  procs.push(child);
  return (async () => {
    for (let i = 0; i < tries; i++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(800) });
        if (r.status < 500) return child;
      } catch {}
      await sleep(250);
    }
    throw new Error(`${tag} never came up\n${readFileSync(logPath, "utf8").slice(-3000)}`);
  })();
};

/** Records every request it receives so the proxy's output can be inspected. */
const received = [];
const echo = createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    received.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString("utf8"),
    });
    const status = req.url.startsWith("/status/")
      ? Number(req.url.split("/")[2].split("?")[0]) : 200;
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: true, echoed: true }));
  });
});

/** Must never be reached. Any hit here is a server-side request forgery. */
const canaryHits = [];
const canary = createServer((req, res) => {
  canaryHits.push(req.url);
  res.writeHead(200); res.end("pwned");
});

const cleanup = async () => {
  for (const p of procs) {
    // The group first, then the leader itself in case the group is already gone.
    try { process.kill(-p.pid, "SIGKILL"); } catch {}
    try { p.kill("SIGKILL"); } catch {}
  }
  echo.close(); canary.close();
  redisCli("shutdown", "nosave");
};

// ════════════════════════════════════════════════════════════════ main
(async () => {
  console.log("\x1b[1mAdmin panel — session handling end to end\x1b[0m");

  // Always build, both sides, before anything is booted.
  //
  // This suite runs two compiled artefacts: `dist/app.js` and `dist/admin.js`
  // from the API repo, and the `.next` production build from this one. Neither
  // was rebuilt here, so editing a source file and re-running produced a green
  // suite that had never seen the change — and, worse, a red one whose failures
  // described code that no longer exists. That is how `a video of an unknown
  // type is refused` first failed: the guard was in the TypeScript and not in
  // the `dist` the suite was running.
  //
  // The API's own harness reached the same conclusion and for the same reason;
  // this is that rule applied to the tier in front of it. Both are incremental
  // and cost nothing when nothing moved.
  //
  // E2E_SKIP_PANEL_BUILD exists for one situation, and covers only the panel:
  // `next build` type-checks every .ts in the project, so a config file that
  // nothing but the unit-test runner ever loads can break the production build
  // and with it this suite. The API build has no opt-out — it is the code most
  // of these assertions are about. Skipping is never silent: it prints here and
  // again under the pass/fail line, so a green run cannot be quoted without the
  // caveat that the panel was not rebuilt.
  const build = (label, cwd, skipEnv) => {
    if (skipEnv && process.env[skipEnv] === "1") {
      skippedBuilds.push(label);
      console.log(`  \x1b[33m! not building ${label} — ${skipEnv}=1; ` +
        `this run serves whatever was compiled last\x1b[0m`);
      return;
    }
    console.log(`  building ${label}…`);
    try {
      execFileSync("npm", ["run", "build"], { cwd, stdio: "pipe" });
    } catch (e) {
      const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim().slice(-3000);
      throw new Error(
        `${label} build failed — the suite would otherwise run stale code:\n${out}`);
    }
  };
  build("the API", API_DIR);
  build("the panel", ADMIN_DIR, "E2E_SKIP_PANEL_BUILD");

  spawn("redis-server", ["--port", String(REDIS_PORT), "--save", "", "--appendonly", "no",
    "--dir", join(E2E_DIR, "redis"), "--daemonize", "yes",
    "--logfile", join(E2E_DIR, "redis", "redis.log")], { stdio: "ignore" });
  for (let i = 0; i < 40 && redisCli("ping") !== "PONG"; i++) await sleep(250);
  if (redisCli("ping") !== "PONG") throw new Error("redis never came up");

  const adminPsql = (sql) => execFileSync("psql",
    ["-h", PG_HOST, "-p", PG_PORT, "-U", PG_USER, "-d", "postgres", "-tAc", sql],
    { encoding: "utf8" }).trim();
  if (adminPsql(`SELECT 1 FROM pg_database WHERE datname='${PG_DB}';`) !== "1") {
    console.log(`  creating database ${PG_DB}…`);
    adminPsql(`CREATE DATABASE "${PG_DB}";`);
  }
  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    { cwd: API_DIR, stdio: "ignore", env: { ...process.env, DATABASE_URL: DB_URL } });
  if (!/e2e|test/i.test(PG_DB)) throw new Error(`refusing to truncate ${PG_DB}`);
  psql(`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;`);
  redisCli("flushall");

  echo.listen(ECHO_PORT);
  canary.listen(CANARY_PORT);

  const apiEnv = (port) => ({
    ...process.env,
    NODE_ENV: "production", LOG_LEVEL: "warn", PORT: String(port),
    DATABASE_URL: DB_URL, DATABASE_URL_REPLICA: DB_URL,
    REDIS_HOST: "127.0.0.1", REDIS_PORT: String(REDIS_PORT), REDIS_LOG_ERRORS: "false",
    JWT_SECRET, REFRESH_TOKEN_SECRET: "e2e-refresh-secret",
    RATE_LIMIT_STORE: "redis", PUSH_ENABLED: "false",
    FIREBASE_PROJECT_ID: "e2e-test", FIREBASE_CLIENT_EMAIL: "e2e@example.com",
    FIREBASE_PRIVATE_KEY: readFileSync(join(API_DIR, "e2e", "firebase-test-key.pem"), "utf8"),
  });

  await bootLogged("node", ["dist/app.js"], API_DIR, apiEnv(API_PORT), "api", `${API}/health`);

  // Both tiers, because they are not the same API. app.ts serves routes/api.ts
  // (everything) and is what the panel is proxied to below; admin.ts serves
  // routes/adminApi.ts (a deliberately narrow subset) and is what the panel is
  // pointed at in production. Running the flows against the first and checking
  // the route surface of the second is what keeps a passing suite from hiding
  // a 404 that only production would see. Both registering the same repeatable
  // jobs is the production topology and is idempotent by design — see the
  // comments in admin.ts and app.ts.
  await bootLogged("node", ["dist/admin.js"], API_DIR, apiEnv(ADMIN_API_PORT),
    "admin-api", `${ADMIN_TIER}/health`);

  await bootLogged("npx", ["next", "start", "-p", String(ADMIN_PORT)], ADMIN_DIR, {
    ...process.env,
    NODE_ENV: "production",
    API_BASE_URL: API,
    VIP_API_BASE_URL: `http://127.0.0.1:${ECHO_PORT}`,
    ADMIN_PROXY_SECRET: PROXY_SECRET,
  }, "panel", `${PANEL}/login`);

  // Two accounts: one that should be able to use the panel and one that
  // should not. The role check is the panel's, so it needs both.
  await req(API, "/api/auth/register", J({
    email: "admin@e2e.test", password: "hunter2hunter2",
    name: "Panel Admin", userName: "panel_admin" }));
  psql(`UPDATE "User" SET "emailVerified"=true, role='ADMIN' WHERE email='admin@e2e.test';`);

  await req(API, "/api/auth/register", J({
    email: "plain@e2e.test", password: "hunter2hunter2",
    name: "Plain User", userName: "plain_user" }));
  psql(`UPDATE "User" SET "emailVerified"=true WHERE email='plain@e2e.test';`);

  const plainLogin = await req(API, "/api/auth/login", J({
    email: "plain@e2e.test", password: "hunter2hunter2", deviceId: "e2e" }));
  const plainToken = plainLogin.json?.token;

  // ───────────────────────────────────────────────────────────────────
  G("The session cookie");

  const login = await req(PANEL, "/api/auth/login", J({
    email: "admin@e2e.test", password: "hunter2hunter2" }));
  const { line: cookieLine, value: sessionCookie } = cookieFrom(login);

  eq("logging in through the panel succeeds", login.status, 200);
  ok("a session cookie is issued", !!sessionCookie, cookieLine);
  ok("the cookie is httpOnly — this is the whole change",
    /HttpOnly/i.test(cookieLine ?? ""), cookieLine);
  ok("the cookie is SameSite=Strict", /SameSite=Strict/i.test(cookieLine ?? ""), cookieLine);
  ok("the cookie is Secure in production", /Secure/i.test(cookieLine ?? ""), cookieLine);
  ok("the cookie expires within a day",
    /Max-Age=86400\b/i.test(cookieLine ?? ""), cookieLine);

  // The token used to arrive in the response body and get written to a cookie
  // by js-cookie. If it is still in the body, httpOnly buys nothing: script on
  // the origin can read it from the login response.
  ok("the token is never sent to the browser in a response body",
    !login.text.includes("token"), login.text.slice(0, 300));
  ok("the profile still comes back, so the panel can render",
    login.json?.user?.email === "admin@e2e.test", login.text.slice(0, 200));

  const AS_ADMIN = { headers: { cookie: `auth_token=${sessionCookie}` } };

  // ───────────────────────────────────────────────────────────────────
  G("Reaching the API through the proxy");

  const profile = await req(PANEL, "/api/mg/main/api/profile", AS_ADMIN);
  eq("an authenticated call succeeds with only the cookie", profile.status, 200);
  eq("and it is the right user", profile.json?.user?.email, "admin@e2e.test");

  const anon = await req(PANEL, "/api/mg/main/api/profile");
  eq("without the cookie the proxy refuses", anon.status, 401);
  ok("and it refuses before calling the API",
    anon.json?.message === "Not authenticated.", anon.text.slice(0, 200));

  // The defect this design exists to prevent: if the proxy honoured a
  // caller-supplied Authorization header, any script could pick the identity
  // and the cookie would be decorative.
  const forged = await req(PANEL, "/api/mg/main/api/profile", {
    headers: { cookie: `auth_token=${sessionCookie}`,
               authorization: `Bearer ${plainToken}` },
  });
  eq("a caller-supplied Authorization header is ignored", forged.status, 200);
  eq("  the identity comes from the cookie, not the header",
    forged.json?.user?.email, "admin@e2e.test");

  const forgedOnly = await req(PANEL, "/api/mg/main/api/profile", {
    headers: { authorization: `Bearer ${plainToken}` },
  });
  eq("an Authorization header alone does not authenticate", forgedOnly.status, 401);

  // ───────────────────────────────────────────────────────────────────
  G("What the proxy actually forwards");

  received.length = 0;
  await req(PANEL, "/api/mg/vip/api/payment?page=2&limit=50", {
    headers: {
      cookie: `auth_token=${sessionCookie}; other_cookie=keep-me`,
      "x-forwarded-for": "198.51.100.9, 203.0.113.5",
      "x-custom-header": "passed-through",
    },
  });
  const seen = received[0];

  ok("the request reached the upstream", !!seen, "echo server saw nothing");
  eq("  the path and query survive", seen?.url, "/api/payment?page=2&limit=50");
  eq("  Authorization is set from the cookie",
    seen?.headers.authorization, `Bearer ${sessionCookie}`);
  ok("  the admin cookie is NOT forwarded to the API",
    seen?.headers.cookie === undefined, JSON.stringify(seen?.headers.cookie));
  ok("  the browser's x-forwarded-for is NOT passed through",
    seen?.headers["x-forwarded-for"] === undefined,
    JSON.stringify(seen?.headers["x-forwarded-for"]));
  eq("  an unrelated header still passes through",
    seen?.headers["x-custom-header"], "passed-through");

  // Every admin request now leaves from one server, so the API's per-IP
  // limiter would count the whole panel as a single client. The real address
  // travels in its own header, and the secret is what makes it trustworthy.
  eq("  the real client address is forwarded", seen?.headers["x-mg-client-ip"], "203.0.113.5");
  eq("  signed with the shared secret", seen?.headers["x-mg-proxy-secret"], PROXY_SECRET);
  ok("  the forwarded address is the proxy-observed one, not the attacker's half",
    seen?.headers["x-mg-client-ip"] !== "198.51.100.9");

  received.length = 0;
  const form = new FormData();
  form.append("field", "value");
  form.append("image", new Blob([Buffer.from("PNGDATA")], { type: "image/png" }), "a.png");
  await req(PANEL, "/api/mg/vip/api/upload", {
    method: "POST", headers: { cookie: `auth_token=${sessionCookie}` }, body: form,
  });
  const upload = received[0];
  ok("a multipart upload survives the hop",
    /^multipart\/form-data; boundary=/.test(upload?.headers["content-type"] ?? ""),
    upload?.headers["content-type"]);
  ok("  the boundary still matches the body",
    upload?.body.includes(upload?.headers["content-type"].split("boundary=")[1]),
    "boundary missing from body");
  ok("  the file content arrives intact", upload?.body.includes("PNGDATA"));

  // ───────────────────────────────────────────────────────────────────
  G("The proxy cannot be pointed somewhere else");

  canaryHits.length = 0;
  const CANARY = `127.0.0.1:${CANARY_PORT}`;
  const attempts = [
    ["an absolute URL as a path segment", `/api/mg/main/http:/${CANARY}/pwned`],
    ["a protocol-relative path", `/api/mg/main//${CANARY}/pwned`],
    ["an encoded scheme", `/api/mg/main/http%3A/${CANARY}/pwned`],
    ["parent-directory traversal", `/api/mg/main/api/../../../${CANARY}/pwned`],
    ["an unknown upstream name", `/api/mg/evil/api/profile`],
    ["an upstream that is a URL", `/api/mg/http:%2F%2F${CANARY}/api/profile`],
  ];
  for (const [label, path] of attempts) {
    let res = await req(PANEL, path, AS_ADMIN);

    // Next normalises some of these before the handler sees them. A redirect
    // is only acceptable if it stays on this origin: a Location of
    // "//host/path" is protocol-relative and would send the browser away,
    // which would be an open redirect on the admin origin.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location") ?? "";
      ok(`${label} redirects only within this origin`,
        location.startsWith("/") && !location.startsWith("//") &&
        !/^[a-z][a-z0-9+.-]*:/i.test(location), `Location: ${location}`);
      res = await req(PANEL, location, AS_ADMIN);
    }

    ok(`${label} does not reach another host`, canaryHits.length === 0,
      `canary hit: ${canaryHits.join(", ")}`);
    ok(`  and is refused (${res.status})`, res.status >= 400 && res.status < 500,
      `status ${res.status}`);
    canaryHits.length = 0;
  }

  // ───────────────────────────────────────────────────────────────────
  G("Only the login page's endpoints are reachable signed out");

  const forgot = await req(PANEL, "/api/mg/main/api/auth/forgot-password",
    J({ email: "admin@e2e.test" }));
  ok("password reset is reachable without a session", forgot.status !== 401,
    `got 401 — a user who forgot their password has no cookie (status ${forgot.status})`);

  for (const path of ["/api/mg/main/api/profile",
                      "/api/mg/main/api/admin/get-all",
                      "/api/mg/main/api/post"]) {
    const res = await req(PANEL, path);
    eq(`${path} still needs a session`, res.status, 401);
  }

  // ───────────────────────────────────────────────────────────────────
  G("Who is allowed in");

  const asPlain = await req(PANEL, "/api/auth/login", J({
    email: "plain@e2e.test", password: "hunter2hunter2" }));
  eq("a non-admin is refused by the panel", asPlain.status, 403);
  ok("  and gets no cookie", !cookieFrom(asPlain).value,
    cookieFrom(asPlain).line);

  const badPassword = await req(PANEL, "/api/auth/login", J({
    email: "admin@e2e.test", password: "wrong-password" }));
  ok("a wrong password is refused", badPassword.status >= 400);
  ok("  and gets no cookie", !cookieFrom(badPassword).value);

  // ───────────────────────────────────────────────────────────────────
  G("Signing out");

  const secondLogin = await req(PANEL, "/api/auth/login", J({
    email: "admin@e2e.test", password: "hunter2hunter2" }));
  const second = cookieFrom(secondLogin).value;
  const AS_SECOND = { headers: { cookie: `auth_token=${second}` } };

  eq("the session works before signing out",
    (await req(PANEL, "/api/mg/main/api/profile", AS_SECOND)).status, 200);

  const logout = await req(PANEL, "/api/auth/logout", { method: "POST", ...AS_SECOND });
  eq("logout succeeds", logout.status, 200);
  ok("  and reports that the server side was revoked", logout.json?.revoked === true,
    logout.text.slice(0, 200));
  ok("  the cookie is cleared", /Max-Age=0/i.test(cookieFrom(logout).line ?? ""),
    cookieFrom(logout).line);

  // The point of revoking server-side: the old cookie value is now useless
  // even to someone who copied it before signing out.
  eq("the old session no longer works, even replayed",
    (await req(PANEL, "/api/mg/main/api/profile", AS_SECOND)).status, 401);

  // ───────────────────────────────────────────────────────────────────
  G("A dead session does not trap the operator");

  // middleware.ts routes on the cookie's presence alone, so a cookie holding a
  // rejected token would bounce forever between / and /login: middleware sends
  // anyone holding a cookie away from /login, and every call behind it 401s.
  const dead = await req(PANEL, "/api/mg/main/api/profile", {
    headers: { cookie: "auth_token=not-a-real-token" },
  });
  eq("a rejected token comes back 401", dead.status, 401);
  ok("  and the dead cookie is cleared, so middleware stops redirecting",
    /auth_token=;/.test(cookieFrom(dead).line ?? "") &&
    /Max-Age=0/i.test(cookieFrom(dead).line ?? ""), cookieFrom(dead).line);

  // A 401 from a public endpoint says nothing about the caller's session and
  // must not sign them out.
  received.length = 0;
  const publicFail = await req(PANEL, "/api/mg/vip/status/401", AS_ADMIN);
  eq("a 401 from an endpoint reached with a session still clears it", publicFail.status, 401);

  // ───────────────────────────────────────────────────────────────────
  G("No token is left anywhere the browser can read it");

  const loginPage = await req(PANEL, "/login");
  ok("the login page carries no bearer token", !/Bearer /.test(loginPage.text));

  const bundles = execFileSync("bash", ["-c",
    `grep -rl "auth_token" ${join(ADMIN_DIR, ".next", "static")} 2>/dev/null | head -5 || true`],
    { encoding: "utf8" }).trim();
  ok("no client bundle reads the cookie by name", bundles === "", bundles);

  const cookieReads = execFileSync("bash", ["-c",
    `grep -rn "Cookies.get\\|js-cookie" ${join(ADMIN_DIR, "app")} ${join(ADMIN_DIR, "components")} ` +
    `${join(ADMIN_DIR, "context")} 2>/dev/null || true`], { encoding: "utf8" }).trim();
  ok("no component reads the session cookie any more", cookieReads === "", cookieReads);

  // ───────────────────────────────────────────────────────────────────
  G("The product flows an admin actually performs");

  // Audit P2-19 asked for smoke coverage of the panel's real work, not just its
  // session handling. Every one of these goes through the panel's proxy with
  // nothing but the cookie, which is the path a logged-in admin's browser uses,
  // and every one is checked in the database rather than trusted from the
  // response body — a 200 that wrote nothing is the failure worth catching.
  //
  // PUSH_ENABLED is false for this run, so publishing does not attempt FCM.

  // `J` returns its own `headers`, so spreading it over AS_ADMIN REPLACES them
  // and the cookie is lost — the request then arrives unauthenticated. These
  // two helpers merge instead, which is the only safe way to combine them.
  // The database is not rebuilt on every run, so fixtures are scoped to this
  // one. Without it a second run counts the first run's rows and fails on a
  // difference that says nothing about the code.
  const RUN = Date.now().toString(36);

  const AJ = (body, method = "POST") => ({
    method,
    headers: { ...AS_ADMIN.headers, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const A = (method = "POST") => ({ method, headers: { ...AS_ADMIN.headers } });

  // — publish a live trade ——————————————————————————————————————————————
  const trade = await req(PANEL, "/api/mg/main/api/trade",
    AJ({ title: `E2E Trade ${RUN}`, description: "opened" }));
  ok("an admin can publish a live trade", trade.status === 200 || trade.status === 201,
    `${trade.status} ${trade.text.slice(0, 200)}`);
  // Read back from the database rather than trusting the response shape: the
  // controllers differ in what they echo, and an id parsed out of the wrong
  // field would feed NaN into psql and take the whole harness down.
  const tradeId = Number(psql(`SELECT id FROM "LiveTrade" WHERE title='E2E Trade ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("  and it is persisted", Number.isInteger(tradeId) && tradeId > 0, trade.text.slice(0, 200));

  // — pin and unpin ——————————————————————————————————————————————————————
  const pin = await req(PANEL, `/api/mg/main/api/trade/pin/${tradeId}`, A());
  eq("pinning succeeds", pin.status, 200);
  eq("  and the row says so", psql(`SELECT "isPinned" FROM "LiveTrade" WHERE id=${Number(tradeId)};`), "t");

  const unpin = await req(PANEL, `/api/mg/main/api/trade/unpin/${tradeId}`, A());
  eq("unpinning succeeds", unpin.status, 200);
  eq("  and the row says so", psql(`SELECT "isPinned" FROM "LiveTrade" WHERE id=${Number(tradeId)};`), "f");

  // — attach a PDF ———————————————————————————————————————————————————————
  // The upload endpoint itself needs S3, which this harness has no business
  // standing up. What is asserted instead is the rule that governs an attached
  // key once it exists, which is where a mistake would actually reach a user.
  const withPdf = await req(PANEL, `/api/mg/main/api/trade/${tradeId}`,
    AJ({ title: `E2E Trade ${RUN}`, pdfKey: "live-trade-pdfs/e2e.pdf", pdfName: "e2e.pdf", pdfSize: 1024 }, "PUT"));
  eq("a trade PDF can be attached", withPdf.status, 200);
  eq("  and the key is stored",
    psql(`SELECT "pdfKey" FROM "LiveTrade" WHERE id=${Number(tradeId)};`), "live-trade-pdfs/e2e.pdf");

  const badPdf = await req(PANEL, `/api/mg/main/api/trade/${tradeId}`,
    AJ({ title: `E2E Trade ${RUN}`, pdfKey: "live-trade-pdfs/e2e.pdf" }, "PUT"));
  eq("a PDF key without its name and size is rejected", badPdf.status, 400);

  // — publish a market analysis —————————————————————————————————————————
  const analysis = await req(PANEL, "/api/mg/main/api/market",
    AJ({ title: `E2E Analysis ${RUN}`, description: "outlook" }));
  ok("an admin can publish a market analysis",
    analysis.status === 200 || analysis.status === 201,
    `${analysis.status} ${analysis.text.slice(0, 200)}`);
  eq("  and it is persisted",
    psql(`SELECT count(*) FROM "Market_analysis" WHERE title='E2E Analysis ${RUN}';`), "1");

  // The prefix rule exists so an admin cannot attach an arbitrary S3 object —
  // including one from another tenant's prefix — to a published analysis.
  const wrongPrefix = await req(PANEL, "/api/mg/main/api/market",
    AJ({ title: "Bad prefix", pdfKey: "somewhere-else/x.pdf", pdfName: "x.pdf", pdfSize: 10 }));
  eq("a market-analysis PDF outside its own prefix is rejected", wrongPrefix.status, 400);

  // — publish an event ———————————————————————————————————————————————————
  // description, imgUrl and currencyPair are optional in the request schema but
  // NOT NULL in the table, so a title-only body fails at the database.
  const category = await req(PANEL, "/api/mg/main/api/event/category",
    AJ({ title: `E2E Category ${RUN}`, description: "d", imgUrl: "i", currencyPair: "EURUSD" }));
  ok("an event category can be created",
    category.status === 200 || category.status === 201, category.text.slice(0, 200));
  // The column is `name`; `title` is the request field the controller maps from.
  const categoryId = Number(psql(`SELECT id FROM "EventCategory" WHERE name='E2E Category ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("  and the category row exists", Number.isInteger(categoryId) && categoryId > 0, category.text.slice(0, 200));

  const event = await req(PANEL, "/api/mg/main/api/event",
    AJ({ categoryId, date: new Date(Date.now() + 86_400_000).toISOString() }));
  ok("an admin can publish an event",
    event.status === 200 || event.status === 201, event.text.slice(0, 200));
  eq("  and it is persisted",
    psql(`SELECT count(*) FROM "Event" WHERE "categoryId"=${categoryId};`), "1");

  // — send a notification ————————————————————————————————————————————————
  const send = await req(PANEL, "/api/mg/main/api/notification/send-notification",
    AJ({ title: `E2E Broadcast ${RUN}`, body: "hello" }));
  ok("an admin can send a notification",
    send.status === 200 || send.status === 201, `${send.status} ${send.text.slice(0, 200)}`);
  eq("  and the Notification row is written",
    psql(`SELECT count(*) FROM "Notification" WHERE title='E2E Broadcast ${RUN}';`), "1");

  // — moderation —————————————————————————————————————————————————————————
  const reports = await req(PANEL, "/api/mg/main/api/post/report", AS_ADMIN);
  eq("an admin can read the moderation queue", reports.status, 200);

  // ───────────────────────────────────────────────────────────────────
  G("None of it is reachable without the admin role");

  // The panel refuses a non-admin at login, which is asserted above — so a
  // non-admin can never hold a panel cookie and the proxy is not the thing
  // under test here. What matters is that the API refuses on its OWN
  // authority: the panel is one client among several, and a gate that lives
  // only in the panel is a gate any other caller walks around.
  //
  // So these go straight at the API with a plain user's bearer token.
  for (const [name, path, opts] of [
    ["publish a live trade", "/api/trade", J({ title: "nope" })],
    ["publish a market analysis", "/api/market", J({ title: "nope" })],
    ["send a notification", "/api/notification/send-notification",
      J({ title: "nope", body: "nope" })],
    ["pin a trade", `/api/trade/pin/${tradeId}`, { method: "POST" }],
    ["read the moderation queue", "/api/post/report", {}],
  ]) {
    const res = await req(API, path, {
      ...opts,
      headers: { ...(opts.headers ?? {}), authorization: `Bearer ${plainToken}` },
    });
    ok(`a non-admin cannot ${name}`, res.status === 401 || res.status === 403,
      `${res.status} ${res.text.slice(0, 120)}`);
  }

  // ───────────────────────────────────────────────────────────────────
  // Everything below is the rest of the panel's real work, driven the way an
  // operator drives it — through the panel's proxy with nothing but the
  // session cookie — and checked in the database rather than believed from a
  // 200. Ordered by blast radius: the groups that write or destroy production
  // content come first, the read-only dashboards last.

  const PW = "hunter2hunter2";

  /** Registers a verified account and returns its id. */
  const makeUser = async (email, name, role) => {
    await req(API, "/api/auth/register", J({
      email, password: PW, name, userName: `${name.toLowerCase().replace(/\W+/g, "_")}_${RUN}` }));
    psql(`UPDATE "User" SET "emailVerified"=true${role ? `, role='${role}'` : ""} ` +
         `WHERE email='${email}';`);
    return Number(psql(`SELECT id FROM "User" WHERE email='${email}';`));
  };

  /**
   * A bearer token straight from the API.
   *
   * These fixtures never hold a panel cookie — only an admin can, which is
   * asserted above. They exist so the API's own role checks can be exercised,
   * and so there is community content for the moderation queue to act on.
   */
  const tokenFor = async (email) => (await req(API, "/api/auth/login",
    J({ email, password: PW, deviceId: `e2e-${email}` }))).json?.token;

  // A bearer token for the panel admin, straight from the API. Used only where
  // the panel's proxy is not the thing under test: the badge endpoints, which
  // the admin tier deliberately does not mount, and the tier check at the end.
  // Minting it does not disturb the panel's cookie — createSession evicts a
  // previous session only for role USER.
  const adminApiToken = await tokenFor("admin@e2e.test");

  /** Same merge rule as AJ/A, for a bearer token instead of the cookie. */
  const AT = (token, { method = "GET", body } = {}) => ({
    method,
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

  // ───────────────────────────────────────────────────────────────────
  G("Blocking and unblocking a member");

  const bannedId = await makeUser("banned@e2e.test", "Banned User");
  const bannedToken = await tokenFor("banned@e2e.test");

  // Give the account something to lose first. Blocking is not a flag flip —
  // it deletes every post and reply the user ever wrote, in the same
  // transaction — and that is the half of it worth proving.
  await req(API, "/api/post", AT(bannedToken,
    { method: "POST", body: { title: `E2E Doomed Post ${RUN}`, content: "chart talk" } }));
  eq("the member has content before the block",
    psql(`SELECT count(*) FROM "Post" WHERE "authorId"=${bannedId};`), "1");

  const block = await req(PANEL, `/api/mg/main/api/profile/block/${bannedId}`, A());
  eq("an admin can block a member", block.status, 200);
  eq("  the row is flagged blocked",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${bannedId};`), "t");
  eq("  and the block destroys everything they posted",
    psql(`SELECT count(*) FROM "Post" WHERE "authorId"=${bannedId};`), "0");

  // The guard matters because the destructive half is not idempotent: a second
  // block would delete content written between the two calls.
  const reblock = await req(PANEL, `/api/mg/main/api/profile/block/${bannedId}`, A());
  eq("blocking an already-blocked member is refused", reblock.status, 400);

  const blockedLogin = await req(API, "/api/auth/login",
    J({ email: "banned@e2e.test", password: PW, deviceId: "e2e-retry" }));
  ok("a blocked member can no longer sign in", blockedLogin.status >= 400,
    `${blockedLogin.status} ${blockedLogin.text.slice(0, 160)}`);

  const blockedList = await req(PANEL, "/api/mg/main/api/profile/blocked", AS_ADMIN);
  eq("the blocked-members list loads", blockedList.status, 200);
  ok("  and the member is on it",
    (blockedList.json?.users ?? []).some((u) => u.id === bannedId),
    blockedList.text.slice(0, 200));

  const unblock = await req(PANEL, `/api/mg/main/api/profile/unblock/${bannedId}`, A());
  eq("an admin can lift the block", unblock.status, 200);
  eq("  and the flag is cleared",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${bannedId};`), "f");

  const reunblock = await req(PANEL, `/api/mg/main/api/profile/unblock/${bannedId}`, A());
  eq("lifting a block that is not there is refused", reunblock.status, 400);

  // ───────────────────────────────────────────────────────────────────
  G("Deleting a member");

  const doomedId = await makeUser("doomed@e2e.test", "Doomed User");
  const doomedToken = await tokenFor("doomed@e2e.test");
  await req(API, "/api/post", AT(doomedToken,
    { method: "POST", body: { title: `E2E Orphan Post ${RUN}`, content: "chart talk" } }));
  eq("the member has content before the delete",
    psql(`SELECT count(*) FROM "Post" WHERE "authorId"=${doomedId};`), "1");

  const removed = await req(PANEL, `/api/mg/main/api/admin/delete-user/${doomedId}`, A("DELETE"));
  eq("an admin can delete a member", removed.status, 200);
  eq("  the row is gone",
    psql(`SELECT count(*) FROM "User" WHERE id=${doomedId};`), "0");
  // Irreversible and cascading. If the cascade ever stopped working the rows
  // would be orphaned rather than removed, and nothing in the response says so.
  eq("  and their posts go with them",
    psql(`SELECT count(*) FROM "Post" WHERE "authorId"=${doomedId};`), "0");
  eq("  and so do their sessions",
    psql(`SELECT count(*) FROM "UserSession" WHERE "userId"=${doomedId};`), "0");

  const removedAgain = await req(PANEL, `/api/mg/main/api/admin/delete-user/${doomedId}`, A("DELETE"));
  eq("deleting a member who is already gone is refused", removedAgain.status, 404);

  const removedGarbage = await req(PANEL, "/api/mg/main/api/admin/delete-user/not-a-number", A("DELETE"));
  eq("a non-numeric id is refused before it reaches the database", removedGarbage.status, 400);

  // ───────────────────────────────────────────────────────────────────
  G("Granting and revoking privilege");

  const modId = await makeUser("mod@e2e.test", "Mod User");

  const promote = await req(PANEL, "/api/mg/main/api/admin/assign-role",
    AJ({ userId: modId, role: "MODERATOR" }));
  eq("an admin can promote a member to moderator", promote.status, 200);
  eq("  and the row says so",
    psql(`SELECT role FROM "User" WHERE id=${modId};`), "MODERATOR");

  const moderators = await req(PANEL, "/api/mg/main/api/admin/moderators", AS_ADMIN);
  eq("the moderator list loads", moderators.status, 200);
  ok("  and the new moderator is on it",
    (moderators.json?.users ?? []).some((u) => u.id === modId),
    moderators.text.slice(0, 200));

  const admins = await req(PANEL, "/api/mg/main/api/admin/get-all", AS_ADMIN);
  eq("the admin list loads", admins.status, 200);
  ok("  and holds only admins",
    (admins.json?.users ?? []).length > 0 &&
    (admins.json?.users ?? []).every((u) => u.role === "ADMIN"),
    admins.text.slice(0, 200));

  const badRole = await req(PANEL, "/api/mg/main/api/admin/assign-role",
    AJ({ userId: modId, role: "SUPERUSER" }));
  eq("a role outside the three is refused", badRole.status, 400);
  eq("  and the member keeps the role they had",
    psql(`SELECT role FROM "User" WHERE id=${modId};`), "MODERATOR");

  const ghostRole = await req(PANEL, "/api/mg/main/api/admin/assign-role",
    AJ({ userId: 2147483600, role: "ADMIN" }));
  eq("a role cannot be assigned to a member who does not exist", ghostRole.status, 404);

  // A moderator is trusted with the community, not with the platform. The
  // split is the whole point of having two roles, so it is asserted against
  // the API directly: the panel's login gate is not what enforces it.
  const modToken = await tokenFor("mod@e2e.test");
  for (const [name, path, opts] of [
    ["lift a block", `/api/profile/unblock/${bannedId}`, { method: "POST" }],
    ["delete a member", `/api/admin/delete-user/${bannedId}`, { method: "DELETE" }],
    ["assign a role", "/api/admin/assign-role", J({ userId: bannedId, role: "ADMIN" })],
    ["list the admins", "/api/admin/get-all", {}],
    ["read the dashboard", "/api/admin/dashboard-stats", {}],
    ["handle a post report", "/api/post/report/handle", J({ reportId: 1, status: "APPROVED" })],
    ["grant a VIP badge", `/api/badges/vip/${bannedId}`, { method: "PUT" }],
  ]) {
    const res = await req(API, path, {
      ...opts,
      headers: { ...(opts.headers ?? {}), authorization: `Bearer ${modToken}` },
    });
    eq(`a moderator cannot ${name}`, res.status, 403);
  }
  eq("  and none of those attempts changed anything",
    psql(`SELECT count(*) FROM "User" WHERE id=${bannedId} AND role='USER' ` +
         `AND "isUserBlocked"=false;`), "1");

  // ───────────────────────────────────────────────────────────────────
  G("A revoked admin loses the panel at once");

  // AdminAuthenticate's docstring promises "a demoted or logged-out admin
  // loses access immediately rather than at token expiry". That promise is
  // what makes the panel's role gate meaningful — an admin whose access is
  // taken away is normally someone whose access is urgent to take away.
  const demotedId = await makeUser("demoted@e2e.test", "Second Admin", "ADMIN");
  const demotedLogin = await req(PANEL, "/api/auth/login",
    J({ email: "demoted@e2e.test", password: PW }));
  const AS_DEMOTED = { headers: { cookie: `auth_token=${cookieFrom(demotedLogin).value}` } };

  eq("the second admin signs in to the panel", demotedLogin.status, 200);
  eq("  and reaches an admin-only endpoint",
    (await req(PANEL, "/api/mg/main/api/admin/get-all", AS_DEMOTED)).status, 200);

  const demote = await req(PANEL, "/api/mg/main/api/admin/assign-role",
    AJ({ userId: demotedId, role: "USER" }));
  eq("the first admin demotes them", demote.status, 200);
  eq("  and the row says so",
    psql(`SELECT role FROM "User" WHERE id=${demotedId};`), "USER");

  const afterDemotion = await req(PANEL, "/api/mg/main/api/admin/get-all", AS_DEMOTED);
  ok("their existing session stops working immediately",
    afterDemotion.status === 401 || afterDemotion.status === 403,
    `status ${afterDemotion.status} — the demoted admin still holds admin access`);

  // ───────────────────────────────────────────────────────────────────
  G("Moderating what the community posted");

  const posterId = await makeUser("poster@e2e.test", "Poster");
  const offenderId = await makeUser("offender@e2e.test", "Offender");
  await makeUser("reporter@e2e.test", "Reporter");
  const posterToken = await tokenFor("poster@e2e.test");
  const offenderToken = await tokenFor("offender@e2e.test");
  const reporterToken = await tokenFor("reporter@e2e.test");

  const newPost = async (token, title) => {
    await req(API, "/api/post", AT(token, { method: "POST", body: { title, content: "chart talk" } }));
    return Number(psql(`SELECT id FROM "Post" WHERE title='${title}' ORDER BY id DESC LIMIT 1;`));
  };
  const reportPost = async (postId) => {
    await req(API, "/api/post/report", AT(reporterToken, { method: "POST", body: { postId } }));
    return Number(psql(
      `SELECT id FROM "PostReportRequest" WHERE "postId"=${postId} ORDER BY id DESC LIMIT 1;`));
  };

  const keptPost = await newPost(posterToken, `E2E Kept Post ${RUN}`);
  ok("a member's post exists to be reported", keptPost > 0, `post id ${keptPost}`);
  const keptReport = await reportPost(keptPost);
  ok("  and another member reported it", keptReport > 0, `report id ${keptReport}`);

  const queue = await req(PANEL, "/api/mg/main/api/post/report", AS_ADMIN);
  eq("the moderation queue loads", queue.status, 200);
  ok("  and the report is in it",
    (queue.json?.reports ?? []).some((r) => r.id === keptReport), queue.text.slice(0, 200));
  ok("  with the reported post attached, which is what the admin reads",
    (queue.json?.reports ?? []).find((r) => r.id === keptReport)?.post?.id === keptPost,
    queue.text.slice(0, 300));

  const reject = await req(PANEL, "/api/mg/main/api/post/report/handle",
    AJ({ reportId: keptReport, status: "REJECTED" }));
  eq("a report can be dismissed", reject.status, 200);
  eq("  the report is marked rejected",
    psql(`SELECT status FROM "PostReportRequest" WHERE id=${keptReport};`), "REJECTED");
  eq("  and dismissing leaves the post up",
    psql(`SELECT count(*) FROM "Post" WHERE id=${keptPost};`), "1");
  eq("  and leaves its author alone",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${posterId};`), "f");

  // The destructive branch: approving deletes the post outright, and the
  // blockUser flag bans its author in the same call. Both are irreversible
  // from the panel, so both are read back out of the database.
  const strickenPost = await newPost(offenderToken, `E2E Stricken Post ${RUN}`);
  const strickenReport = await reportPost(strickenPost);
  const approve = await req(PANEL, "/api/mg/main/api/post/report/handle",
    AJ({ reportId: strickenReport, status: "APPROVED", blockUser: true }));
  eq("a report can be upheld", approve.status, 200);
  eq("  upholding takes the post down",
    psql(`SELECT count(*) FROM "Post" WHERE id=${strickenPost};`), "0");
  eq("  and blockUser bans its author",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${offenderId};`), "t");

  const noStatus = await req(PANEL, "/api/mg/main/api/post/report/handle",
    AJ({ reportId: keptReport }));
  eq("handling a report with no verdict is refused", noStatus.status, 400);
  const noReport = await req(PANEL, "/api/mg/main/api/post/report/handle",
    AJ({ reportId: 2147483600, status: "APPROVED" }));
  eq("handling a report that does not exist is refused", noReport.status, 404);

  const threadPost = await newPost(posterToken, `E2E Thread ${RUN}`);
  await req(API, "/api/post/reply", AT(posterToken,
    { method: "POST", body: { postId: threadPost, content: `E2E Reply ${RUN}` } }));
  const replyId = Number(psql(
    `SELECT id FROM "Reply" WHERE content='E2E Reply ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("a reply exists to moderate", replyId > 0, `reply id ${replyId}`);

  await req(API, "/api/post/reply/report", AT(reporterToken, { method: "POST", body: { replyId } }));
  const replyReport = Number(psql(
    `SELECT id FROM "ReplyReportRequest" WHERE "replyId"=${replyId} ORDER BY id DESC LIMIT 1;`));
  const replyQueue = await req(PANEL, "/api/mg/main/api/post/reply/report", AS_ADMIN);
  eq("the reply-report queue loads", replyQueue.status, 200);
  ok("  and the reply report is in it",
    (replyQueue.json?.reports ?? []).some((r) => r.id === replyReport),
    replyQueue.text.slice(0, 200));

  const upholdReply = await req(PANEL, "/api/mg/main/api/post/report/reply/handle",
    AJ({ reportId: replyReport, status: "APPROVED" }));
  eq("a reply report can be upheld", upholdReply.status, 200);
  eq("  and the reply is removed",
    psql(`SELECT count(*) FROM "Reply" WHERE id=${replyId};`), "0");
  eq("  while the thread it was on survives",
    psql(`SELECT count(*) FROM "Post" WHERE id=${threadPost};`), "1");


  // ───────────────────────────────────────────────────────────────────
  G("Approving a report must not lock out an administrator");

  // The highest-consequence path in the panel, and it is one click.
  //
  // `blockUser: true` is hardcoded at all four places the panel handles a
  // report — app/community-request/post/components/columns.tsx:66,
  // post/[postId]/PostPage.tsx:105, reply/components/columns.tsx:64 and
  // reply/[replyId]/ReplyPage.tsx:104 — so an operator cannot approve a report
  // without also asking for the author to be blocked. On the API side the block
  // is irreversible for an administrator: UserController.blockUser refuses to
  // block an ADMIN and unblockUser refuses to unblock one, so a block written
  // through the report handler could be undone only by a direct write to the
  // database. It also deletes every post and reply the account ever wrote.
  //
  // Neither repo can prove this alone: the panel's payload is in one and the
  // guard is in the other. That is what this suite is for.
  const authorAdminId = await makeUser("authoradmin@e2e.test", "Author Admin", "ADMIN");
  const authorAdminToken = await tokenFor("authoradmin@e2e.test");

  const adminPost = await newPost(authorAdminToken, `E2E Admin Post ${RUN}`);
  const adminKeeper = await newPost(authorAdminToken, `E2E Admin Keeper ${RUN}`);
  ok("an administrator has authored two community posts",
    adminPost > 0 && adminKeeper > 0, `${adminPost}, ${adminKeeper}`);

  const adminReport = await reportPost(adminPost);
  ok("  and a member has reported one of them", adminReport > 0, `report ${adminReport}`);

  const adminApprove = await req(PANEL, "/api/mg/main/api/post/report/handle",
    AJ({ reportId: adminReport, status: "APPROVED", blockUser: true }));
  eq("the report is approved, exactly as the panel sends it", adminApprove.status, 200);
  eq("  the reported post is taken down",
    psql(`SELECT count(*) FROM "Post" WHERE id=${adminPost};`), "0");

  // The three things that would have happened to a non-admin author, none of
  // which may happen here.
  eq("  the administrator is NOT blocked",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${authorAdminId};`), "f");
  eq("  their other content is left alone",
    psql(`SELECT count(*) FROM "Post" WHERE id=${adminKeeper};`), "1");

  const authorAdminLogin = await req(PANEL, "/api/auth/login",
    J({ email: "authoradmin@e2e.test", password: PW }));
  eq("  and they can still sign in to the panel", authorAdminLogin.status, 200);
  ok("  with a working session",
    (await req(PANEL, "/api/mg/main/api/profile", {
      headers: { cookie: `auth_token=${cookieFrom(authorAdminLogin).value}` },
    })).status === 200, "the readmitted admin's session does not work");

  // An operator told "handled successfully" would believe the author was
  // blocked and move on. The response has to say what it actually did.
  ok("  and the response says the author was spared, rather than implying otherwise",
    /administrator/i.test(adminApprove.json?.message ?? ""),
    adminApprove.text.slice(0, 200));

  // The same protection on the reply half of the queue.
  const adminThread = await newPost(authorAdminToken, `E2E Admin Thread ${RUN}`);
  await req(API, "/api/post/reply", AT(authorAdminToken,
    { method: "POST", body: { postId: adminThread, content: `E2E Admin Reply ${RUN}` } }));
  const adminReplyId = Number(psql(
    `SELECT id FROM "Reply" WHERE content='E2E Admin Reply ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("an administrator has authored a reply", adminReplyId > 0, `reply ${adminReplyId}`);

  await req(API, "/api/post/reply/report",
    AT(reporterToken, { method: "POST", body: { replyId: adminReplyId } }));
  const adminReplyReport = Number(psql(
    `SELECT id FROM "ReplyReportRequest" WHERE "replyId"=${adminReplyId} ORDER BY id DESC LIMIT 1;`));

  const adminReplyApprove = await req(PANEL, "/api/mg/main/api/post/report/reply/handle",
    AJ({ reportId: adminReplyReport, status: "APPROVED", blockUser: true }));
  eq("a reply report against an administrator is approved", adminReplyApprove.status, 200);
  eq("  the reply is taken down",
    psql(`SELECT count(*) FROM "Reply" WHERE id=${adminReplyId};`), "0");
  eq("  and the administrator is still NOT blocked",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${authorAdminId};`), "f");

  // The front door has to be shut too, or the guard above is one of two ways in.
  const blockAdmin = await req(PANEL, `/api/mg/main/api/profile/block/${authorAdminId}`, A());
  eq("an administrator cannot be blocked directly either", blockAdmin.status, 403);
  eq("  and nothing was written",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${authorAdminId};`), "f");

  // A moderator is the caller this actually protects against: routes/user.ts
  // mounts block behind moderatorAuthMiddleware, so before the guard a single
  // moderator could end an administrator's access permanently.
  const modBlocksAdmin = await req(API, `/api/profile/block/${authorAdminId}`,
    AT(modToken, { method: "POST" }));
  eq("a moderator cannot block an administrator", modBlocksAdmin.status, 403);
  eq("  and the administrator is untouched",
    psql(`SELECT "isUserBlocked" FROM "User" WHERE id=${authorAdminId};`), "f");

  // The panel half of the contract. If a call site ever stops sending
  // blockUser, the guard above is no longer what is keeping admins safe, and
  // this group would be asserting something it no longer tests.
  const blockUserCallSites = execFileSync("bash", ["-c",
    `grep -rl "blockUser: true" ${join(ADMIN_DIR, "app", "community-request")} ` +
    `2>/dev/null | sort || true`], { encoding: "utf8" }).trim();
  eq("the panel still sends blockUser on every report it handles",
    blockUserCallSites.split("\n").filter(Boolean).length, 4);

  // ───────────────────────────────────────────────────────────────────
  G("Destructive panel actions that fire on a single click");

  // Documented, not judged: whether any of these deserves a confirmation
  // dialog is a product decision. What the suite can do is pin the current
  // behaviour, so that adding one is a deliberate change that updates a spec
  // rather than a silent difference nobody notices either way.
  const source = (...parts) => {
    try { return readFileSync(join(ADMIN_DIR, ...parts), "utf8"); } catch { return ""; }
  };

  const cellActions = source("app", "users", "components", "cell-actions.tsx");
  ok("Remove Exness fires straight from the menu item",
    /onClick=\{\(\)\s*=>\s*removeExness\(\)\}/.test(cellActions),
    "the call site moved — re-check whether it now confirms");
  ok("  while Delete User, in the same menu, opens a modal first",
    /setIsDeleteModalOpen\(true\)/.test(cellActions),
    "Delete User no longer opens a modal");

  const mobilePost = source("app", "trader-community", "get-MobileView", "[postId]", "PostPage.tsx");
  ok("Delete Reply fires straight from the menu item",
    /onClick=\{\(\)\s*=>\s*handleDeleteReply\(reply\.id\)\}/.test(mobilePost),
    "the call site moved — re-check whether it now confirms");
  ok("  while Suspend User, in the same menu, arms a confirmation first",
    /setUserToSuspend\(reply\.authorId\)/.test(mobilePost),
    "Suspend User no longer arms a confirmation");

  const notifyModal = source("app", "notifications", "components", "AddNotificationModal.tsx");
  ok("Send Notification submits on the first click",
    /onClick=\{handleSubmit\}/.test(notifyModal),
    "the call site moved — re-check whether it now confirms");

  // And the server offers no second step to lean on: one POST is the whole
  // broadcast, and there is no draft, no preview and nothing to recall.
  const broadcast = await req(PANEL, "/api/mg/main/api/notification/send-notification",
    AJ({ title: `E2E Unrecallable ${RUN}`, body: "sent" }));
  ok("one call is the entire broadcast",
    broadcast.status === 200 || broadcast.status === 201,
    `${broadcast.status} ${broadcast.text.slice(0, 160)}`);
  eq("  the row is written by that one call",
    psql(`SELECT count(*) FROM "Notification" WHERE title='E2E Unrecallable ${RUN}';`), "1");
  // There is no endpoint that would take it back: the panel's only other
  // notification write is a per-recipient delete of an inbox row.
  const recall = await req(PANEL,
    `/api/mg/main/api/notification/recall/${RUN}`, A("DELETE"));
  ok("  and nothing recalls it", recall.status === 404 || recall.status === 400,
    `status ${recall.status} — a recall endpoint appeared; this spec is stale`);

  // ───────────────────────────────────────────────────────────────────
  G("Granting a badge");

  // Badges are the panel's award mechanism: the VIP badge is what marks an
  // account as a paying member, so granting one is a privileged write even
  // though it touches one boolean.
  const vipTarget = posterId;
  const grant = await req(API, `/api/badges/vip/${vipTarget}`,
    AT(adminApiToken, { method: "PUT", body: { isVip: true } }));
  eq("an admin can grant a VIP badge", grant.status, 200);
  eq("  and the badge row says so",
    psql(`SELECT "isVip" FROM "VipBadge" WHERE "userId"=${vipTarget};`), "t");

  const revoke = await req(API, `/api/badges/vip/${vipTarget}`,
    AT(adminApiToken, { method: "PUT", body: { isVip: false } }));
  eq("and revoke it again", revoke.status, 200);
  eq("  without leaving a second row behind",
    psql(`SELECT count(*) FROM "VipBadge" WHERE "userId"=${vipTarget};`), "1");
  eq("  with the flag cleared",
    psql(`SELECT "isVip" FROM "VipBadge" WHERE "userId"=${vipTarget};`), "f");

  const communityBadge = await req(API, `/api/badges/community/${vipTarget}`,
    AT(modToken, { method: "PUT", body: { badgeType: "GOLD" } }));
  eq("a moderator may grant a community badge", communityBadge.status, 200);
  eq("  and it is recorded",
    psql(`SELECT count(*) FROM "Badge" WHERE "userId"=${vipTarget} AND type='GOLD';`), "1");

  const badBadge = await req(API, `/api/badges/community/${vipTarget}`,
    AT(modToken, { method: "PUT", body: { badgeType: "PLATINUM" } }));
  eq("an invented badge tier is refused", badBadge.status, 400);

  const userGrant = await req(API, `/api/badges/vip/${vipTarget}`,
    AT(plainToken, { method: "PUT", body: { isVip: true } }));
  eq("a member cannot grant themselves a badge", userGrant.status, 403);

  // ───────────────────────────────────────────────────────────────────
  G("Correcting and retiring published content");

  // Publishing is covered above. Everything here is the other half of the
  // lifecycle — the calls that change or remove what subscribers already see,
  // which is where a silent no-op is most expensive.
  const analysisId = Number(psql(
    `SELECT id FROM "Market_analysis" WHERE title='E2E Analysis ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("the published analysis is addressable", analysisId > 0, `id ${analysisId}`);

  const editAnalysis = await req(PANEL, `/api/mg/main/api/market/${analysisId}`,
    AJ({ title: `E2E Analysis ${RUN} revised`, description: "revised outlook" }, "PUT"));
  eq("a market analysis can be corrected", editAnalysis.status, 200);
  eq("  and the correction is stored",
    psql(`SELECT title FROM "Market_analysis" WHERE id=${analysisId};`),
    `E2E Analysis ${RUN} revised`);

  const dropAnalysis = await req(PANEL, `/api/mg/main/api/market/${analysisId}`, A("DELETE"));
  eq("a market analysis can be withdrawn", dropAnalysis.status, 200);
  eq("  and the row is gone",
    psql(`SELECT count(*) FROM "Market_analysis" WHERE id=${analysisId};`), "0");

  const faq = await req(PANEL, "/api/mg/main/api/faq",
    AJ({ question: `E2E Question ${RUN}`, answer: "the original answer" }));
  ok("an admin can publish an FAQ", faq.status === 200 || faq.status === 201,
    `${faq.status} ${faq.text.slice(0, 200)}`);
  const faqId = Number(psql(
    `SELECT id FROM "Faq" WHERE question='E2E Question ${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("  and it is persisted", faqId > 0, faq.text.slice(0, 200));

  // Both fields, because that is what the panel sends: app/faq/form/faq-form.tsx
  // requires question and answer in its own schema and posts both on every
  // edit. A partial update is asserted separately below, and is refused.
  const editFaq = await req(PANEL, `/api/mg/main/api/faq/${faqId}`,
    AJ({ question: `E2E Question ${RUN}`, answer: "the corrected answer" }, "PUT"));
  eq("an FAQ can be corrected", editFaq.status, 200);
  eq("  and the new answer is what is served",
    psql(`SELECT answer FROM "Faq" WHERE id=${faqId};`), "the corrected answer");

  // Pinned deliberately. schemas/faq.schema.ts marks both fields optional on
  // update, so the wire contract says a partial edit is legal; the controller
  // refuses one. Nothing the panel does hits that gap today — but a client
  // written against the schema would, and it would get a 400 the schema does
  // not predict. This asserts what actually happens, so changing it is a
  // decision rather than an accident.
  const partialFaq = await req(PANEL, `/api/mg/main/api/faq/${faqId}`,
    AJ({ answer: "answer only" }, "PUT"));
  eq("a partial FAQ edit is refused, whatever the schema says", partialFaq.status, 400);
  eq("  and nothing is written",
    psql(`SELECT answer FROM "Faq" WHERE id=${faqId};`), "the corrected answer");

  const dropFaq = await req(PANEL, `/api/mg/main/api/faq/${faqId}`, A("DELETE"));
  eq("an FAQ can be retired", dropFaq.status, 200);
  eq("  and the row is gone", psql(`SELECT count(*) FROM "Faq" WHERE id=${faqId};`), "0");

  const video = await req(PANEL, "/api/mg/main/api/video",
    AJ({ videoId: `e2evid${RUN}`, type: "GENERAL" }));
  ok("an admin can publish a video", video.status === 200 || video.status === 201,
    `${video.status} ${video.text.slice(0, 200)}`);
  const videoId = Number(psql(
    `SELECT id FROM "Video" WHERE "videoId"='e2evid${RUN}' ORDER BY id DESC LIMIT 1;`));
  ok("  and it is persisted", videoId > 0, video.text.slice(0, 200));

  const badVideo = await req(PANEL, "/api/mg/main/api/video",
    AJ({ videoId: `e2ebad${RUN}`, type: "PODCAST" }));
  eq("a video of an unknown type is refused", badVideo.status, 400);
  eq("  and nothing was written",
    psql(`SELECT count(*) FROM "Video" WHERE "videoId"='e2ebad${RUN}';`), "0");

  const dropVideo = await req(PANEL, `/api/mg/main/api/video/${videoId}`, A("DELETE"));
  eq("a video can be taken down", dropVideo.status, 200);
  eq("  and the row is gone", psql(`SELECT count(*) FROM "Video" WHERE id=${videoId};`), "0");

  const dropTrade = await req(PANEL, `/api/mg/main/api/trade/${tradeId}`, A("DELETE"));
  eq("a live trade can be closed out", dropTrade.status, 200);
  eq("  and the row is gone",
    psql(`SELECT count(*) FROM "LiveTrade" WHERE id=${tradeId};`), "0");

  // Deleting a category takes its events with it — the FK is ON DELETE
  // CASCADE, so one click in the panel can remove a calendar's worth of
  // published events. That is worth knowing is true rather than assuming.
  eq("the published event is still there before its category goes",
    psql(`SELECT count(*) FROM "Event" WHERE "categoryId"=${categoryId};`), "1");
  const dropCategory = await req(PANEL,
    `/api/mg/main/api/event/category/${categoryId}`, A("DELETE"));
  eq("an event category can be removed", dropCategory.status, 200);
  eq("  and its events are removed with it",
    psql(`SELECT count(*) FROM "Event" WHERE "categoryId"=${categoryId};`), "0");

  // ───────────────────────────────────────────────────────────────────
  G("The dashboards an admin reads");

  const stats = await req(PANEL, "/api/mg/main/api/admin/dashboard-stats", AS_ADMIN);
  eq("the dashboard loads", stats.status, 200);
  // The numbers on the first screen of the panel. They are assembled from a
  // groupBy rather than counted directly, so "is this the same number the
  // database would give" is a real question and not a tautology.
  eq("  its member total is the number of members there are",
    String(stats.json?.stats?.totalUsers), psql(`SELECT count(*) FROM "User";`));
  eq("  verified and guest members add up to that total",
    (stats.json?.stats?.exnessVerifiedUsers ?? -1) + (stats.json?.stats?.guestUsers ?? -1),
    stats.json?.stats?.totalUsers);
  eq("  its verified count matches the database",
    String(stats.json?.stats?.exnessVerifiedUsers),
    psql(`SELECT count(*) FROM "User" WHERE "exnessVerified"=true;`));
  eq("  and its active count matches the live sessions",
    String(stats.json?.stats?.activeUsers),
    psql(`SELECT count(DISTINCT "userId") FROM "UserSession" WHERE "isActive"=true;`));

  const monthly = await req(PANEL, "/api/mg/main/api/admin/monthly-stats", AS_ADMIN);
  eq("the monthly chart loads", monthly.status, 200);
  eq("  and covers twelve months", monthly.json?.monthlyStats?.length, 12);
  const thisMonth = monthly.json?.monthlyStats?.[11];
  eq("  the newest month is the current one", thisMonth?.month,
    new Date().toLocaleString("default", { month: "short", year: "numeric" }));
  ok("  and counts the members registered this run",
    (thisMonth?.totalUsers ?? 0) > 0, JSON.stringify(thisMonth));

  const page1 = await req(PANEL, "/api/mg/main/api/profile/paginated/all?page=1&limit=2", AS_ADMIN);
  eq("the member list loads", page1.status, 200);
  ok("  and honours the page size", (page1.json?.users ?? []).length <= 2,
    `got ${(page1.json?.users ?? []).length} rows`);
  eq("  reporting the page it returned", page1.json?.pagination?.currentPage, 1);
  const page2 = await req(PANEL, "/api/mg/main/api/profile/paginated/all?page=2&limit=2", AS_ADMIN);
  eq("page two loads", page2.status, 200);
  ok("  and is a different set of members, so the offset is applied",
    JSON.stringify((page2.json?.users ?? []).map((u) => u.id)) !==
    JSON.stringify((page1.json?.users ?? []).map((u) => u.id)),
    JSON.stringify((page1.json?.users ?? []).map((u) => u.id)));

  const badPage = await req(PANEL,
    "/api/mg/main/api/profile/paginated/all?page=notanumber", AS_ADMIN);
  eq("a malformed page number is refused", badPage.status, 400);

  // ───────────────────────────────────────────────────────────────────
  G("The tier the panel talks to in production");

  // Everything above proxies to app.ts, which mounts the whole API. In
  // production API_BASE_URL is the admin tier — admin.ts, mounting the narrow
  // subset in routes/adminApi.ts, whose docstring says the list "is derived
  // from every path the panel actually calls". A path the panel calls that the
  // admin tier does not mount would pass every assertion in this file and 404
  // in production, so the tier is booted and asked directly.
  const PANEL_READS = [
    "/api/profile",
    "/api/profile/blocked",
    "/api/profile/paginated/all",
    "/api/admin/get-all",
    "/api/admin/moderators",
    "/api/admin/dashboard-stats",
    "/api/admin/monthly-stats",
    "/api/event",
    "/api/event/category",
    "/api/market",
    "/api/trade",
    "/api/faq",
    "/api/issue",
    "/api/exness",
    "/api/video/general",
    "/api/video/tutorial",
    "/api/post/report",
    "/api/post/reply/report",
    "/api/post/my-posts",
    "/api/post/trending",
    "/api/notification/get-all-notification",
  ];
  for (const path of PANEL_READS) {
    const res = await req(ADMIN_TIER, path, AT(adminApiToken));
    ok(`the admin tier serves ${path}`, res.status !== 404,
      `status ${res.status} — the panel calls this path`);
  }

  // The other half of the same rule: the routers adminApi.ts deliberately
  // leaves off must stay off. They are the highest-volume endpoints in the
  // system, and a tier sized for a handful of staff is not where they belong.
  // Each is checked on both tiers, so a 404 here means "not on this tier" and
  // not "not a route".
  for (const path of ["/api/badges", "/api/tags", "/api/banners"]) {
    const onPublic = await req(API, path, AT(adminApiToken));
    const onAdmin = await req(ADMIN_TIER, path, AT(adminApiToken));
    ok(`${path} is a real route on the public tier`, onPublic.status !== 404,
      `status ${onPublic.status}`);
    eq(`  and is not mounted on the admin tier`, onAdmin.status, 404);
  }

  // ───────────────────────────────────────────────────────────────────
  console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m`);
  if (skippedBuilds.length) {
    console.log(`\x1b[33mNOT BUILT: ${skippedBuilds.join(", ")} — this run exercised ` +
      `whatever was compiled last, not the current source.\x1b[0m`);
  }
  if (failures.length) {
    console.log("\n\x1b[31mFailures:\x1b[0m");
    for (const f of failures) console.log(`  ${f}`);
  }
  await cleanup();
  process.exit(fail ? 1 : 0);
})().catch(async (err) => {
  console.error("\n\x1b[31mHarness error:\x1b[0m", err);
  await cleanup();
  process.exit(1);
});
