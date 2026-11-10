export const RAIL_COOKIE = "rail_collapsed";

const RAIL_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function railCookie(collapsed: boolean, secure: boolean): string {
  const base = `${RAIL_COOKIE}=${collapsed ? "1" : "0"}; path=/; max-age=${RAIL_MAX_AGE_SECONDS}; samesite=lax`;
  return secure ? `${base}; secure` : base;
}

export function isRailCollapsed(value: string | undefined): boolean {
  return value === "1";
}
