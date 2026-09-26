// Progress for STAT2402 (#/report when the unit is STAT2402): the counterpart of the CITS1401 report, built
// on the R lessons and the R papers instead of the Python question bank. What has been read, what every
// quiz and paper says about each lesson, which kinds of question cost marks, and what to do next -- every
// figure from the event log (src/engine/statProgress.ts). Printable, like the CITS1401 report, so a
// student can take it to a tutor.
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { lessonsInTrack } from '../../content/lessons/index.ts';
import { STAT_KIND_LABEL } from '../../content/statQuestionSchema.ts';
import { loadStatBank } from '../../content/statBank.ts';
import type { StatBank } from '../../engine/statExam.ts';
import { statHistory } from '../../engine/statExam.ts';
import type { StatMarks, StatWorkOn } from '../../engine/statProgress.ts';
import { shareOf, statProgress } from '../../engine/statProgress.ts';
import { STAT_MIN_FOR_STRONG } from '../../engine/statProgress.ts';
import { streak } from '../../engine/streak.ts';
import { IconButton, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { formatDate, heatStep, pct, plural, relativeDay } from '../report/format.ts';
import { Section } from '../report/ReportView.tsx';
import { HeatLegend } from '../report/TopicMap.tsx';
import { UnitElsewhere } from '../report/UnitElsewhere.tsx';
import { StatHistory } from './StatExams.tsx';
import { usePrintMode } from './Report.tsx';
import '../report/report.css';
import '../testmode/testmode.css';
import '../stat/stat.css';

/** Marks as a person writes them: whole, or to the half mark a write question can earn. */
const marksText = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

function MarksCell({ marks, loading, what }: { marks: StatMarks; loading: boolean; what: string }) {
  if (loading) return <td class="n"><span class="rp-heat heat h-0" aria-label={`${what}: loading`}>…</span></td>;
  const share = shareOf(marks);
  if (share === null) return <td class="n"><span class="rp-heat heat h-0" aria-label={`${what}: no questions answered yet`}>–</span></td>;
  const label = `${what}: ${marksText(marks.earned)} of ${marksText(marks.total)} marks over ${plural(marks.answered, 'question')}`;
  return (
    <td class="n">
      <span class={`rp-heat heat h-${heatStep(share)}`} aria-label={label} title={label}>{pct(share)}</span>
    </td>
  );
}

/** The mock finals in the order they were sat. Shapes only; the summary is in aria-label. */
function Spark({ percents }: { percents: number[] }) {
  const pts = percents.slice(-12);
  if (pts.length < 2) return null;
  const W = 72;
  const H = 24;
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * (W - 4) + 2, H - 2 - (p / 100) * (H - 4)] as const);
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const [lx, ly] = xy[xy.length - 1];
  return (
    <svg class="rp-mini" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`The last ${pts.length} mock finals: first ${pts[0]}%, last ${pts[pts.length - 1]}%.`}>
      <path d={d} />
      <circle cx={lx} cy={ly} r="2.5" />
    </svg>
  );
}

