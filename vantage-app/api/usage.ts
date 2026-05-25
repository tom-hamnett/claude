import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors, licenceFrom, usage } from './_lib';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  const u = await usage(licenceFrom(req));
  res.json({
    period: u.period,
    video: { usedSec: u.videoSec, limitSec: u.limits.videoSec },
    audio: { usedSec: u.audioSec, limitSec: u.limits.audioSec },
  });
}
