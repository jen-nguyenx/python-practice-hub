// Questions tab of the topic page: a difficulty control with the other filters behind a Filters popover, then each
// scenario as a white card of ladder-style rows (status circle, title, format, difficulty pips, chevron).
// Locked topics list the rows but they are inert.
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { href } from '../../../app/router.ts';
import type { Diff, Format, Ladder } from '../../../content/ids.ts';
import { FORMAT_LABEL, FORMAT_LADDER, FORMATS } from '../../../content/ids.ts';
import type { Question, Topic } from '../../../content/schema.ts';
import type { QuestionStats } from '../../../engine/progress.ts';
import { DIFF_LEGEND } from '../../components/Chip.tsx';
import { Icon } from '../../components/Icon.tsx';
import { Markdown } from '../../components/Markdown.tsx';
import { Segmented } from '../../components/Segmented.tsx';
import type { RecentMistake } from '../progressData.ts';
import { STATUS_TEXT, statusOf } from '../progressData.ts';
import type { TopicFilters } from './filters.ts';
import { DEFAULT_FILTERS, isFiltered, popoverFilterCount } from './filters.ts';
import { DiffPips, StatusMark } from './Marks.tsx';
import { Popover } from './Popover.tsx';

const SKILLS: { id: Ladder; label: string; note: string }[] = [
  { id: 'read', label: 'Read', note: 'predict, trace, choose' },
  { id: 'repair', label: 'Repair', note: 'fill in, order, fix' },
  { id: 'write', label: 'Write', note: 'write, refactor, test' },
];

interface Row { q: Question; scenarioIdx: number; order: number; weak: RecentMistake[] }

