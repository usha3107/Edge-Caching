import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import dotenv from 'dotenv';
import { assetRoutes } from './routes/assetRoutes';

dotenv.config();

const fastify = Fastify({
  logger: true,
});

fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

fastify.register(assetRoutes);

fastify.setErrorHandler((error: any, request, reply) => {
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
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
