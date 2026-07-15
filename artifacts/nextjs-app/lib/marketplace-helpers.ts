/**
 * Pure marketplace helpers (no DB) — safe for unit tests
 */

export function parseLocation(location: string) {
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { city: parts[0], state: parts[1], country: parts.slice(2).join(", ") };
  }
  if (parts.length === 2) return { city: parts[0], state: "", country: parts[1] };
  return { city: parts[0] ?? "", state: "", country: "" };
}

export function profileCompletion(user: {
  name?: string;
  phone?: string | null;
  organization?: string | null;
  industry?: string | null;
  location?: string | null;
  bio?: string | null;
  primaryRole?: string | null;
}) {
  const fields = [
    !!user.name,
    !!user.primaryRole,
    !!user.phone,
    !!user.organization,
    !!user.industry,
    !!user.location,
    !!user.bio,
  ];
  return Math.round((fields.filter(Boolean).length / fields.length) * 100);
}

export function parsePageLimit(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
