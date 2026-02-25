import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { storageService } from '../services/StorageService';
import { cacheService } from '../services/CacheService';
import { generateETag } from '../utils/hashUtils';
import { generateSecureToken, getExpiryDate } from '../utils/tokenUtils';

const prisma = new PrismaClient();

export const assetRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

    fastify.post('/assets/upload', async (request, reply) => {
        const data = await request.file();
        if (!data) return reply.status(400).send({ error: 'No file uploaded' });

        const buffer = await data.toBuffer();
        const etag = generateETag(buffer);
        const filename = data.filename;
        const mimeType = data.mimetype;
        const sizeBytes = BigInt(buffer.length);
        const storageKey = `assets/${Date.now()}_${filename}`;
        const query = (request.query as any) || {};
        const isPrivate = query.private === 'true';

        await storageService.saveFile(storageKey, buffer);

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

    fastify.get('/assets/:id/download', async (request, reply) => {
        const { id } = request.params as { id: string };
        const asset = await prisma.asset.findUnique({ where: { id } });

        if (!asset) return reply.status(404).send({ error: 'Asset not found' });

        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch === asset.etag) {
            return reply.status(304).send();
        }

        const buffer = await storageService.getFile(asset.objectStorageKey);

        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', asset.sizeBytes.toString());
        reply.header('ETag', asset.etag);
        reply.header('Last-Modified', asset.updatedAt.toUTCString());
        reply.header('Cache-Control', cacheService.getCacheControl(asset.isPrivate ? 'private' : 'mutable'));

        return reply.send(buffer);
    });

    fastify.post('/assets/:id/publish', async (request, reply) => {
        const { id } = request.params as { id: string };
        const asset = await prisma.asset.findUnique({ where: { id } });

        if (!asset) return reply.status(404).send({ error: 'Asset not found' });

        let data = null;
        if (request.headers['content-type']?.includes('multipart/form-data')) {
            data = await request.file();
        }

        let buffer: Buffer;
        let etag: string;
        let storageKey: string;

        if (data) {
            buffer = await data.toBuffer();
            etag = generateETag(buffer);
            storageKey = `versions/${id}/${Date.now()}_${data.filename}`;
            await storageService.saveFile(storageKey, buffer);
        } else {
            buffer = await storageService.getFile(asset.objectStorageKey);
            etag = asset.etag;
            storageKey = `versions/${id}/${Date.now()}_${asset.filename}`;
            await storageService.saveFile(storageKey, buffer);
        }

        const version = await prisma.assetVersion.create({
            data: {
                assetId: id,
                objectStorageKey: storageKey,
                etag,
            }
        });

        await prisma.asset.update({
            where: { id },
            data: { currentVersionId: version.id, etag, objectStorageKey: data ? storageKey : asset.objectStorageKey }
        });

        await cacheService.purgeAsset(id);

        return reply.send({
            assetId: id,
            versionId: version.id,
            etag: version.etag
        });
    });

    fastify.get('/assets/public/:version_id', async (request, reply) => {
        const { version_id } = request.params as { version_id: string };
        const version = await prisma.assetVersion.findUnique({
            where: { id: version_id },
            include: { asset: true }
        });

        if (!version) return reply.status(404).send({ error: 'Version not found' });

        const asset = (version as any).asset;
        const buffer = await storageService.getFile(version.objectStorageKey);

        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', buffer.length.toString());
        reply.header('ETag', version.etag);
        reply.header('Last-Modified', version.createdAt.toUTCString());
        reply.header('Cache-Control', cacheService.getCacheControl('versioned'));

        return reply.send(buffer);
    });

    fastify.post('/assets/:id/token', async (request, reply) => {
        const { id } = request.params as { id: string };
        const asset = await prisma.asset.findUnique({ where: { id } });

        if (!asset || !asset.isPrivate) return reply.status(404).send({ error: 'Private asset not found' });

        const token = generateSecureToken();
        const expiresAt = getExpiryDate(parseInt(process.env.TOKEN_EXPIRY_MINUTES || '60'));

        await prisma.accessToken.create({
            data: {
                token,
                assetId: id,
                expiresAt
            }
        });

        return reply.send({ token, expiresAt });
    });

    fastify.get('/assets/private/:token', async (request, reply) => {
        const { token } = request.params as { token: string };
        const accessToken = await prisma.accessToken.findUnique({
            where: { token },
            include: { asset: true }
        });

        if (!accessToken || accessToken.expiresAt < new Date()) {
            return reply.status(401).send({ error: 'Invalid or expired token' });
        }

        const asset = accessToken.asset;
        const buffer = await storageService.getFile(asset.objectStorageKey);

        reply.header('Content-Type', asset.mimeType);
        reply.header('Content-Length', asset.sizeBytes.toString());
        reply.header('ETag', asset.etag);
        reply.header('Last-Modified', asset.updatedAt.toUTCString());
        reply.header('Cache-Control', cacheService.getCacheControl('private'));

        return reply.send(buffer);
    });
};
