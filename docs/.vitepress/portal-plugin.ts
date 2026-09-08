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
      server.middlewares.use((req, res, next) => {
        const raw = req.url || '/';
        const pathname = raw.split('?')[0] ?? '/';
        const normalized = pathname.replace(/\/+$/, '') || '/';

        if (normalized === '/portal/playground.html' || normalized === '/portal/playground') {
          const qIdx = raw.indexOf('?');
          const params = new URLSearchParams(qIdx >= 0 ? raw.slice(qIdx) : '');
          if (params.get('embed') === '1') return next();

          const dest = new URLSearchParams();
          for (const [k, v] of params) {
            if (k !== 'embed' && k !== 'parentOrigin') dest.set(k, v);
          }
          const qs = dest.toString();
          res.statusCode = 302;
          res.setHeader('Location', `/app/playground/${qs ? `?${qs}` : ''}`);
          res.end();
          return;
        }

        if (normalized === '/portal' || normalized === '/portal/index.html') {
          res.statusCode = 302;
          res.setHeader('Location', '/app/playground/');
          res.end();
          return;
        }

        next();
      });
      server.middlewares.use('/portal', staticHandler);
    },
  };
}
