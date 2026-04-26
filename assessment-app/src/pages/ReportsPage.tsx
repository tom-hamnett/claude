import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '../db';
import type { InsightBullet } from '../services/sigmaAI';
import type { Mark, Person, Session } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { PageHeader } from '../components/Layout';
import { fmtDate, buildCSV, downloadFile, labelForValue } from '../lib/format';
import { EmptyState } from '../components/Empty';
import { AIBadge, AIUpsell } from '../components/AIBadge';
import { PaywallModal } from '../components/PaywallModal';
import { generateInsights } from '../services/sigmaAI';
import { canUseAI } from '../services/license';
import { AIError } from '../services/ai';

interface PersonAggregate {
  person: Person;
  sessionsCount: number;
  totalMarks: number;
  byCriterion: Map<string, { sum: number; count: number; lastValue?: number; lastDate?: number }>;
  overallAvg?: number;
  trend: { date: number; avg: number }[];
}

export default function ReportsPage() {
  const groups = useLiveQuery(() => db.groups.orderBy('name').toArray(), []);
  const settings = useLiveQuery(() => getSettings(), []);
  const [groupId, setGroupId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [insightsBusy, setInsightsBusy] = useState(false);
  const [insights, setInsights] = useState<InsightBullet[] | null>(null);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<string | undefined>();

  // Validate date range — UI hint only.
  const dateRangeInvalid = from && to && new Date(from).getTime() > new Date(to).getTime();

  const sessions = useLiveQuery(
    async () => {
      const all = await db.sessions.orderBy('date').toArray();
      return all.filter((s) => {
        if (groupId && s.groupId !== groupId) return false;
        if (from && s.date < new Date(from).getTime()) return false;
        if (to && s.date > new Date(to).getTime() + 24 * 3600_000) return false;
        return true;
      });
    },
    [groupId, from, to],
  );

  const sessionIds = useMemo(() => (sessions ?? []).map((s) => s.id), [sessions]);
  const sessionIdsKey = sessionIds.join(',');

  const marks = useLiveQuery(
    async () => {
      if (sessionIds.length === 0) return [];
      // Use whereAnyOf for one indexed query rather than N queries.
      return db.marks.where('sessionId').anyOf(sessionIds).toArray();
    },
    [sessionIdsKey],
  );

  const people = useLiveQuery(
    async () => {
      if (groupId) return db.people.where('groupId').equals(groupId).toArray();
      return db.people.toArray();
    },
    [groupId],
  );

  const sessionById = useMemo(() => new Map((sessions ?? []).map((s) => [s.id, s])), [sessions]);

  const aggregates = useMemo<PersonAggregate[]>(() => {
    if (!people || !sessions || !marks) return [];
    // Pre-bucket marks by personId once — was being filtered O(n) per person.
    const marksByPerson = new Map<string, Mark[]>();
    for (const m of marks) {
      if (!marksByPerson.has(m.personId)) marksByPerson.set(m.personId, []);
      marksByPerson.get(m.personId)!.push(m);
    }
    const out: PersonAggregate[] = [];
    for (const p of people) {
      if (p.archived) continue;
      const personMarks = marksByPerson.get(p.id) ?? [];
      if (personMarks.length === 0 && groupId) {
        out.push({
          person: p,
          sessionsCount: 0,
          totalMarks: 0,
          byCriterion: new Map(),
          trend: [],
        });
        continue;
      }
      if (personMarks.length === 0) continue;
      const byCriterion = new Map<string, { sum: number; count: number; lastValue?: number; lastDate?: number }>();
      const sessionsSet = new Set<string>();
      const perSession = new Map<string, { date: number; sum: number; count: number; min: number; max: number }>();
      for (const m of personMarks) {
        const session = sessionById.get(m.sessionId);
        if (!session) continue;
        sessionsSet.add(m.sessionId);
        const crit = session.criteria.find((c) => c.id === m.criterionId);
        const name = crit?.name ?? 'Other';
        const cur = byCriterion.get(name) ?? { sum: 0, count: 0 };
        cur.sum += m.value;
        cur.count += 1;
        if (!cur.lastDate || session.date >= cur.lastDate) {
          cur.lastDate = session.date;
          cur.lastValue = m.value;
        }
        byCriterion.set(name, cur);

        const ps = perSession.get(m.sessionId) ?? {
          date: session.date,
          sum: 0,
          count: 0,
          min: session.scale.min,
          max: session.scale.max,
        };
        ps.sum += m.value;
        ps.count += 1;
        perSession.set(m.sessionId, ps);
      }
      let oSum = 0;
      let oCount = 0;
      for (const v of byCriterion.values()) {
        oSum += v.sum;
        oCount += v.count;
      }
      const trend = Array.from(perSession.values())
        .map((ps) => ({
          date: ps.date,
          avg: ps.max === ps.min ? 0 : ((ps.sum / ps.count - ps.min) / (ps.max - ps.min)) * 100,
        }))
        .sort((a, b) => a.date - b.date);
      out.push({
        person: p,
        sessionsCount: sessionsSet.size,
        totalMarks: personMarks.length,
        byCriterion,
        overallAvg: oCount ? oSum / oCount : undefined,
        trend,
      });
    }
    return out.sort((a, b) => a.person.name.localeCompare(b.person.name));
  }, [people, sessions, marks, groupId, sessionById]);

  const allCriteriaNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of aggregates) for (const k of a.byCriterion.keys()) set.add(k);
    return Array.from(set).sort();
  }, [aggregates]);

  // Reset insights when filters change.
  useEffect(() => {
    setInsights(null);
    setInsightsError(null);
  }, [groupId, from, to]);

  const exportRollup = () => {
    if (aggregates.length === 0) return;
    const header = ['Person', ...allCriteriaNames, 'Overall avg', 'Sessions', 'Marks'];
    const rows = aggregates.map((a) => {
      const cells = allCriteriaNames.map((name) => {
        const c = a.byCriterion.get(name);
        return c ? (c.sum / c.count).toFixed(2) : '';
      });
      return [
        a.person.name,
        ...cells,
        a.overallAvg !== undefined ? a.overallAvg.toFixed(2) : '',
        a.sessionsCount,
        a.totalMarks,
      ];
    });
    const csv = buildCSV([header, ...rows]);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`sigma-rollup-${stamp}.csv`, csv);
  };

  const runInsights = async () => {
    setInsightsBusy(true);
    setInsightsError(null);
    setInsights(null);
    try {
      const gate = await canUseAI();
      if (!gate.ok) {
        setInsightsBusy(false);
        setPaywallReason(gate.reason);
        setShowPaywall(true);
        return;
      }
      // Build a roll-up payload AI can reason about.
      const rolledUpAverages = allCriteriaNames.map((c) => {
        let sum = 0;
        let count = 0;
        const trendBuckets: number[] = [];
        for (const a of aggregates) {
          const cur = a.byCriterion.get(c);
          if (cur) {
            sum += cur.sum;
            count += cur.count;
          }
        }
        // Trend: average per session over the time window.
        for (const s of sessions ?? []) {
          let sSum = 0;
          let sCount = 0;
          for (const m of marks ?? []) {
            if (m.sessionId !== s.id) continue;
            const crit = s.criteria.find((cr) => cr.id === m.criterionId);
            if (crit?.name === c) {
              sSum += m.value;
              sCount++;
            }
          }
          if (sCount > 0) trendBuckets.push(sSum / sCount);
        }
        return { criterion: c, avg: count ? sum / count : 0, count, trend: trendBuckets };
      });
      const groupName = groupId ? groups?.find((g) => g.id === groupId)?.name ?? 'Group' : 'All groups';
      const vertical = groupId
        ? groups?.find((g) => g.id === groupId)?.vertical ?? settings?.defaultVertical
        : settings?.defaultVertical;
      const result = await generateInsights({
        groupName,
        vertical,
        sessions: (sessions ?? []).map((s) => ({
          title: s.title,
          date: s.date,
          criteria: s.criteria,
          scale: { min: s.scale.min, max: s.scale.max },
        })),
        rolledUpAverages,
      });
      setInsights(result);
    } catch (err) {
      setInsightsError(err instanceof AIError ? err.message : err instanceof Error ? err.message : 'Insights failed.');
    } finally {
      setInsightsBusy(false);
    }
  };

  const aiUnlocked = settings?.license?.tier && settings.license.tier !== 'free';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Aggregated marks across sessions — perfect for end-of-year roll-ups."
        actions={
          <div className="flex items-center gap-2">
            <button
              className={aiUnlocked ? 'btn-primary' : 'btn-gold'}
              disabled={aggregates.length === 0 || insightsBusy}
              onClick={runInsights}
              title="AI insight surfacer"
            >
              <Icon name="lightbulb" size={16} />
              {insightsBusy ? 'Reading…' : 'Insights'}
            </button>
            <button className="btn-secondary" disabled={aggregates.length === 0} onClick={exportRollup}>
              <Icon name="export" size={18} />
              Export CSV
            </button>
          </div>
        }
      />

      <div className="card p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="reports-group" className="label">Group</label>
          <select
            id="reports-group"
            className="input mt-1"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">All groups</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="reports-from" className="label">From</label>
          <input
            id="reports-from"
            type="date"
            className={`input mt-1 ${dateRangeInvalid ? 'border-hot-400 ring-1 ring-hot-200' : ''}`}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="reports-to" className="label">To</label>
          <input
            id="reports-to"
            type="date"
            className={`input mt-1 ${dateRangeInvalid ? 'border-hot-400 ring-1 ring-hot-200' : ''}`}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {dateRangeInvalid ? (
          <div className="sm:col-span-3 text-xs text-hot-600">
            'From' must be before 'to'.
          </div>
        ) : null}
      </div>

      {(insights || insightsBusy || insightsError) && (
        <section className="ai-card">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="lightbulb" size={18} className="text-brand-600" />
            <h3 className="font-bold text-ink-800">Sigma AI insights</h3>
            <AIBadge />
          </div>
          {insightsBusy ? (
            <div className="text-ink-500">Reading the data…</div>
          ) : insightsError ? (
            <div className="text-sm text-hot-600">{insightsError}</div>
          ) : insights && insights.length === 0 ? (
            <div className="text-ink-600">Not enough data for confident patterns yet.</div>
          ) : insights ? (
            <ul className="space-y-2">
              {insights.map((b, i) => (
                <li key={i} className="bg-white rounded-xl border border-brand-100 p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`chip text-[10px] uppercase ${
                        b.kind === 'risk'
                          ? 'bg-hot-100 text-hot-700'
                          : b.kind === 'strength'
                          ? 'bg-emerald-100 text-emerald-700'
                          : b.kind === 'trend'
                          ? 'chip-brand'
                          : 'chip-gold'
                      }`}
                    >
                      {b.kind}
                    </span>
                    <div className="font-bold text-ink-800">{b.headline}</div>
                  </div>
                  <div className="text-sm text-ink-600 mt-1">{b.detail}</div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      )}

      {aggregates.length === 0 ? (
        <EmptyState
          icon="reports"
          title="No data in this view"
          description="Run an assessment session — or change the filters above — to see aggregated marks here."
          action={
            <Link to="/sessions/new" className="btn-primary">
              <Icon name="play" size={18} />
              Start a session
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {aggregates.map((a) => (
            <PersonReportCard
              key={a.person.id}
              aggregate={a}
              criteriaNames={allCriteriaNames}
              latestSession={sessions?.[sessions.length - 1]}
            />
          ))}
        </div>
      )}

      {!aiUnlocked && aggregates.length > 0 && !insights && (
        <div className="ai-card flex items-start gap-3">
          <Icon name="lightbulb" size={22} className="text-brand-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-ink-800">Spot patterns you'd otherwise miss</h3>
              <AIUpsell />
            </div>
            <p className="text-sm text-ink-600">
              Sigma AI reads your roll-up and flags trends, risks, strengths and cohort patterns in plain English.
              Unlock from £4.99 (BYOK) or subscribe.
            </p>
          </div>
        </div>
      )}

      <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} reason={paywallReason} />
    </div>
  );
}

function PersonReportCard({
  aggregate,
  criteriaNames,
  latestSession,
}: {
  aggregate: PersonAggregate;
  criteriaNames: string[];
  latestSession?: Session;
}) {
  const { person, byCriterion, overallAvg, sessionsCount, totalMarks, trend } = aggregate;
  const scale = latestSession?.scale;
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} size={44} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-ink-800 truncate">{person.name}</div>
          <div className="text-xs text-ink-500">
            {sessionsCount} sessions · {totalMarks} marks
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-500 font-semibold uppercase tracking-wide">Overall</div>
          <div className="text-2xl font-extrabold text-ink-800 tabular-nums">
            {overallAvg !== undefined ? overallAvg.toFixed(1) : '—'}
          </div>
          {overallAvg !== undefined && scale ? (
            <div className="text-xs font-semibold text-brand-600">
              {labelForValue(Math.round(overallAvg), scale) ?? ''}
            </div>
          ) : null}
        </div>
      </div>

      {trend.length >= 2 ? <Sparkline points={trend} /> : null}

      <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {criteriaNames.map((name) => {
          const c = byCriterion.get(name);
          if (!c) return null;
          const avg = c.sum / c.count;
          return (
            <div key={name} className="border border-ink-100 rounded-lg p-2 bg-ink-50/60">
              <div className="text-xs text-ink-500 font-semibold truncate">{name}</div>
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-extrabold text-ink-800 tabular-nums">{avg.toFixed(1)}</div>
                <div className="text-xs text-ink-400">{c.count}×</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sparkline({ points }: { points: { date: number; avg: number }[] }) {
  const W = 320;
  const H = 40;
  const min = 0;
  const max = 100;
  const xs = points.map((_, i) => (i / (points.length - 1)) * W);
  const ys = points.map((p) => H - ((p.avg - min) / (max - min)) * H);
  const d = points
    .map((_, i) => `${i === 0 ? 'M' : 'L'} ${xs[i]?.toFixed(1)} ${ys[i]?.toFixed(1)}`)
    .join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last && first ? last.avg - first.avg : 0;
  const colour = delta >= 0 ? '#10b981' : '#ef4444';
  return (
    <div className="mt-3 flex items-center gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs h-10" aria-label="Trend sparkline">
        <path d={d} fill="none" stroke={colour} strokeWidth="2.4" strokeLinecap="round" />
        {ys.map((y, i) => (
          <circle key={i} cx={xs[i]} cy={y} r="2.5" fill={colour} />
        ))}
      </svg>
      <div
        className={`text-xs font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
        title={`From ${fmtDate(first?.date ?? 0)} to ${fmtDate(last?.date ?? 0)}`}
      >
        {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}%
      </div>
    </div>
  );
}
