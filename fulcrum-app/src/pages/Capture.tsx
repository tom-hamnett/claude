import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../components/Shell';

const ENVS = [
  { id: 'teams', label: 'Microsoft Teams', icon: '🟦', win: 'C:\\Users\\<you>\\OneDrive\\Recordings', mac: '~/OneDrive/Recordings', note: 'Teams meeting recordings sync to OneDrive/SharePoint.' },
  { id: 'meet', label: 'Google Meet', icon: '🟩', win: 'C:\\Users\\<you>\\My Drive\\Meet Recordings', mac: '~/Google Drive/Meet Recordings', note: 'Meet recordings save to the organiser\'s Google Drive.' },
  { id: 'zoom', label: 'Zoom', icon: '🟦', win: 'C:\\Users\\<you>\\Documents\\Zoom', mac: '~/Documents/Zoom', note: 'Zoom saves local recordings to your Documents/Zoom folder.' },
  { id: 'local', label: 'Local / other', icon: '📁', win: 'C:\\Users\\<you>\\Videos\\Recordings', mac: '~/Movies/Recordings', note: 'Any folder you save recordings, Loom exports, etc. to.' },
] as const;

const CADENCE = [
  { id: 0, label: 'Real-time (as files appear)' },
  { id: 15, label: 'Every 15 minutes' },
  { id: 60, label: 'Hourly' },
  { id: 720, label: 'Twice a day' },
];

export default function Capture() {
  const [env, setEnv] = useState<typeof ENVS[number]>(ENVS[0]);
  const [os, setOs] = useState<'win' | 'mac'>(navigator.platform.toLowerCase().includes('mac') ? 'mac' : 'win');
  const [every, setEvery] = useState(0);
  const [copied, setCopied] = useState(false);

  const folder = os === 'win' ? env.win : env.mac;
  const everyFlag = every > 0 ? ` --every ${every}` : '';
  const cmd = os === 'win'
    ? `set GEMINI_API_KEY=your-key\nset ANTHROPIC_API_KEY=your-key\nset DEEPGRAM_API_KEY=your-key\nnode agent.mjs "${folder}"${everyFlag}`
    : `GEMINI_API_KEY=your-key ANTHROPIC_API_KEY=your-key DEEPGRAM_API_KEY=your-key \\\n  node agent.mjs "${folder}"${everyFlag}`;

  function copy() { navigator.clipboard?.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return (
    <Page title="Auto-capture" subtitle="Set it once and insights appear on their own — no uploading after every meeting. The capture agent runs in your profile, watches where your recordings are saved, and evaluates only you, within your budget.">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="card p-5">
            <span className="label block mb-2">1 · Where are your recordings?</span>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {ENVS.map((e) => (
                <button key={e.id} onClick={() => setEnv(e)} className={`text-left rounded-xl border p-3 transition ${env.id === e.id ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300'}`}>
                  <div className="text-lg">{e.icon}</div>
                  <div className="font-semibold text-sm text-ink-900">{e.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-400">{env.note}</p>
          </div>

          <div className="card p-5">
            <span className="label block mb-2">2 · How often?</span>
            <div className="flex flex-wrap gap-2">
              {CADENCE.map((c) => (
                <button key={c.id} onClick={() => setEvery(c.id)} className={`px-3 py-1.5 rounded-lg text-sm border ${every === c.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600'}`}>{c.label}</button>
              ))}
            </div>
          </div>

          <div className="ai-card text-sm">
            <div className="label mb-1">Privacy</div>
            <p className="text-ink-600">The agent reads only your own recordings, evaluates only you, runs on your machine with your keys, and never sends anything except to those AI providers. We coach you, not the room.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label">3 · Start the agent</span>
              <div className="flex gap-1 text-xs">
                <button onClick={() => setOs('win')} className={`px-2 py-0.5 rounded ${os === 'win' ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-ink-400'}`}>Windows</button>
                <button onClick={() => setOs('mac')} className={`px-2 py-0.5 rounded ${os === 'mac' ? 'bg-brand-100 text-brand-700 font-semibold' : 'text-ink-400'}`}>macOS</button>
              </div>
            </div>
            <p className="text-xs text-ink-400 mb-2">From the <code>fulcrum-app/local-agent</code> folder, paste your keys and run:</p>
            <pre className="bg-ink-900 text-ink-50 rounded-xl p-3 text-xs overflow-x-auto whitespace-pre-wrap">{cmd}</pre>
            <button onClick={copy} className="btn-secondary btn-sm mt-2">{copied ? 'Copied ✓' : 'Copy command'}</button>
            <p className="text-xs text-ink-400 mt-3">
              To make it run in the background in your profile, add this command to <strong>{os === 'win' ? 'Windows Task Scheduler (at log-on)' : 'Login Items / a launchd agent'}</strong>. Reports appear next to each recording and import into your history.
            </p>
          </div>

          <div className="card p-5">
            <span className="label block mb-1">Or upload manually</span>
            <p className="text-ink-500 text-sm mb-3">For one-off recordings from your own device — video, audio, or a transcript.</p>
            <Link to="/evaluate" className="btn-primary w-full">Upload a recording →</Link>
          </div>
        </div>
      </div>
    </Page>
  );
}
