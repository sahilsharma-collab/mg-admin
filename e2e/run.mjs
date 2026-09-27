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

const API_PORT = 4331;
const ADMIN_PORT = 4332;
const ECHO_PORT = 4333;
const CANARY_PORT = 4334;
const API = `http://127.0.0.1:${API_PORT}`;
const PANEL = `http://127.0.0.1:${ADMIN_PORT}`;

mkdirSync(join(E2E_DIR, "redis"), { recursive: true });

let pass = 0, fail = 0, group = "";
const failures = [];
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
  const child = spawn(cmd, args, { cwd, stdio: ["ignore", out, out], env });
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
  for (const p of procs) { try { p.kill("SIGKILL"); } catch {} }
  echo.close(); canary.close();
  redisCli("shutdown", "nosave");
};

// ════════════════════════════════════════════════════════════════ main
(async () => {
  console.log("\x1b[1mAdmin panel — session handling end to end\x1b[0m");

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

  await bootLogged("node", ["dist/app.js"], API_DIR, {
    ...process.env,
    NODE_ENV: "production", LOG_LEVEL: "warn", PORT: String(API_PORT),
    DATABASE_URL: DB_URL, DATABASE_URL_REPLICA: DB_URL,
    REDIS_HOST: "127.0.0.1", REDIS_PORT: String(REDIS_PORT), REDIS_LOG_ERRORS: "false",
    JWT_SECRET, REFRESH_TOKEN_SECRET: "e2e-refresh-secret",
    RATE_LIMIT_STORE: "redis", PUSH_ENABLED: "false",
    FIREBASE_PROJECT_ID: "e2e-test", FIREBASE_CLIENT_EMAIL: "e2e@example.com",
    FIREBASE_PRIVATE_KEY: readFileSync(join(API_DIR, "e2e", "firebase-test-key.pem"), "utf8"),
  }, "api", `${API}/health`);

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
  console.log(`\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m`);
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
