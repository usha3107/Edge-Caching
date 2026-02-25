"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
class CacheService {
    /**
     * Determines the Cache-Control header based on asset type and state.
     */
    getCacheControl(type) {
        switch (type) {
            case 'versioned':
                return 'public, max-age=31536000, immutable';
            case 'mutable':
                return 'public, s-maxage=3600, max-age=60';
            case 'private':
                return 'private, no-store, no-cache, must-revalidate';
            default:
                return 'no-cache';
        }
    }
    /**
     * Simulates a CDN purge request.
     */
    async purgeAsset(assetId) {
        console.log(`[CDN] Purging cache for asset: ${assetId}`);
        // In a real scenario, this would call the CDN API (e.g., Cloudflare, CloudFront)
        // For simulation, we just log it or hit an internal endpoint if configured.
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
