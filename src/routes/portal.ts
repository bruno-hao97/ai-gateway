import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import express from 'express';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'docs-portal');

/** Static API playground — mount at /portal (index → playground) */
const router = Router();

router.get(['/', '/index.html'], (_req, res) => {
  res.redirect(302, 'playground.html');
});

router.use(
  express.static(portalRoot, {
    index: ['index.html'],
    extensions: ['html'],
  }),
);

export default router;
