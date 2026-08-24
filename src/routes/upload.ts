import { Router } from 'express';
import multer from 'multer';
import {
  clientFromReq,
  gatewayAuth,
  sendGommoError,
} from '../middleware/gatewayAuth.js';
import { sendError } from '../utils/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const router = Router();
router.use(gatewayAuth);

/** POST /gateway/upload/image — multipart field `file`, optional fileName */
router.post('/upload/image', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer?.length) {
      sendError(res, 400, 'Multipart field `file` bắt buộc', 'VALIDATION_ERROR');
      return;
    }
    const fileName =
      (typeof req.body?.fileName === 'string' && req.body.fileName.trim())
      || file.originalname
      || 'image.png';
    const client = clientFromReq(req);
    const result = await client.uploadImage(file.buffer, fileName, file.mimetype || 'image/png');
    res.json({ success: true, data: { url: result.url }, ...result.envelope });
  } catch (err) {
    sendGommoError(res, err);
  }
});

/** POST /gateway/upload/video — multipart field `video_file` hoặc `file` */
router.post(
  '/upload/video',
  upload.fields([
    { name: 'video_file', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const file = files?.video_file?.[0] || files?.file?.[0];
      if (!file?.buffer?.length) {
        sendError(res, 400, 'Multipart field `video_file` hoặc `file` bắt buộc', 'VALIDATION_ERROR');
        return;
      }
      const fileName = file.originalname || 'video.mp4';
      const client = clientFromReq(req);
      const result = await client.uploadVideo(file.buffer, fileName, file.mimetype || 'video/mp4');
      res.json({ success: true, data: { url: result.url }, ...result.envelope });
    } catch (err) {
      sendGommoError(res, err);
    }
  },
);

export default router;
