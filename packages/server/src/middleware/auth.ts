import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import crypto from 'crypto';
import type { ServerEnv } from '../index.js';
import type { AuditLog } from './auditLog.js';

// ─── Type augmentation ───

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string };
    user: { sub: string; role: string; iat: number; exp: number };
  }
}

// ─── JWT Plugin + Auth Hook ───

/** Paths that never require authentication */
const PUBLIC_PATHS = new Set(['/health', '/health/ready', '/api/auth/login']);

function isPublicPath(url: string): boolean {
  const path = url.split('?')[0]; // strip query string
  // Static files and websocket — not under /api/ or /health
  if (!path.startsWith('/api/') && !path.startsWith('/health')) return true;
  if (path.startsWith('/ws')) return true;
  return PUBLIC_PATHS.has(path);
}

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to keep timing consistent,
    // but we know the result will be false
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function registerAuthHook(fastify: FastifyInstance, env: ServerEnv): Promise<void> {
  await fastify.register(fastifyJwt, {
    secret: env.jwtSecret,
    sign: { expiresIn: '24h' },
  });

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isPublicPath(request.url)) return;

    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or missing token' });
    }
  });
}

// ─── Auth Routes ───

export function registerAuthRoutes(
  fastify: FastifyInstance,
  env: ServerEnv,
  auditLog: AuditLog,
): void {
  // POST /api/auth/login
  fastify.post('/api/auth/login', async (request, reply) => {
    if (!env.authEnabled) {
      return { token: null, message: 'Authentication is disabled' };
    }

    const { username, password } = request.body as { username?: string; password?: string };
    if (!username || !password) {
      reply.code(400);
      return { error: 'username and password are required' };
    }

    const usernameMatch = safeCompare(username, env.adminUser);
    const passwordMatch = safeCompare(password, env.adminPassword);

    if (!usernameMatch || !passwordMatch) {
      auditLog.record({
        user: username,
        action: 'login:failed',
        target: '/api/auth/login',
        ip: request.ip,
        details: 'Invalid credentials',
      });
      reply.code(401);
      return { error: 'Invalid credentials' };
    }

    const token = (fastify as any).jwt.sign({ sub: username, role: 'admin' });

    auditLog.record({
      user: username,
      action: 'login:success',
      target: '/api/auth/login',
      ip: request.ip,
    });

    return { token };
  });

  // GET /api/auth/me — current user info
  fastify.get('/api/auth/me', async (request, reply) => {
    if (!env.authEnabled) {
      return { user: null, authEnabled: false };
    }
    const user = request.user;
    if (!user) {
      reply.code(401);
      return { error: 'Not authenticated' };
    }
    return { user: { username: user.sub, role: user.role }, authEnabled: true };
  });
}
