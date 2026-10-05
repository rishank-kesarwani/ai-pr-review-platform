export function normalizeApiUrl(baseUrl: string, path: string = ''): string {
  if (!baseUrl) return path.startsWith('/') ? path : `/${path}`;

  let cleanBase = baseUrl.trim().replace(/\/+$/, '');
  let cleanPath = path.trim();

  // If baseUrl already ends with /api/v1 and path starts with /api/v1, eliminate the duplicate
  if (cleanBase.endsWith('/api/v1') && cleanPath.startsWith('/api/v1')) {
    cleanPath = cleanPath.substring('/api/v1'.length);
  }

  if (cleanPath && !cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  return `${cleanBase}${cleanPath}`;
}
