import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import fastifyStatic from '@fastify/static';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { registerGraphRoutes } from './routes/graphRoutes.js';
import { registerAnalysisRoutes } from './routes/analysisRoutes.js';
import { registerSearchRoutes } from './routes/searchRoutes.js';
import { AnalysisEngine } from './engine.js';

export interface ServerOptions {
  dir: string;
  port: number;
  watch: boolean;
  options: Record<string, string | undefined>;
}

export async function startServer(opts: ServerOptions): Promise<void> {
  const fastify = Fastify({ logger: false });

  await fastify.register(cors, { origin: true });
  await fastify.register(websocket);

  // Serve web-ui static files if available
  const webUiDist = resolve(import.meta.dirname, '../../web-ui/dist');
  if (existsSync(webUiDist)) {
    await fastify.register(fastifyStatic, {
      root: webUiDist,
      prefix: '/',
    });
  }

  // Create analysis engine
  const engine = new AnalysisEngine(opts.dir, opts.options, opts.watch);
  await engine.initialize();

  // Register routes
  registerGraphRoutes(fastify, engine);
  registerAnalysisRoutes(fastify, engine);
  registerSearchRoutes(fastify, engine);

  // WebSocket for live updates
  fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {
      engine.addClient(socket);
      socket.on('close', () => engine.removeClient(socket));
    });
  });

  try {
    await fastify.listen({ port: opts.port, host: '0.0.0.0' });
    console.log(`\n✅ VDA Server running at http://localhost:${opts.port}`);
    if (existsSync(webUiDist)) {
      console.log(`   Web UI: http://localhost:${opts.port}`);
    }
    console.log(`   API: http://localhost:${opts.port}/api/graph`);
    console.log(`   WebSocket: ws://localhost:${opts.port}/ws\n`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