export function StatProgress() {
  const [ready, setReady] = useState(false);
  const [bank, setBank] = useState<StatBank | null>(null);
  const [failed, setFailed] = useState(false);
  const [now] = useState(() => Date.now());
  const events = store.events.value;
  const lessons = lessonsInTrack('stat2402');
  const byId = useMemo(() => new Map(lessons.map((l, i) => [l.id, { ...l, num: i + 1 }])), [lessons.length]);
  usePrintMode();

  useEffect(() => {
    let alive = true;
    store.ready.then(() => { if (alive) setReady(true); }, () => { if (alive) setReady(true); });
    loadStatBank().then((b) => { if (alive) setBank(b); }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const data = useMemo(() => statProgress(events, lessons.map((l) => l.id), bank?.questions ?? null), [events, bank, lessons.length]);
  const run = useMemo(() => streak(events, now), [events, now]);
  const mocks = useMemo(() => statHistory(events, 'mock'), [events]);
  const practices = useMemo(() => statHistory(events, 'practice'), [events]);
  const loading = !bank && !failed;
  const title = (id: string) => byId.get(id)?.title ?? id;
  const started = data.read > 0 || data.papers > 0;

  const tiles: { key: string; value: string; label: string; sub?: string; extra?: ComponentChildren }[] = [
    { key: 'read', value: String(data.read), label: `of ${lessons.length} lessons read`, sub: data.days ? `${plural(data.days, 'day')} of STAT2402 work` : undefined },
    { key: 'quiz', value: String(data.quizzed), label: `of ${lessons.length} lessons quizzed`, sub: data.share !== null ? `${pct(data.share)} of all marks so far` : undefined },
    {
      key: 'mock', value: data.mock.best ? `${data.mock.best.percent}%` : '–', label: 'best mock final',
      sub: data.mock.attempts ? `${plural(data.mock.attempts, 'paper')} · last ${data.mock.last!.percent}%` : 'not sat yet',
      extra: <Spark percents={data.mock.percents} />,
    },
    { key: 'run', value: String(run.days), label: run.days === 1 ? 'day in a row' : 'days in a row', sub: run.todayDone ? 'done today' : run.days ? 'nothing yet today' : undefined },
  ];

  const workOnRow = (w: StatWorkOn) => {
    const t = title(w.lessonId);
    if (w.why === 'weak') return { text: `Go back over "${t}", then retake its quiz: ${pct(w.share)} of its marks so far`, link: href.lesson(w.lessonId) };
    if (w.why === 'quiz') return { text: `Take the quiz on "${t}": read, not tested yet`, link: href.quiz(w.lessonId) };
    return { text: `Read "${t}" next`, link: href.lesson(w.lessonId) };
  };

  const kindShare = (k: string) => { const row = data.kinds.find((x) => x.kind === k); return row && row.marks.answered >= 3 ? shareOf(row.marks) : null; };
  const writeShare = kindShare('write');
  const readShares = ['choice', 'number', 'predict'].map(kindShare).filter((x): x is number => x !== null);
  const writingTrails = writeShare !== null && readShares.length > 0 && Math.min(...readShares) - writeShare >= 0.2;

  return (
    <div class="page rp stat-rp">
      <header class="rp-head">
        <div class="rp-title">
          <p class="rp-crumbs">STAT2402</p>
          <h1>Progress</h1>
          <p class="rp-scope rp-print-only">All time · printed {formatDate(now)}</p>
        </div>
        <div class="rp-head-actions rp-no-print">
          <IconButton icon="download" label="Print or save as PDF" bordered onClick={() => window.print()} />
        </div>
      </header>

      {!ready ? <p class="rp-muted" role="status">Loading your progress…</p> : !started ? (
        <section class="rp-card rp-empty" aria-labelledby="sp-empty-h">
          <span class="rp-empty-icon" aria-hidden="true"><Icon name="chart" size={20} /></span>
          <h2 id="sp-empty-h" class="rp-empty-title">Nothing to show yet</h2>
          <p class="rp-muted">Finish a lesson or sit a quiz, and what you have read, your marks lesson by lesson and what to work on next show up here.</p>
          <div class="rp-empty-actions">
            {lessons[0] ? <LinkButton href={href.lesson(lessons[0].id)} variant="primary">Start the first lesson <Icon name="arrowRight" /></LinkButton> : null}
            <LinkButton href={href.exam()} variant="ghost">Quizzes and papers</LinkButton>
          </div>
        </section>
      ) : (
        <>
          <ul class="rp-stats" aria-label="Totals">
            {tiles.map((tile) => (
              <li key={tile.key} class="rp-stat">
                <span class="rp-stat-top"><span class="rp-stat-num">{tile.value}</span>{tile.extra}</span>
                <span class="rp-stat-label">{tile.label}</span>
                {tile.sub ? <span class="rp-stat-sub">{tile.sub}</span> : null}
              </li>
            ))}
          </ul>

          <div class="rp-duo">
            <section class="rp-card rp-list-card" aria-labelledby="sp-strengths">
              <h2 id="sp-strengths" class="rp-card-title">Strengths</h2>
              {data.strengths.length ? (
                <ul class="rp-rows">
                  {data.strengths.map((s) => (
                    <li key={s.lessonId} class="rp-row-item"><Icon name="check" size={15} class="rp-ok-icon" /><span>{title(s.lessonId)}: {pct(s.share)} of its marks</span></li>
                  ))}
                </ul>
              ) : (
                <p class="rp-quiet">
                  {loading ? 'Adding up your marks…' : `A lesson becomes a strength at 85% or more of its marks across at least ${STAT_MIN_FOR_STRONG} of its questions, on any quiz or paper.`}
                </p>
              )}
            </section>
            <section class="rp-card rp-list-card" aria-labelledby="sp-workon">
              <h2 id="sp-workon" class="rp-card-title">Work on next</h2>
              {data.workOn.length || writingTrails ? (
                <ul class="rp-rows">
                  {data.workOn.map((w) => {
                    const row = workOnRow(w);
                    return (
                      <li key={`${w.why}-${w.lessonId}`} class="rp-row-item">
                        <Icon name="arrowRight" size={15} class="rp-link-icon" />
                        <a href={row.link}>{row.text}</a>
                      </li>
                    );
                  })}
                  {writingTrails ? (
                    <li class="rp-row-item rp-habit">
                      <Icon name="bulb" size={15} class="rp-hint-icon" />
                      <span>Writing R is costing more marks than reading it. A practice test with "Include writing R" on gives you more of those.</span>
                    </li>
                  ) : null}
                </ul>
              ) : <p class="rp-quiet">Nothing urgent. A mock final shows the whole unit at once.</p>}
            </section>
          </div>

          <Section id="sp-lessons" title="Lessons" note={<HeatLegend />}>
            {failed ? <p class="rp-quiet" role="alert">The questions could not be loaded, so marks per lesson are missing. Check your connection and reload the page.</p> : null}
            <div class="rp-card rp-flush">
              <div class="rp-table-wrap">
                <table class="rp-table sp-table">
                  <thead>
                    <tr>
                      <th scope="col">Lesson</th>
                      <th scope="col" class="n">Read</th>
                      <th scope="col" class="n">Quiz best</th>
                      <th scope="col" class="n" title="Every question from this lesson on any quiz, practice test or mock final">All marks</th>
                      <th scope="col" class="sp-col-last">Last quiz</th>
                      <th scope="col" class="rp-no-print"><span class="sr-only">Quiz</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lessons.map((l) => {
                      const meta = byId.get(l.lessonId);
                      return (
                        <tr key={l.lessonId}>
                          <th scope="row">
                            <a class="sp-lesson" href={href.lesson(l.lessonId)}>
                              <span class="sp-num num" aria-hidden="true">{meta?.num}</span>
                              <span>{meta?.title ?? l.lessonId}</span>
                            </a>
                          </th>
                          <td class="n">
                            {l.read ? <span class="sp-read" aria-label="Read"><Icon name="check" size={14} /></span> : <span class="rp-faint" aria-label="Not read">–</span>}
                          </td>
                          <td class="n">
                            <span class={`rp-heat heat h-${heatStep(l.quiz.best === null ? null : l.quiz.best / 100)}`}
                              aria-label={l.quiz.best === null ? 'Quiz not taken' : `Best quiz ${l.quiz.best}% over ${plural(l.quiz.attempts, 'attempt')}`}>
                              {l.quiz.best === null ? '–' : `${l.quiz.best}%`}
                            </span>
                          </td>
                          <MarksCell marks={l.marks} loading={loading} what="All marks" />
                          <td class="sp-col-last rp-muted rp-nowrap">{l.quiz.lastTs ? `${relativeDay(l.quiz.lastTs, now)} · ${l.quiz.last}%` : '–'}</td>
                          <td class="rp-no-print rp-nowrap"><a href={href.quiz(l.lessonId)}>{l.quiz.attempts ? 'Retake' : 'Take quiz'}</a></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section id="sp-kinds" title="Kinds of question" note="Across every quiz and paper">
            <div class="rp-card rp-flush">
              <div class="rp-table-wrap">
                <table class="rp-table sp-table">
                  <thead><tr><th scope="col">Kind</th><th scope="col" class="n">Marks</th><th scope="col">Answered</th></tr></thead>
                  <tbody>
                    {data.kinds.map((k) => (
                      <tr key={k.kind}>
                        <th scope="row">{STAT_KIND_LABEL[k.kind]}</th>
                        <MarksCell marks={k.marks} loading={loading} what={STAT_KIND_LABEL[k.kind]} />
                        <td class="rp-muted">{loading ? '…' : k.marks.answered ? plural(k.marks.answered, 'question') : 'none yet'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Section>

          <Section id="sp-papers" title="Papers">
            <div class="rp-duo">
              <section class="rp-card rp-pad sp-papers" aria-labelledby="sp-mocks">
                <h3 id="sp-mocks" class="rp-card-title sm">Mock finals</h3>
                <StatHistory history={mocks} empty="Not sat yet. The mock final is on the Exams page: 100 marks, two hours." />
              </section>
              <section class="rp-card rp-pad sp-papers" aria-labelledby="sp-practice">
                <h3 id="sp-practice" class="rp-card-title sm">Practice tests</h3>
                <StatHistory history={practices} empty="None yet. Build one from any lessons on the Exams page." lessonTitles />
              </section>
            </div>
          </Section>
        </>
      )}

      {ready ? <UnitElsewhere current="stat2402" /> : null}
    </div>
  );
}
