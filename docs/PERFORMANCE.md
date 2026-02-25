# Performance Report - Edge Caching API

## Benchmark Results

Results gathered from `scripts/run_benchmark.py`:

| Metric                        | Value      |
| ----------------------------- | ---------- |
| Total Requests                | 100        |
| Cache Hits (304 Not Modified) | 99         |
| Cache Misses (200 OK)         | 1          |
| **Cache Hit Ratio**           | **99.00%** |

## Analysis

- **High Hit Ratio**: The system achieved a 99% hit ratio for public assets by correctly implementing strong ETags and responding with `304 Not Modified` for matching conditional requests.
- **Latency Reduction**: By leveraging ETags, the origin server avoids re-sending content bodies for cached assets, significantly reducing bandwidth and latency.
- **Cache-Control Effectiveness**:
  - **Immutable content** ensures that versioned assets are cached for the maximum duration (1 year).
  - **Mutable content** uses a revalidation period (1 minute) combined with `304` responses to balance fresh content delivery with performance.
- **Security Overhead**: Private token validation adds minimal overhead while ensuring secure, non-cacheable access to protected content.
