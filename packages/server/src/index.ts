import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import crypto from 'crypto';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { registerGraphRoutes } from './routes/graphRoutes.js';
import { registerAnalysisRoutes } from './routes/analysisRoutes.js';
import { registerSearchRoutes } from './routes/searchRoutes.js';
import { registerHealthRoutes } from './routes/healthRoutes.js';
import { registerAuthRoutes, registerAuthHook } from './middleware/auth.js';
import { AuditLog, registerAuditHook } from './middleware/auditLog.js';
import { AnalysisEngine } from './engine.js';

// ─── Environment variables ───

export interface ServerEnv {
  port: number;
  authEnabled: boolean;
  jwtSecret: string;
  adminUser: string;
  adminPassword: string;
  logLevel: string;
  corsOrigin: string;
}

export function loadEnv(overrides?: Partial<ServerEnv>): ServerEnv {
  return {
    port: overrides?.port ?? parseInt(process.env.PORT || '3333', 10),
    authEnabled: overrides?.authEnabled ?? (process.env.VDA_AUTH_ENABLED === 'true'),
    jwtSecret: overrides?.jwtSecret ?? (process.env.VDA_JWT_SECRET || crypto.randomBytes(32).toString('hex')),
    adminUser: overrides?.adminUser ?? (process.env.VDA_ADMIN_USER || 'admin'),
    adminPassword: overrides?.adminPassword ?? (process.env.VDA_ADMIN_PASSWORD || ''),
    logLevel: overrides?.logLevel ?? (process.env.VDA_LOG_LEVEL || 'info'),
    corsOrigin: overrides?.corsOrigin ?? (process.env.VDA_CORS_ORIGIN || '*'),
  };
}

// ─── Server ───

export interface ServerOptions {
  dir: string;
  port: number;
  watch: boolean;
  options: Record<string, string | undefined>;
}

export async function startServer(opts: ServerOptions): Promise<void> {
  const env = loadEnv({ port: opts.port });

  // Build logger config — use pino-pretty in dev if available, fallback to JSON
  const loggerConfig: Record<string, unknown> = { level: env.logLevel };
  if (process.env.NODE_ENV !== 'production') {
    try {
      await import('pino-pretty');
      loggerConfig.transport = {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      };
    } catch {
      // pino-pretty not installed (e.g. production deps only) — use default JSON
    }
  }

  const fastify = Fastify({
    logger: loggerConfig as any,
    genReqId: () => crypto.randomUUID(),
  });

  // CORS
  const corsOrigin = env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map(s => s.trim());
  await fastify.register(cors, { origin: corsOrigin });
  await fastify.register(websocket);

  // Audit log (in-memory)
  const auditLog = new AuditLog();

  // JWT auth (conditional)
  if (env.authEnabled) {
    if (!env.adminPassword) {
      fastify.log.error('VDA_AUTH_ENABLED=true but VDA_ADMIN_PASSWORD is not set. Exiting.');
      process.exit(1);
    }
    await registerAuthHook(fastify, env);
  }

  // Audit hook — records actions to audit log
  registerAuditHook(fastify, auditLog);

  // Serve web-ui static files if available
  const webUiDist = resolve(import.meta.dirname, '../../web-ui/dist');
  if (existsSync(webUiDist)) {
    await fastify.register(fastifyStatic, {
      root: webUiDist,
      prefix: '/',
      decorateReply: true,
    });

    // SPA fallback: serve index.html for non-API, non-asset routes
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/') || request.url.startsWith('/ws') || request.url.startsWith('/health')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // Create analysis engine (pass logger)
  const engine = new AnalysisEngine(opts.dir, opts.options, opts.watch, fastify.log);
  await engine.initialize();

  // Register routes
  registerHealthRoutes(fastify, engine);
  registerAuthRoutes(fastify, env, auditLog);
  registerGraphRoutes(fastify, engine);
  registerAnalysisRoutes(fastify, engine);
  registerSearchRoutes(fastify, engine);

  // Admin routes
  fastify.get('/api/admin/audit-log', async (request, reply) => {
    const { limit } = request.query as { limit?: string };
    return { logs: auditLog.getEntries(limit ? parseInt(limit, 10) : 50) };
  });

  // WebSocket for live updates (with optional token auth)
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      if (env.authEnabled) {
        // Validate token from query param
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        if (!token) {
          socket.close(4001, 'Authentication required');
          return;
        }
        try {
          (fastify as any).jwt.verify(token);
        } catch {
          socket.close(4001, 'Invalid token');
          return;
        }
      }
      engine.addClient(socket);
      socket.on('close', () => engine.removeClient(socket));
    });
  });

  try {
    await fastify.listen({ port: env.port, host: '0.0.0.0' });
    fastify.log.info(`VDA Server running at http://localhost:${env.port}`);
    if (existsSync(webUiDist)) {
      fastify.log.info(`Web UI: http://localhost:${env.port}`);
    }
    fastify.log.info(`API: http://localhost:${env.port}/api/graph`);
    fastify.log.info(`Auth: ${env.authEnabled ? 'ENABLED' : 'disabled'}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}
