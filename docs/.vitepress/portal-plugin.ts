import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Plugin } from 'vite';
import { docRedirects } from './redirects';

const portalRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../apps/docs-portal',
);

function splitPathQuery(raw: string): { pathname: string; qs: string } {
  const qIdx = raw.indexOf('?');
  const pathname = (qIdx >= 0 ? raw.slice(0, qIdx) : raw) || '/';
  const qs = qIdx >= 0 ? raw.slice(qIdx) : '';
  return { pathname, qs };
}

function shouldSkipDocRedirect(pathname: string): boolean {
  return (
    pathname.startsWith('/@') ||
    pathname.startsWith('/node_modules') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/__vite') ||
    pathname.startsWith('/gateway') ||
    pathname.startsWith('/ai') ||
    pathname.startsWith('/billing') ||
    pathname.startsWith('/health')
  );
}

/** Dev: apply docRedirects + strip `.html` (VitePress clean URLs). */
function redirectDocPath(req: import('http').IncomingMessage, res: import('http').ServerResponse): boolean {
  const raw = req.url || '/';
  const { pathname, qs } = splitPathQuery(raw);

  if (shouldSkipDocRedirect(pathname)) return false;

  const exact = docRedirects[pathname];
  if (exact) {
    res.statusCode = 302;
    res.setHeader('Location', `${exact}${qs}`);
    res.end();
    return true;
  }

  if (!pathname.endsWith('.html')) return false;

  const withoutHtml = pathname.slice(0, -5) || '/';
  res.statusCode = 302;
  res.setHeader('Location', `${withoutHtml}${qs}`);
  res.end();
  return true;
}

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
        if (redirectDocPath(req, res)) return;

        const raw = req.url || '/';
        const pathname = raw.split('?')[0] ?? '/';
        const normalized = pathname.replace(/\/+$/, '') || '/';

        if (normalized === '/portal/playground.html' || normalized === '/portal/playground') {
          const qIdx = raw.indexOf('?');
          const params = new URLSearchParams(qIdx >= 0 ? raw.slice(qIdx) : '');
          if (params.get('embed') === '1') return next();

          const referer = String(req.headers.referer || '');
          const fromAppPlayground = /\/app\/playground\/?(\?|$)/.test(referer);
          if (fromAppPlayground) {
            params.set('embed', '1');
            try {
              params.set('parentOrigin', new URL(referer).origin);
            } catch {
              /* ignore */
            }
            const qs = params.toString();
            res.statusCode = 302;
            res.setHeader('Location', `/portal/playground.html?${qs}`);
            res.end();
            return;
          }

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