/** Plain text of a Markdown-lite string, for tooltips. */
function plainText(md: string) {
  return md.replace(/```[\s\S]*?```/g, ' ').replace(/[`*]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\s+/g, ' ').trim();
}

function QuestionRow({ row, stats, locked }: { row: Row; stats: Map<string, QuestionStats>; locked: boolean }) {
  const { q } = row;
  const status = statusOf(stats.get(q.id));
  const inner = (
    <>
      <StatusMark status={status} />
      <span class="tp-q-title">
        <span class="tp-q-name">{q.title}</span>
        {row.weak.length ? <span class="tp-q-weak">Practises {row.weak.map((m) => m.label.toLowerCase()).join(', ')}</span> : null}
        {q.core ? <span class="sr-only">, core question</span> : null}
      </span>
      <span class="tp-q-format">{FORMAT_LABEL[q.format]}</span>
      <DiffPips diff={q.diff} />
      {locked ? <Icon name="lock" size={14} class="tp-q-chev" /> : <Icon name="chevronRight" size={16} class="tp-q-chev" />}
    </>
  );
  const tip = `${q.title} · ${STATUS_TEXT[status]}${q.core ? ' · Core question (recommended path)' : ''}`;
  return (
    <li>
      {locked ? (
        <div class="tp-q is-locked" aria-disabled="true" title={`${q.title} · opens when this topic unlocks`}>{inner}</div>
      ) : (
        <a class="tp-q" href={href.question(q.id)} title={tip}>{inner}</a>
      )}
    </li>
  );
}

function toggle<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Check({ checked, onChange, children, title }: { checked: boolean; onChange: (v: boolean) => void; children: ComponentChildren; title?: string }) {
  return (
    <label class="tp-check" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.currentTarget.checked)} />
      {children}
    </label>
  );
}

function FilterPanel({ filters, set, formats, shown, total, onClear }: {
  filters: TopicFilters;
  set: (patch: Partial<TopicFilters>) => void;
  formats: Format[];
  shown: number;
  total: number;
  onClear: () => void;
}) {
  return (
    <div class="tp-filters">
      <fieldset class="tp-fs">
        <legend class="tp-label">Skill</legend>
        {SKILLS.map((s) => (
          <Check key={s.id} checked={filters.skills.includes(s.id)} onChange={() => set({ skills: toggle(filters.skills, s.id) })}>
            <span>{s.label}</span><span class="tp-check-note">{s.note}</span>
          </Check>
        ))}
      </fieldset>
      {formats.length > 1 ? (
        <fieldset class="tp-fs">
          <legend class="tp-label">Format</legend>
          <div class="tp-fs-grid">
            {formats.map((f) => (
              <Check key={f} checked={filters.formats.includes(f)} onChange={() => set({ formats: toggle(filters.formats, f) })}>
                <span>{FORMAT_LABEL[f]}</span>
              </Check>
            ))}
          </div>
        </fieldset>
      ) : null}
      <fieldset class="tp-fs">
        <legend class="tp-label">Show</legend>
        <Check checked={filters.unsolvedOnly} onChange={(v) => set({ unsolvedOnly: v })}><span>Unsolved only</span></Check>
        <Check checked={filters.coreOnly} onChange={(v) => set({ coreOnly: v })} title="Core questions are the recommended path. Every solved question still counts.">
          <span>Core questions only</span>
        </Check>
        <Check checked={filters.weakFirst} onChange={(v) => set({ weakFirst: v })} title="Puts questions that check your recent mistakes at the top">
          <span>Weak spots first</span>
        </Check>
      </fieldset>
      <div class="tp-filters-foot">
        <span class="tp-mono-faint">{shown} of {total}</span>
        <button type="button" class="btn ghost sm" onClick={onClear} disabled={!isFiltered(filters) && !filters.weakFirst}>Clear all</button>
      </div>
      <dl class="tp-legend">
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <div key={d}><dt><DiffPips diff={d} /></dt><dd>{DIFF_LEGEND[d]}</dd></div>
        ))}
      </dl>
    </div>
  );
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

  if (all.length === 0) {
    return (
      <div class="tp-empty">
        <p><strong>Questions for this topic are being written.</strong></p>
        <p>The cheat sheet, worked example and common mistakes may already be here.</p>
      </div>
    );
  }

  const recentById = new Map(recent.map((m) => [m.id, m]));
  const visible = all
    .map((r) => ({ ...r, weak: filters.weakFirst ? r.q.detects.map((id) => recentById.get(id)).filter((m): m is RecentMistake => !!m) : [] }))
    .filter((r) => filters.diff === 'all' || r.q.diff === filters.diff)
    .filter((r) => filters.skills.length === 0 || filters.skills.includes(FORMAT_LADDER[r.q.format]))
    .filter((r) => filters.formats.length === 0 || filters.formats.includes(r.q.format))
    .filter((r) => !filters.unsolvedOnly || !stats.get(r.q.id)?.solved)
    .filter((r) => !filters.coreOnly || r.q.core);

  const set = (patch: Partial<TopicFilters>) => onFilters({ ...filters, ...patch });
  const clearAll = () => onFilters(DEFAULT_FILTERS);
  const clearHiding = () => onFilters({ ...DEFAULT_FILTERS, weakFirst: filters.weakFirst });
  const weakScore = (r: Row) => r.weak.reduce((sum, m) => sum + m.count, 0);
  const filtered = isFiltered(filters);
  const nPop = popoverFilterCount(filters);
  const diffOpt = (word: string) => <span class="tp-seg-opt">{word}</span>;

  let body;
  if (visible.length === 0) {
    body = (
      <div class="tp-empty">
        <p>No questions match these filters.</p>
        <p><button type="button" class="btn ghost" onClick={clearHiding}>Clear filters</button></p>
      </div>
    );
  } else if (filters.weakFirst) {
    const sorted = [...visible].sort((a, b) => weakScore(b) - weakScore(a) || a.order - b.order);
    const matched = sorted.filter((r) => r.weak.length > 0).length;
    body = (
      <section class="tp-scn" aria-label="Questions, weak spots first">
        <div class="tp-scn-head">
          <h2 class="tp-scn-title">Weak spots first</h2>
        </div>
        <p class="tp-scn-story">
          {recent.length === 0
            ? 'No recent mistakes yet, so the order is unchanged.'
            : matched > 0
              ? `${matched} ${matched === 1 ? 'question checks' : 'questions check'} mistakes you made in the last 30 days.`
              : 'None of these questions check your recent mistakes.'}
        </p>
        <ul class="tp-qlist">
          {sorted.map((r) => <QuestionRow key={r.q.id} row={r} stats={stats} locked={locked} />)}
        </ul>
      </section>
    );
  } else {
    body = topic.scenarios.map((s, si) => {
      const rows = visible.filter((r) => r.scenarioIdx === si);
      if (rows.length === 0) return null;
      const solved = s.questions.filter((q) => stats.get(q.id)?.solved).length;
      const story = s.story ? plainText(s.story) : '';
      return (
        <section key={s.id} class="tp-scn" aria-labelledby={`sc-${s.id}`}>
          <div class="tp-scn-head">
            <h2 id={`sc-${s.id}`} class="tp-scn-title">{s.title}</h2>
            <span class="tp-scn-count" title={`${solved} of ${s.questions.length} solved`}>
              <span aria-hidden="true">{solved}/{s.questions.length}</span>
              <span class="sr-only">{solved} of {s.questions.length} solved</span>
            </span>
          </div>
          {s.story ? <div class="tp-scn-story" title={story}><Markdown text={s.story} /></div> : null}
          <ul class="tp-qlist">
            {rows.map((r) => <QuestionRow key={r.q.id} row={r} stats={stats} locked={locked} />)}
          </ul>
        </section>
      );
    });
  }

  return (
    <div class="tp-qtab">
      <div class="tp-toolbar">
        <Segmented<Diff | 'all'>
          label="Difficulty"
          class="tp-seg"
          value={filters.diff}
          onChange={(v) => set({ diff: v })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'easy', label: diffOpt('Easy'), title: DIFF_LEGEND.easy },
            { value: 'medium', label: diffOpt('Medium'), title: DIFF_LEGEND.medium },
            { value: 'hard', label: diffOpt('Hard'), title: DIFF_LEGEND.hard },
          ]}
        />
        <span class="tp-toolbar-gap" />
        <span class={filtered ? 'tp-shown' : 'sr-only'} aria-live="polite">
          {filtered ? <>{visible.length} of {all.length}</> : <>Showing all {all.length} questions</>}
          {filtered ? <span class="sr-only"> questions shown</span> : null}
        </span>
        {filtered ? <button type="button" class="btn ghost sm tp-clear" onClick={clearHiding}>Clear</button> : null}
        <Popover
          triggerClass={`btn tp-filter-btn${nPop ? ' is-on' : ''}`}
          panelLabel="Filter questions"
          align="right"
          trigger={<><Icon name="filter" size={15} />Filters{nPop ? <span class="tp-filter-n"><span class="sr-only">, </span>{nPop}<span class="sr-only"> on</span></span> : null}</>}
        >
          <FilterPanel filters={filters} set={set} formats={formatsPresent} shown={visible.length} total={all.length} onClear={clearAll} />
        </Popover>
      </div>
      {body}
    </div>
  );
}
