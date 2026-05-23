const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isAllowedLesReturnPath(path: string): boolean {
  if (path.startsWith('/lessen/new')) return true;
  if (path.startsWith('/material-uploads/')) return true;
  if (path === '/concepten' || path.startsWith('/concepten/')) return true;
  if (path === '/materialen' || path.startsWith('/materialen/')) return true;
  return false;
}

/** Veilig terugpad na les-inzage (whitelist). */
export function getSafeLesReturnPath(returnTo: string | null | undefined): string | null {
  if (!returnTo) return null;

  let decoded = returnTo;
  try {
    decoded = decodeURIComponent(returnTo);
  } catch {
    return null;
  }

  if (!decoded.startsWith('/') || decoded.includes('://')) return null;
  const pathOnly = decoded.split('?')[0];
  if (!isAllowedLesReturnPath(pathOnly)) return null;

  return decoded;
}

/** Link naar les-inzage met expliciet terugpad (Materialen, Concepten, Mijn uploads, …). */
export function buildLesViewHref(lesId: string, returnTo: string): string {
  const params = new URLSearchParams({ returnTo });
  return `/lessen/${lesId}?${params.toString()}`;
}

/** Alleen voor upload-flow: `from` = lessenserie-id zonder returnTo. */
export function getUploadsSerieBackPath(from: string | null | undefined): string | null {
  if (!from?.trim() || !GUID_PATTERN.test(from.trim())) return null;
  return `/material-uploads/${from.trim()}`;
}
