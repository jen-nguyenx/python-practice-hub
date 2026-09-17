// Questions tab of the topic page: filter bar and scenario sections with question rows.
import { useMemo } from 'preact/hooks';
import { href } from '../../../app/router.ts';
import type { Diff, Format, Ladder } from '../../../content/ids.ts';
import { FORMAT_LABEL, FORMAT_LADDER, FORMATS } from '../../../content/ids.ts';
import type { Question, Topic } from '../../../content/schema.ts';
import type { QuestionStats } from '../../../engine/progress.ts';
import { DiffChip, DIFF_LEGEND } from '../../components/Chip.tsx';
import { Icon } from '../../components/Icon.tsx';
import type { IconName } from '../../components/Icon.tsx';
import { InfoPopover } from '../../components/InfoPopover.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import { Switch } from '../../components/Switch.tsx';
import { plural } from '../format.ts';
import type { QStatus, RecentMistake } from '../progressData.ts';
import { STATUS_TEXT, diffRange, statusOf } from '../progressData.ts';
import type { TopicFilters } from './filters.ts';
import { DEFAULT_FILTERS, isFiltered } from './filters.ts';

const STATUS_ICON: Record<QStatus, IconName> = { new: 'dot', tried: 'clock', solved: 'check', seen: 'eye' };
const SKILLS: { id: Ladder; label: string; title: string }[] = [
  { id: 'read', label: 'Read', title: 'Read and predict code: multiple choice, predict the output, trace tables' },
  { id: 'repair', label: 'Repair', title: 'Fix or complete code: fill in the blank, Parsons puzzles, fix the bug' },
  { id: 'write', label: 'Write', title: 'Write your own code: write code, refactor, break the code' },
];

interface Row { q: Question; scenarioIdx: number; order: number; weak: RecentMistake[] }

function StatusTag({ status }: { status: QStatus }) {
  return (
    <span class={`q-status qs-${status}`}>
      <Icon name={STATUS_ICON[status]} size={14} />
      {STATUS_TEXT[status]}
    </span>
  );
}

