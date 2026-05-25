// The consent layer as product. These three promises and the per-permission cards
// are the single source of truth for the up-front privacy screen, the onboarding
// permissions step, and the Settings mirror — and they match the brief (§17).
// Each card follows the same four beats: Benefit · Problem · Advantage · Safety.

export interface Promise {
  title: string;
  body: string;
}

export const PROMISES: Promise[] = [
  {
    title: 'Your words never leave your company.',
    body: 'We read what you said inside your company’s own approved AI — never ours. Only scores ever reach us.',
  },
  {
    title: 'We coach you, never the room.',
    body: 'Every analysis is about you alone. We never rate, quote, or store the other people in your meetings.',
  },
  {
    title: 'You’re in control of all of it.',
    body: 'See exactly what Vantage can use, switch any of it off in a tap, and delete everything whenever you like.',
  },
];

export interface Permission {
  id: string;
  icon: string;
  title: string;
  /** the one-line privacy cost, shown as a chip */
  cost: string;
  benefit: string;
  problem: string;
  advantage: string;
  safety: string;
  /** default-on permissions are the private-by-construction core; opt-ups default off */
  defaultOn: boolean;
  /** true = a richer-analysis opt-up that trades a little privacy for more insight */
  optUp: boolean;
}

export const PERMISSIONS: Permission[] = [
  {
    id: 'words',
    icon: '🗣',
    title: 'Read my words',
    cost: 'Nothing leaves',
    benefit: 'Coaching on what you said — your structure, your asks, the questions you ask.',
    problem: 'Your meetings hold client names and deal terms. Most tools ship all of it to a vendor.',
    advantage: 'We analyse your words inside your company’s own approved AI. We never receive them.',
    safety: 'Only scores cross to us — your quotes stay in your company. Provable, not promised.',
    defaultOn: true,
    optUp: false,
  },
  {
    id: 'voice',
    icon: '🎚',
    title: 'Read my delivery',
    cost: 'Numbers only',
    benefit: 'Coaching on how you sound — your pace, your pauses, staying steady under pressure.',
    problem: 'Tone isn’t in a transcript, and sending your audio would send your words.',
    advantage: 'We measure your voice on your own device and keep only the numbers.',
    safety: 'A short list of numbers leaves — no audio, no words, nothing that can be played back.',
    defaultOn: true,
    optUp: false,
  },
  {
    id: 'visual',
    icon: '👁',
    title: 'Read my presence',
    cost: 'Nothing leaves',
    benefit: 'Coaching on eye contact, posture, stillness and gesture — the visible half of presence.',
    problem: 'Video is the riskiest thing to send — it catches colleagues, screens and whiteboards.',
    advantage: 'We read the footage on your device and keep only the numbers.',
    safety: 'By default nothing but measurements leaves. The recording never leaves your device.',
    defaultOn: true,
    optUp: false,
  },
  {
    id: 'visualClips',
    icon: '🎬',
    title: 'Send clips of just me',
    cost: 'Your image only',
    benefit: 'A richer read of your presence from a frontier vision model.',
    problem: 'A deeper look has to see you — but never your colleagues or your screen.',
    advantage: 'We send only short clips cropped to you, with the sound stripped and the background blurred.',
    safety: 'Your image only, with your say-so. No sound, no words, no one else in frame.',
    defaultOn: false,
    optUp: true,
  },
  {
    id: 'autoCapture',
    icon: '🔁',
    title: 'Capture my meetings automatically',
    cost: 'Convenience',
    benefit: 'Set it once and insights appear after each meeting — no uploading.',
    problem: 'If you upload every meeting by hand, you’ll stop within a week.',
    advantage: 'We read only your own recordings, from where they already save, on a cadence you set.',
    safety: 'Read-only and self-only — others are never analysed. Pause or revoke anytime.',
    defaultOn: false,
    optUp: true,
  },
  {
    id: 'history',
    icon: '📈',
    title: 'Remember my progress',
    cost: 'Stays on device',
    benefit: 'Watch yourself improve, with a coach that remembers your goals and patterns.',
    problem: 'One-off scores don’t change behaviour — improvement needs a loop over time.',
    advantage: 'Your history is yours alone, kept on your terms.',
    safety: 'Encrypted on your device, retention you choose, one tap to export or erase.',
    defaultOn: true,
    optUp: false,
  },
];

export const DEFAULT_PERMISSIONS: Record<string, boolean> = Object.fromEntries(
  PERMISSIONS.map((p) => [p.id, p.defaultOn]),
);
