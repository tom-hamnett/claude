import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Mark, Person, Session } from '../types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { PageHeader } from '../components/Layout';
import { fmtDate, buildCSV, downloadFile, labelForValue } from '../lib/format';
import { EmptyState } from '../components/Empty';

interface PersonAggregate {
  person: Person;
  sessionsCount: number;
  totalMarks: number;
  // Map criterion-name -> { sum, count }
  byCriterion: Map<string, { sum: number; count: number; lastValue?: number; lastDate?: number }>;
  overallAvg?: number;
  trend: { date: number; avg: number }[];
}

export default function ReportsPage() {
  const groups = useLiveQuery(() => db.groups.orderBy('name').toArray(), []);
  const [groupId, setGroupId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const sessions = useLiveQuery(
    async () => {
      const all = await db.sessions.orderBy('date').toArray();
      return all.filter((s) => {
        if (groupId && s.groupId !== groupId) return false;
        if (from && s.date < new Date(from).getTime()) return false;
        if (to && s.date > new Date(to).getTime() + 24 * 3600_000) return false;
        return s.status === 'complete' || true; // include in_progress for visibility
      });
    },
    [groupId, from, to]
  );

  const sessionIds = useMemo(() => (sessions ?? []).map((s) => s.id), [sessions]);

  const marks = useLiveQuery(
    async () => {
      if (sessionIds.length === 0) return [];
      const arr: Mark[] = [];
      // Dexie has no whereIn for compound; iterate.
      for (const id of sessionIds) {
        const ms = await db.marks.where('sessionId').equals(id).toArray();
        arr.push(...ms);
      }
      return arr;
    },
    [sessionIds.join(',')]
  );

  const people = useLiveQuery(
    async () => {
      if (groupId) return db.people.where('groupId').equals(groupId).toArray();
      return db.people.toArray();
    },
    [groupId]
  );

  const aggregates = useMemo<PersonAggregate[]>(() => {
    if (!people || !sessions || !marks) return [];
    const sessionById = new Map(sessions.map((s) => [s.id, s]));
    const out: PersonAggregate[] = [];
    for (const p of people) {
      if (p.archived) continue;
      const personMarks = marks.filter((m) => m.personId === p.id);
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
      // For trend: aggregate per session normalised to 0..1 by scale, then average.
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
      let oSum = 0,
        oCount = 0;
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
  }, [people, sessions, marks, groupId]);

  const allCriteriaNames = useMemo(() => {
    const set = new Set<string>();
    for (const a of aggregates) for (const k of a.byCriterion.keys()) set.add(k);
    return Array.from(set).sort();
  }, [aggregates]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Aggregated marks across sessions — perfect for end-of-year roll-ups."
        actions={
          <button className="btn-primary" disabled={aggregates.length === 0} onClick={exportRollup}>
            <Icon name="export" size={18} />
            Export roll-up CSV
          </button>
        }
      />

      <div className="card p-4 grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Class</label>
          <select
            className="input mt-1"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">All classes</option>
            {groups?.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">From</label>
          <input
            type="date"
            className="input mt-1"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">To</label>
          <input
            type="date"
            className="input mt-1"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      {aggregates.length === 0 ? (
        <EmptyState
          icon="reports"
          title="No data in this view"
          description="Run an assessment session — or change the filters above — to see aggregated marks here."
          action={<Link to="/sessions/new" className="btn-primary"><Icon name="play" size={18} />Start a session</Link>}
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
  // Use the latest session's scale to label averages, if available.
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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-xs h-10">
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
