"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRootDomain = exports.normalizeUrl = void 0;
const url_1 = require("url");
const DEFAULT_TRACKING_PARAMS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'fbclid',
    'gclid',
    'utm_term',
    'utm_content',
    'ref'
];
const normalizeUrl = async (inputUrl, options = {
    forceHttps: true,
    removeTrackingParams: true,
    sortQueryParams: true,
    stripTrailingSlash: true
}) => {
    if (!(inputUrl === null || inputUrl === void 0 ? void 0 : inputUrl.trim()))
        return '';
    try {
        const urlToParse = inputUrl.includes('://') ? inputUrl : `https://${inputUrl}`;
        const url = new url_1.URL(urlToParse);
        if (options.forceHttps && await shouldUpgradeToHttps(url)) {
            url.protocol = 'https:';
        }
        url.hostname = normalizeHostname(url.hostname);
        if (url.search) {
            const searchParams = new URLSearchParams(url.search);
            if (options.removeTrackingParams) {
                DEFAULT_TRACKING_PARAMS.forEach(param => searchParams.delete(param));
            }
            if (options.sortQueryParams) {
                const sortedParams = Array.from(searchParams.entries())
                    .sort(([a], [b]) => a.localeCompare(b));
                url.search = new URLSearchParams(sortedParams).toString();
            }
            else {
                url.search = searchParams.toString();
            }
        }
        if (options.stripTrailingSlash) {
            url.pathname = url.pathname.replace(/\/+$/, '') || '/';
        }
        if (!url.search) {
            url.search = '';
        }
        return url.toString();
    }
    catch (err) {
        console.warn(`URL normalization failed for: ${inputUrl}`, err);
        return inputUrl;
    }
};
exports.normalizeUrl = normalizeUrl;
const shouldUpgradeToHttps = async (url) => {
    if (!['http:', 'https:'].includes(url.protocol))
        return false;
    const localHosts = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
    if (localHosts.has(url.hostname))
        return false;
    return true;
};
const normalizeHostname = (hostname) => {
    try {
        const parsed = parseHostname(hostname);
        if (!isPublicSuffixDomain(parsed)) {
            return hostname;
        }
        const meaningfulSubdomains = parsed.subDomains.filter(sub => !['www', 'm', 'mobile', 'amp'].includes(sub));
        return [
            ...meaningfulSubdomains,
            parsed.domain,
            ...parsed.topLevelDomains
        ].filter(Boolean).join('.');
    }
    catch (_a) {
        return hostname;
    }
};
const getRootDomain = (url) => {
    try {
        const parsed = parseHostname(new url_1.URL(url).hostname);
        if (!isPublicSuffixDomain(parsed))
            return null;
        return [parsed.domain, ...parsed.topLevelDomains].join('.');
    }
    catch (_a) {
        return null;
    }
};
exports.getRootDomain = getRootDomain;
//# sourceMappingURL=urls.js.map