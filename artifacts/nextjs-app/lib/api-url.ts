/**
 * Prepends NEXT_PUBLIC_BASE_PATH to API paths so fetch() calls work correctly
 * whether the app is deployed at the root ("/") or a subpath (e.g. "/x-y").
 *
 * Next.js automatically handles basePath for <Link> and router.push(),
 * but fetch() URLs must be prefixed manually — that's what this helper does.
 *
 * Usage:
 *   fetch(apiUrl("/api/auth/login"))
 *   // → "/api/auth/login"        (root deployment)
 *   // → "/x-y/api/auth/login"   (subpath deployment)
 */
export function apiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}
