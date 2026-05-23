const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function sidebarItemFromRoutePath(path: string): string {
  const lower = path.toLowerCase().split('?')[0];
  if (lower.startsWith('/material-uploads') || lower.startsWith('/lessenseries')) {
    return 'Mijn uploads';
  }
  if (lower.startsWith('/concepten')) return 'Concepten';
  if (lower.startsWith('/materialen')) return 'Materialen';
  if (lower.startsWith('/bronnen')) return 'Bronnen';
  if (lower.startsWith('/instellingen')) return 'Instellingen';
  if (lower === '/' || lower.startsWith('/dashboard')) return 'Dashboard';
  return 'Mijn uploads';
}

/** Bepaalt actief menu-item op basis van terugpad of legacy `from` (serie-id). */
export function sidebarActiveItemFromReturnPath(fromOrReturnTo?: string | null): string {
  if (!fromOrReturnTo?.trim()) return 'Mijn uploads';

  const value = fromOrReturnTo.trim();
  if (value.startsWith('/')) {
    return sidebarItemFromRoutePath(value);
  }

  if (GUID_PATTERN.test(value)) {
    return 'Mijn uploads';
  }

  return sidebarItemFromRoutePath(`/${value}`);
}
