import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Plugin } from 'vite';

const portalRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../apps/docs-portal',
);

/** Dev: serve apps/docs-portal at /portal without running gateway :3001 */
export function portalStaticPlugin(): Plugin {
  const staticHandler = express.static(portalRoot, {
    extensions: ['html'],
    index: ['index.html'],
  });

  return {
    name: 'vitepress-portal-static',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/portal', staticHandler);
    },
  };
}
