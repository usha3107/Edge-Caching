export class CacheService {
    getCacheControl(type: 'versioned' | 'mutable' | 'private'): string {
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

    async purgeAsset(assetId: string): Promise<void> {
        console.log(`[CDN] Purging cache for asset: ${assetId}`);
    }
}

export const cacheService = new CacheService();
