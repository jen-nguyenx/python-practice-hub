// Project build (#/build/:scenarioId): one project, built in the order you would actually build it.
//
// Every piece of this already existed as a separate question, which is exactly how a student ends up
// writing main() first and finding the decomposition afterwards. The stages put them back in order, say
// why the order is the order, and hand the coding itself to the question page — which already has the
// editor, the tests and the hints, and does not need reimplementing here.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href, navigate } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { RULE_IDS } from '../../content/ids.ts';
import type { RuleId, TopicId } from '../../content/ids.ts';
import { loadTopic } from '../../content/index.ts';
import type { Scenario } from '../../content/schema.ts';
import { TOPICS } from '../../content/topics.ts';
import { buildProgress, projectBuild, solvedIds } from '../../engine/projectBuild.ts';
import type { BuildStage, ProjectBuild as Build } from '../../engine/projectBuild.ts';
import { Button, LinkButton } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { setQuestionReturn } from '../workbench/questionReturn.ts';
import { storeReady } from '../shell/storeReady.ts';
import './projectBuild.css';

/** What each rule means to a marker, in the words of the brief rather than the code. */
const RULE_TEXT: Record<RuleId, string> = {
  noImport: 'No import of any kind — not even math or csv',
  noInput: 'No input(): the data comes from the file, not the person',
  noPrint: 'No print(): return the answer instead of showing it',
  roundAtEnd: 'Full precision while calculating, rounded only into the result',
  noCsvExt: 'Open the file name exactly as given; never add or assume .csv',
  noLoops: 'No loops where the task forbids them',
  mainSignature: 'main() named and shaped exactly as the brief says',
};

