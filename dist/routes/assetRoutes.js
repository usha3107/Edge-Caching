"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assetRoutes = void 0;
const client_1 = require("@prisma/client");
const StorageService_1 = require("../services/StorageService");
const CacheService_1 = require("../services/CacheService");
const hashUtils_1 = require("../utils/hashUtils");
const tokenUtils_1 = require("../utils/tokenUtils");
const prisma = new client_1.PrismaClient();
const assetRoutes = async (fastify) => {
    // POST /assets/upload
    fastify.post('/assets/upload', async (request, reply) => {
        const data = await request.file();
        if (!data)
            return reply.status(400).send({ error: 'No file uploaded' });
        const buffer = await data.toBuffer();
        const etag = (0, hashUtils_1.generateETag)(buffer);
        const filename = data.filename;
        const mimeType = data.mimetype;
        const sizeBytes = BigInt(buffer.length);
        const storageKey = `assets/${Date.now()}_${filename}`;
        const query = request.query || {};
        const isPrivate = query.private === 'true';
        // Save to storage
        await StorageService_1.storageService.saveFile(storageKey, buffer);
        // Save to DB
        const asset = await prisma.asset.create({
            data: {
                objectStorageKey: storageKey,
                filename,
                mimeType,
                sizeBytes,
                etag,
                isPrivate,
            }
        });
        return reply.status(201).send({
            id: asset.id,
            filename: asset.filename,
            etag: asset.etag,
            size: asset.sizeBytes.toString(),
            isPrivate: asset.isPrivate
        });
    });
    // GET /assets/:id/download
    fastify.get('/assets/:id/download', async (request, reply) => {
        const { id } = request.params;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset)
            return reply.status(404).send({ error: 'Asset not found' });
        // HTTP Caching Logic
        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch === asset.etag) {
            return reply.status(304).send();
        }
        const buffer = await StorageService_1.storageService.getFile(asset.objectStorageKey);
        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', asset.sizeBytes.toString());
        reply.header('ETag', asset.etag);
        reply.header('Last-Modified', asset.updatedAt.toUTCString());
        reply.header('Cache-Control', CacheService_1.cacheService.getCacheControl(asset.isPrivate ? 'private' : 'mutable'));
        return reply.send(buffer);
    });
    // HEAD /assets/:id/download
    fastify.head('/assets/:id/download', async (request, reply) => {
        const { id } = request.params;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset)
            return reply.status(404).send();
        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', asset.sizeBytes.toString());
        reply.header('ETag', asset.etag);
        reply.header('Last-Modified', asset.updatedAt.toUTCString());
        reply.header('Cache-Control', CacheService_1.cacheService.getCacheControl(asset.isPrivate ? 'private' : 'mutable'));
        return reply.send();
    });
    // POST /assets/:id/publish (Create Version)
    fastify.post('/assets/:id/publish', async (request, reply) => {
        const { id } = request.params;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset)
            return reply.status(404).send({ error: 'Asset not found' });
        // In a real scenario, this might accept a new file or just snapshot the current
        // Here we'll simulate republishing the same content as a new version for simplicity,
        // or we could accept a new file if provided.
        const data = await request.file();
        let buffer;
        let etag;
        let storageKey;
        if (data) {
            buffer = await data.toBuffer();
            etag = (0, hashUtils_1.generateETag)(buffer);
            storageKey = `versions/${id}/${Date.now()}_${data.filename}`;
            await StorageService_1.storageService.saveFile(storageKey, buffer);
        }
        else {
            // Re-use current content for versioning if no new file provided (Snapshoting)
            buffer = await StorageService_1.storageService.getFile(asset.objectStorageKey);
            etag = asset.etag;
            storageKey = `versions/${id}/${Date.now()}_${asset.filename}`;
            await StorageService_1.storageService.saveFile(storageKey, buffer);
        }
        const version = await prisma.assetVersion.create({
            data: {
                assetId: id,
                objectStorageKey: storageKey,
                etag,
            }
        });
        // Update asset reference
        await prisma.asset.update({
            where: { id },
            data: { currentVersionId: version.id, etag, objectStorageKey: data ? storageKey : asset.objectStorageKey }
        });
        // Trigger CDN Invalidation for the mutable endpoint
        await CacheService_1.cacheService.purgeAsset(id);
        return reply.send({
            assetId: id,
            versionId: version.id,
            etag: version.etag
        });
    });
    // GET /assets/public/:version_id
    fastify.get('/assets/public/:version_id', async (request, reply) => {
        const { version_id } = request.params;
        const version = await prisma.assetVersion.findUnique({
            where: { id: version_id },
            include: { asset: true }
        });
        if (!version)
            return reply.status(404).send({ error: 'Version not found' });
        const asset = version.asset; // Explicitly cast if include doesn't type correctly
        const buffer = await StorageService_1.storageService.getFile(version.objectStorageKey);
        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', buffer.length.toString());
        reply.header('ETag', version.etag);
        reply.header('Last-Modified', version.createdAt.toUTCString());
        reply.header('Cache-Control', CacheService_1.cacheService.getCacheControl('versioned'));
        return reply.send(buffer);
    });
    // POST /assets/:id/token (Helper endpoint to generate tokens for private assets)
    fastify.post('/assets/:id/token', async (request, reply) => {
        const { id } = request.params;
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset || !asset.isPrivate)
            return reply.status(404).send({ error: 'Private asset not found' });
        const token = (0, tokenUtils_1.generateSecureToken)();
        const expiresAt = (0, tokenUtils_1.getExpiryDate)(parseInt(process.env.TOKEN_EXPIRY_MINUTES || '60'));
        await prisma.accessToken.create({
            data: {
                token,
                assetId: id,
                expiresAt
            }
        });
        return reply.send({ token, expiresAt });
    });
    // GET /assets/private/:token
    fastify.get('/assets/private/:token', async (request, reply) => {
        const { token } = request.params;
        const accessToken = await prisma.accessToken.findUnique({
            where: { token },
            include: { asset: true }
        });
        if (!accessToken || accessToken.expiresAt < new Date()) {
            return reply.status(401).send({ error: 'Invalid or expired token' });
        }
        const asset = accessToken.asset;
        const buffer = await StorageService_1.storageService.getFile(asset.objectStorageKey);
        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', asset.sizeBytes.toString());
        reply.header('ETag', asset.etag);
        reply.header('Last-Modified', asset.updatedAt.toUTCString());
        reply.header('Cache-Control', CacheService_1.cacheService.getCacheControl('private'));
        return reply.send(buffer);
    });
};
exports.assetRoutes = assetRoutes;
