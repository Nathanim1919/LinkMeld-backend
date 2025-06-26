import { URL } from 'url';
import { parseDomain, fromUrl } from 'parse-domain';

/**
 * Normalizes URLs for consistent storage and comparison
 */
export const normalizeUrl = (inputUrl: string): string => {
  if (!inputUrl?.trim()) return '';

  try {
    const url = new URL(inputUrl);

    // Force HTTPS if possible
    if (url.protocol === 'http:' && canUpgradeToHttps(url.hostname)) {
      url.protocol = 'https:';
    }

    // Standardize hostname (www removal)
    url.hostname = normalizeHostname(url.hostname);

    // Remove tracking params and fragments
    url.hash = '';
    const cleanSearch = new URLSearchParams(url.search);
    [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'fbclid',
      'gclid'
    ].forEach(param => cleanSearch.delete(param));
    url.search = cleanSearch.toString();

    // Sort query params
    if (url.search) {
      const params = Array.from(new URLSearchParams(url.search));
      params.sort((a, b) => a[0].localeCompare(b[0]));
      url.search = new URLSearchParams(params).toString();
    }

    // Remove trailing slashes
    url.pathname = url.pathname.replace(/\/+$/, '') || '/';

    return url.toString();
  } catch (err) {
    console.warn(`URL normalization failed for: ${inputUrl}`);
    return inputUrl;
  }
};

const normalizeHostname = (hostname: string): string => {
  const parsed = parseDomain(fromUrl(hostname));
  if (!parsed) return hostname;

  // Remove www and similar prefixes
  const { subDomains, domain, topLevelDomains } = parsed;
  const mainSub = subDomains.filter(s => !['www', 'm'].includes(s)).pop();
  
  return [
    mainSub,
    domain,
    ...topLevelDomains
  ].filter(Boolean).join('.');
};

const canUpgradeToHttps = async (hostname: string): Promise<boolean> => {
  // In production, you might want to actually check if HTTPS is available
  // For now, we'll assume most modern sites support HTTPS
  return ![
    'localhost',
    '127.0.0.1',
    '::1'
  ].includes(hostname);
};

/**
 * Extracts root domain for grouping related content
 */
export const getRootDomain = (url: string): string | null => {
  try {
    const parsed = parseDomain(fromUrl(url));
    if (!parsed) return null;

    return [parsed.domain, ...parsed.topLevelDomains].join('.');
  } catch {
    return null;
  }
};