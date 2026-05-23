import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { cors, readJson } from './_lib';

// Mints a short-lived client-upload token so the browser can upload large media
// straight to Vercel Blob (bypassing serverless body limits). The licence is
// passed in clientPayload and validated before a token is issued.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  const body = (await readJson(req)) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req as any,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const license = clientPayload ? (JSON.parse(clientPayload).license as string) : '';
        if (!license && process.env.FULCRUM_DEV_OPEN !== 'true') throw new Error('Missing FULCRUM key');
        return {
          allowedContentTypes: ['audio/*', 'video/*'],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => { /* no-op; could log usage */ },
    });
    res.json(json);
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
}
