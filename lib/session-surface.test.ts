// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Repo-wide invariants for the session token.
 *
 * The panel moved the token out of JS reach and into an httpOnly cookie the
 * proxy attaches server-side. Nothing in a unit test of a single module can
 * notice that one component has quietly gone back to the old shape, so these
 * pin the whole surface: they read the source and fail on the first file that
 * re-introduces a token a script on the admin origin could read.
 */

const ROOT = path.resolve(__dirname, "..");

// Everything that ships to the browser. app/api and lib/server are the server
// halves and are allowed to hold the token.
const CLIENT_ROOTS = ["app", "components", "context", "lib"];
const SERVER_PREFIXES = ["app/api/", "lib/server/"];

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(path.relative(ROOT, full));
    }
  }
  return out;
};

const allSources = CLIENT_ROOTS.flatMap((dir) => walk(path.join(ROOT, dir)));
const clientSources = allSources.filter(
  (file) => !SERVER_PREFIXES.some((prefix) => file.startsWith(prefix)),
);
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

/** [file, matching line] for every line of every listed file matching a pattern. */
const hits = (files: string[], pattern: RegExp): string[] =>
  files.flatMap((file) =>
    read(file)
      .split("\n")
      .map((line, i) => [line, i + 1] as const)
      .filter(([line]) => pattern.test(line))
      .map(([line, n]) => `${file}:${n}: ${line.trim()}`),
  );

describe("the session token is not reachable from JavaScript", () => {
  it("has client source files to check at all", () => {
    // A walker that silently found nothing would make every test below vacuous.
    expect(clientSources.length).toBeGreaterThan(50);
  });

  it("stores nothing token-shaped in localStorage or sessionStorage", () => {
    expect(
      hits(
        allSources,
        /(local|session)Storage\.\w+\(\s*["'`][^"'`]*(token|auth|session|jwt|bearer|credential)/i,
      ),
    ).toEqual([]);
  });

  it("uses web storage only for the two presentation keys it is meant for", () => {
    const allowed = new Set(["theme", "communityScrollPosition"]);
    const keys = allSources.flatMap((file) =>
      [...read(file).matchAll(/(?:local|session)Storage\.\w+\(\s*["'`]([^"'`]+)/g)].map(
        (m) => `${file}: ${m[1]}`,
      ),
    );

    expect(keys.filter((k) => !allowed.has(k.split(": ")[1]))).toEqual([]);
  });

  it("never writes document.cookie", () => {
    expect(hits(allSources, /document\.cookie\s*=/)).toEqual([]);
  });

  it("does not depend on js-cookie, which cannot set httpOnly", () => {
    const pkg = JSON.parse(read("package.json"));
    expect({ ...pkg.dependencies, ...pkg.devDependencies }).not.toHaveProperty(
      "js-cookie",
    );
    expect(hits(allSources, /from\s+["']js-cookie["']/)).toEqual([]);
  });

  it("sets no Authorization header outside the server half", () => {
    // The proxy attaches it from the cookie. A client-side one would mean the
    // token is back in the JS heap.
    expect(hits(clientSources, /[Aa]uthorization/)).toEqual([]);
  });

  it("sets no Bearer header outside the server half", () => {
    expect(hits(clientSources, /Bearer\s/)).toEqual([]);
  });
});

describe("no backend origin or secret reaches the browser bundle", () => {
  it("reads NEXT_PUBLIC_* only from the server-side upstream resolver", () => {
    const readers = allSources.filter((file) =>
      /process\.env\.NEXT_PUBLIC_/.test(read(file)),
    );

    expect(readers).toEqual(["lib/server/upstream.ts"]);
  });

  it("declares only URLs under NEXT_PUBLIC_*, never a credential", () => {
    const names = [...read(".env.example").matchAll(/^(NEXT_PUBLIC_\w+)=/gm)].map(
      (m) => m[1],
    );

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name).toMatch(/_URL$/);
  });

  it("keeps the proxy secret out of the published namespace", () => {
    expect(read(".env.example")).toMatch(/^ADMIN_PROXY_SECRET=/m);
    expect(read(".env.example")).not.toMatch(/NEXT_PUBLIC_\w*SECRET/);
  });

  it("hard-codes no backend origin anywhere in the app", () => {
    expect(hits(allSources, /https?:\/\/[\w.-]*(marketgenius|boomingbulls)[\w.-]*/)).toEqual(
      [],
    );
  });

  it("renders no raw HTML, so an injected script has no foothold", () => {
    expect(hits(allSources, /dangerouslySetInnerHTML/)).toEqual([]);
  });
});
