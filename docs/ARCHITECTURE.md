# Architecture Documentation - Edge Caching API

## Overview

The Edge Caching API is designed to deliver static and dynamic assets with high performance and minimal origin load. It leverages modern HTTP caching standards (ETags, Cache-Control) and supports immutable versioning for global scalability.

## Components

- **API Server (Fastify)**: High-performance Node.js framework handling request routing, metadata management, and security validation.
- **Database (SQLite/Prisma)**: Stores asset metadata, version history, and secure access tokens.
- **Storage Service (Local Simulation)**: Simulates a cloud object storage provider (like S3) by managing files in a dedicated local directory.
- **Cache Service**: Manages Cache-Control header logic and simulates CDN purge operations.

## Caching Strategy

1. **Strong ETags**: Generated using SHA-256 hashes of content during upload. Stored in the database to avoid re-calculation.
2. **Conditional GET**: Implements `If-None-Match` support. Returns `304 Not Modified` when content is unchanged.
3. **Granular Cache-Control**:
   - **Immutable (Versioned)**: `public, max-age=31536000, immutable`
   - **Mutable (Recent)**: `public, s-maxage=3600, max-age=60`
   - **Private**: `private, no-store, no-cache, must-revalidate`
4. **Invalidation**: When a new version is published, the mutable asset cache is purged via a simulated CDN API call.

## Security

- **Private Assets**: Protected by cryptographically secure, short-lived tokens.
- **Token Validation**: Tokens are verified against expiry and linked assets before serving content.
