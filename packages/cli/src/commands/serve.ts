import type { CliOptions } from '../config.js';

export async function serveCommand(dir: string, options: CliOptions & { port?: string; watch?: boolean }): Promise<void> {
  const port = parseInt(options.port || '3333', 10);
  console.log(`\n🚀 Starting VDA server on http://localhost:${port}\n`);
  console.log(`   Project: ${dir}`);
  console.log(`   Watch mode: ${options.watch ? 'enabled' : 'disabled'}`);
  console.log(`\n   Open http://localhost:${port} in your browser.\n`);

  try {
    const serverModule = await import('@vda/server') as any;
    await serverModule.startServer({
      dir,
      port,
      watch: options.watch || false,
      options: { ...options } as Record<string, string | undefined>,
    });
  } catch (e) {
    console.error('Failed to start server. Make sure @vda/server is built.');
    console.error(e);
    process.exit(1);
  }
}