function StageRail({ stages, at, go, solved }: {
  stages: readonly BuildStage[]; at: number; go: (i: number) => void; solved: ReadonlySet<string>;
}) {
  return (
    <nav class="pb-rail" aria-label="Stages">
      <ol>
        {stages.map((s, i) => {
          const done = s.qid ? solved.has(s.qid) : i < at;
          return (
            <li key={`${s.kind}-${i}`}>
              <button
                type="button"
                class={`pb-step${i === at ? ' is-current' : ''}${done ? ' is-done' : ''}`}
                aria-current={i === at ? 'step' : undefined}
                onClick={() => go(i)}
              >
                <span class="pb-step-n" aria-hidden="true">{done ? <Icon name="check" size={11} /> : i + 1}</span>
                <span class="pb-step-l">{s.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function ProjectBuild({ scenarioId }: { scenarioId: string }) {
  const ready = storeReady.value;
  const events = store.events.value;
  const [found, setFound] = useState<{ build: Build; scenario: Scenario } | null | 'missing'>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let alive = true;
    // The scenario id carries its topic ("t12-s1"), but only by convention, so every topic is asked.
    Promise.all(TOPICS.map(async (t) => {
      try {
        const topic = await loadTopic(t.id);
        const scenario = topic.scenarios.find((s) => s.id === scenarioId);
        return scenario ? { scenario, topicId: t.id as TopicId } : null;
      } catch {
        return null;
      }
    })).then((all) => {
      if (!alive) return;
      const hit = all.find(Boolean);
      const build = hit ? projectBuild(hit.scenario, hit.topicId) : null;
      setFound(build && hit ? { build, scenario: hit.scenario } : 'missing');
    });
    return () => { alive = false; };
  }, [scenarioId]);

  const solved = useMemo(() => (ready ? solvedIds(events) : new Set<string>()), [ready, events]);

  // Open on the first thing still to do, so coming back lands where the work is.
  const [landed, setLanded] = useState(false);
  useEffect(() => {
    if (landed || !found || found === 'missing' || !ready) return;
    setAt(buildProgress(found.build, solved).nextIndex);
    setLanded(true);
  }, [found, ready, solved, landed]);

  if (found === null) return <div class="pb"><Skeleton h={80} /><Skeleton h={220} /></div>;

  if (found === 'missing') {
    return (
      <div class="pb">
        <section class="pb-card">
          <h1 class="pb-h1">No project here</h1>
          <p class="pb-blurb">That project could not be found. The project topics list the ones there are.</p>
          <LinkButton href={href.topic('project-simulator')} variant="primary">Open Project sim</LinkButton>
        </section>
      </div>
    );
  }

  const { build } = found;
  const progress = buildProgress(build, solved);
  const stage = build.stages[at];
  const done = stage.qid ? solved.has(stage.qid) : false;

  const openQuestion = (qid: string) => {
    setQuestionReturn({ href: `#/build/${build.scenarioId}`, label: 'the build' });
    navigate(href.question(qid));
  };

  return (
    <div class="pb">
      <header class="pb-top">
        <p class="pb-eyebrow">Project build</p>
        <h1 class="pb-h1">{build.title}</h1>
        <p class="pb-count num">{progress.done} of {progress.total} written</p>
      </header>

      <StageRail stages={build.stages} at={at} go={setAt} solved={solved} />

      <section class="pb-card" aria-labelledby="pb-stage">
        <h2 class="pb-h2" id="pb-stage">{stage.title}</h2>
        <p class="pb-blurb">{stage.blurb}</p>

        {stage.kind === 'brief' ? (
          <>
            <Markdown text={build.story} class="pb-md" terms />
            <ul class="pb-rules">
              {build.rules.length > 0
                ? build.rules.map((r) => <li key={r}><Icon name="alert" size={14} />{RULE_TEXT[r]}</li>)
                : RULE_IDS.slice(0, 5).map((r) => <li key={r}><Icon name="alert" size={14} />{RULE_TEXT[r]}</li>)}
            </ul>
          </>
        ) : null}

        {stage.kind === 'plan' ? (
          <ol class="pb-plan">
            {build.stages.filter((s) => s.qid).map((s) => (
              <li key={s.qid}>
                <span class="pb-plan-k">{s.kind === 'assemble' ? 'Last' : 'First'}</span>
                <span>{s.title}</span>
              </li>
            ))}
          </ol>
        ) : null}

        {stage.qid ? (
          <div class={`pb-task${done ? ' is-done' : ''}`}>
            <p class="pb-task-state">
              <Icon name={done ? 'check' : 'file'} size={15} />
              {done ? 'Written and passing' : 'Not written yet'}
            </p>
            <Button variant={done ? 'secondary' : 'primary'} onClick={() => openQuestion(stage.qid as string)}>
              {done ? 'Open it again' : 'Write it'}<Icon name="arrowRight" size={16} />
            </Button>
          </div>
        ) : null}

        {stage.kind === 'check' ? (
          <>
            <ul class="pb-rules">
              {(build.rules.length > 0 ? build.rules : RULE_IDS.slice(0, 5)).map((r) => (
                <li key={r} class={progress.done === progress.total ? 'is-ok' : ''}>
                  <Icon name={progress.done === progress.total ? 'check' : 'circle'} size={14} />
                  {RULE_TEXT[r]}
                </li>
              ))}
            </ul>
            <p class="pb-note">
              {progress.done === progress.total
                ? 'Every piece passed its tests, and the tests enforce these rules — a solution that broke one would not have passed. The same rules apply to the project you hand in.'
                : 'These are checked by the tests as you go. Finish the pieces above and they are all accounted for.'}
            </p>
          </>
        ) : null}
      </section>

      <footer class="pb-nav">
        <Button variant="ghost" disabled={at === 0} onClick={() => setAt(at - 1)}>
          <Icon name="chevronLeft" size={14} />Back
        </Button>
        <span class="spacer" />
        {at < build.stages.length - 1 ? (
          <Button variant="primary" onClick={() => setAt(at + 1)}>Next<Icon name="chevronRight" size={14} /></Button>
        ) : (
          <LinkButton href={href.topic(build.topicId)} variant="secondary">Back to the topic</LinkButton>
        )}
      </footer>
    </div>
  );
}
