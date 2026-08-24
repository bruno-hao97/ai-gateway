import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import express from 'express';

const portalRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'apps', 'docs-portal');

/** Static landing + playground — mount at /portal */
const router = Router();

router.use(
  express.static(portalRoot, {
    index: ['index.html'],
    extensions: ['html'],
  }),
);

export default router;
