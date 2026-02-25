"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const dotenv_1 = __importDefault(require("dotenv"));
const assetRoutes_1 = require("./routes/assetRoutes");
dotenv_1.default.config();
const fastify = (0, fastify_1.default)({
    logger: true,
});
// Register plugins
fastify.register(multipart_1.default, {
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
    },
});
// Register routes
fastify.register(assetRoutes_1.assetRoutes);
// Shared Error Handler
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    reply.status(error.statusCode || 500).send({
        error: error.name || 'InternalServerError',
        message: error.message || 'An unexpected error occurred',
    });
});
const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3000');
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on http://localhost:${port}`);
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();
