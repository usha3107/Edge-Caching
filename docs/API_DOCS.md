# API Documentation - Edge Caching API

## Endpoints

### 1. Upload Asset

`POST /assets/upload`

- **Request**: `multipart/form-data` with a `file` field.
- **Query Params**: `private=true` (optional) to mark as private.
- **Response**: `201 Created` with asset metadata.

### 2. Download Asset (Mutable)

`GET /assets/:id/download`

- **Headers**: Supports `If-None-Match: <etag>`.
- **Response**:
  - `200 OK`: File content with headers (`ETag`, `Cache-Control`, `Last-Modified`).
  - `304 Not Modified`: Empty body if ETag matches.

### 3. Publish New Version

`POST /assets/:id/publish`

- **Request**: Optional `multipart/form-data` with a new `file`, or empty body to snapshot current content.
- **Response**: `200 OK` with `versionId` and `etag`.

### 4. Download Immutable Version

`GET /assets/public/:version_id`

- **Response**: `200 OK` with `Cache-Control: public, max-age=31536000, immutable`.

### 5. Access Private Asset

`GET /assets/private/:token`

- **Response**: `200 OK` or `401 Unauthorized` if token is invalid/expired.

### 6. Generate Private Token

`POST /assets/:id/token`

- **Response**: `200 OK` with `token` and `expiresAt`.
