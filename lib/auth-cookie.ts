// The name is shared by middleware.ts (which gates routing on the cookie's
// presence) and the route handlers that issue and clear it. It stays
// "auth_token" so existing sessions are not invalidated by the rename alone —
// they are invalidated by the value changing shape, which is handled below.
export const AUTH_COOKIE = "auth_token";

// One day, matching the access-token lifetime the API issues. A longer cookie
// than the token it carries only produces sessions that look alive and are not.
const MAX_AGE_SECONDS = 60 * 60 * 24;

/**
 * Options for the session cookie.
 *
 * `httpOnly` is the point of this module. The cookie used to be written by
 * js-cookie from component code, and JS cannot set that flag by definition —
 * so any script running on the admin origin could read an admin bearer token.
 * Issuing it from a route handler is what makes the flag available at all.
 */
export const authCookieOptions = () =>
  ({
    httpOnly: true,
    sameSite: "strict",
    // Local development is served over plain HTTP; a Secure cookie would be
    // silently dropped and the panel would appear to log in and then bounce
    // straight back to /login.
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  }) as const;
