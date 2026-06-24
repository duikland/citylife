import { isPublicSafe } from "../newcomers";

const CITIZEN_ID_PATTERN = /^citizen_[a-z0-9_]+$/;

export function isKookerbookCitizenId(citizenId: string): boolean {
  return CITIZEN_ID_PATTERN.test(citizenId) && isPublicSafe(citizenId);
}

export function kookerbookProfileUrl(currentHref: string, citizenId: string): string | null {
  if (!isKookerbookCitizenId(citizenId)) return null;
  const url = new URL(currentHref);
  url.search = "";
  url.searchParams.set("citizen", citizenId);
  return url.toString();
}