function QuestionRow({ row, stats, locked }: { row: Row; stats: Map<string, QuestionStats>; locked: boolean }) {
  const { q } = row;
  const status = statusOf(stats.get(q.id));
  const inner = (
    <>
      <span class="q-format">{FORMAT_LABEL[q.format]}</span>
      <span class="q-title">
        {q.title}
        {row.weak.length ? <span class="q-weak">Practises: {row.weak.map((m) => m.label).join(', ')}</span> : null}
      </span>
      <span class="q-meta">
        {q.core ? <span class="q-core" title="Counts toward this topic's minimum">Core</span> : null}
        <DiffChip diff={q.diff} />
        <StatusTag status={status} />
      </span>
    </>
  );
  return (
    <li>
      {locked ? (
        <div class="q-row is-locked" aria-disabled="true">{inner}</div>
      ) : (
        <a class="q-row" href={href.question(q.id)}>{inner}</a>
      )}
    </li>
  );
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export function QuestionsTab({ topic, stats, filters, onFilters, locked, recent }: {
  topic: Topic;
  stats: Map<string, QuestionStats>;
  filters: TopicFilters;
  onFilters: (f: TopicFilters) => void;
  locked: boolean;
  recent: RecentMistake[];
}) {
  const all = useMemo(() => {
    const rows: Row[] = [];
    topic.scenarios.forEach((s, si) => s.questions.forEach((q) => rows.push({ q, scenarioIdx: si, order: rows.length, weak: [] })));
    return rows;
  }, [topic]);

  const formatsPresent = useMemo(() => FORMATS.filter((f) => all.some((r) => r.q.format === f)), [all]);
  const diffCount = (d: Diff | 'all') => (d === 'all' ? all.length : all.filter((r) => r.q.diff === d).length);

  if (all.length === 0) {
    return (
      <div class="empty-state">
        <p><strong>Questions for this topic are being written.</strong></p>
        <p>The cheat sheet, worked example and common mistakes tabs may already have content.</p>
      </div>
    );
  }

  const recentById = new Map(recent.map((m) => [m.id, m]));
  const visible = all
    .map((r) => ({ ...r, weak: filters.weakFirst ? r.q.detects.map((id) => recentById.get(id)).filter((m): m is RecentMistake => !!m) : [] }))
    .filter((r) => filters.diff === 'all' || r.q.diff === filters.diff)
    .filter((r) => filters.skills.length === 0 || filters.skills.includes(FORMAT_LADDER[r.q.format]))
    .filter((r) => filters.formats.length === 0 || filters.formats.includes(r.q.format))
    .filter((r) => !filters.unsolvedOnly || !stats.get(r.q.id)?.solved);

  const set = (patch: Partial<TopicFilters>) => onFilters({ ...filters, ...patch });
  const weakScore = (r: Row) => r.weak.reduce((sum, m) => sum + m.count, 0);

  let body;
  if (visible.length === 0) {
    body = (
      <div class="empty-state">
        <p>No questions match these filters.</p>
        <p><button type="button" class="btn sm" onClick={() => onFilters({ ...DEFAULT_FILTERS, weakFirst: filters.weakFirst })}>Clear filters</button></p>
      </div>
    );
  } else if (filters.weakFirst) {
    const sorted = [...visible].sort((a, b) => weakScore(b) - weakScore(a) || a.order - b.order);
    const matched = sorted.filter((r) => r.weak.length > 0).length;
    body = (
      <section class="scenario" aria-label="Questions, weak spots first">
        <p class="weak-note">
          {recent.length === 0
            ? 'No recent mistakes yet, so the order is unchanged. Mistakes from your checks will move matching questions to the top.'
            : matched > 0
              ? `${plural(matched, 'question')} check${matched === 1 ? 's' : ''} mistakes you made recently: ${recent.slice(0, 3).map((m) => m.label).join(', ')}.`
              : 'None of these questions check the mistakes you made recently.'}
        </p>
        <ul class="q-list">
          {sorted.map((r) => <QuestionRow key={r.q.id} row={r} stats={stats} locked={locked} />)}
        </ul>
      </section>
    );
  } else {
    body = topic.scenarios.map((s, si) => {
      const rows = visible.filter((r) => r.scenarioIdx === si);
      if (rows.length === 0) return null;
      const solved = s.questions.filter((q) => stats.get(q.id)?.solved).length;
      return (
        <section key={s.id} class="scenario" aria-labelledby={`sc-${s.id}`}>
          <div class="scenario-head">
            <h3 id={`sc-${s.id}`} class="scenario-title">{s.title}</h3>
            <span class="scenario-meta num">
              {diffRange(s.questions.map((q) => q.diff))} · {solved} of {s.questions.length} solved
            </span>
          </div>
          {s.story ? <Markdown text={s.story} class="scenario-story" /> : null}
          <ul class="q-list">
            {rows.map((r) => <QuestionRow key={r.q.id} row={r} stats={stats} locked={locked} />)}
          </ul>
        </section>
      );
    });
  }

  return (
    <div class="qtab">
      <div class="filters" role="group" aria-label="Filter questions">
        <div class="filter-group">
          <span class="filter-label" id="flt-diff">Difficulty</span>
          <Segmented<Diff | 'all'>
            size="sm"
            labelledBy="flt-diff"
            value={filters.diff}
            onChange={(v) => set({ diff: v })}
            options={[
              { value: 'all', label: 'All', count: diffCount('all') },
              { value: 'easy', label: 'Easy', count: diffCount('easy'), title: DIFF_LEGEND.easy },
              { value: 'medium', label: 'Medium', count: diffCount('medium'), title: DIFF_LEGEND.medium },
              { value: 'hard', label: 'Hard', count: diffCount('hard'), title: DIFF_LEGEND.hard },
            ]}
          />
          <InfoPopover label="What the difficulty levels mean">
            <dl class="legend">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <div key={d} class="legend-row">
                  <dt><DiffChip diff={d} /></dt>
                  <dd>{DIFF_LEGEND[d]}</dd>
                </div>
              ))}
            </dl>
          </InfoPopover>
        </div>
        <div class="filter-group">
          <span class="filter-label" id="flt-skill">Skill</span>
          <span class="chip-row" role="group" aria-labelledby="flt-skill">
            {SKILLS.map((s) => (
              <button key={s.id} type="button" class="chip filter-chip" aria-pressed={filters.skills.includes(s.id)} title={s.title} onClick={() => set({ skills: toggle(filters.skills, s.id) })}>
                {s.label}
              </button>
            ))}
          </span>
        </div>
        {formatsPresent.length > 1 ? (
          <div class="filter-group filter-formats">
            <span class="filter-label" id="flt-format">Type</span>
            <span class="chip-row" role="group" aria-labelledby="flt-format">
              {formatsPresent.map((f: Format) => (
                <button key={f} type="button" class="chip filter-chip" aria-pressed={filters.formats.includes(f)} onClick={() => set({ formats: toggle(filters.formats, f) })}>
                  {FORMAT_LABEL[f]}
                </button>
              ))}
            </span>
          </div>
        ) : null}
        <div class="filter-group filter-toggles">
          <Switch checked={filters.unsolvedOnly} onChange={(v) => set({ unsolvedOnly: v })} label="Unsolved only" />
          <Switch checked={filters.weakFirst} onChange={(v) => set({ weakFirst: v })} label="Weak spots first" />
        </div>
      </div>
      <div class="filter-summary" aria-live="polite">
        <span class="num">Showing {visible.length} of {all.length} questions</span>
        {isFiltered(filters) ? (
          <button type="button" class="btn ghost sm" onClick={() => onFilters({ ...DEFAULT_FILTERS, weakFirst: filters.weakFirst })}>Clear filters</button>
        ) : null}
        <span class="spacer" />
        <span class="filter-hint">Core questions count toward the minimum.</span>
      </div>
      {locked ? (
        <p class="locked-note"><Icon name="lock" size={14} /> Questions open when this topic unlocks. You can still read them below.</p>
      ) : null}
      {body}
    </div>
  );
}

