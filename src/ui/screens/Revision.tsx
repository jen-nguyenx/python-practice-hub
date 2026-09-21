// Revision pack (#/revision): everything worth having on paper, in one printable page.
//
// The final is closed-book and written by hand, so revision happens on paper — and the cheat sheets were
// spread one per topic, thirteen visits and thirteen print dialogs away from being usable. This is all of
// them in ladder order, the best-practice cards after them, and the student's own weak skills at the top,
// which is the part a generic PDF from anywhere else could never have.
import { useEffect, useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { store } from '../../app/services.ts';
import { loadTopic } from '../../content/index.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { conceptLabel } from '../../content/conceptWords.ts';
import { PATTERNS } from '../../content/patterns.ts';
import { TOPICS } from '../../content/topics.ts';
import { conceptStats, weakConcepts } from '../../engine/concepts.ts';
import { Button } from '../components/Button.tsx';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { Skeleton } from '../components/Skeleton.tsx';
import { storeReady } from '../shell/storeReady.ts';
import './revision.css';

interface Sheet { id: string; num: string; title: string; cheatsheet: string }

export function Revision() {
  const ready = storeReady.value;
  const events = store.events.value;
  const [sheets, setSheets] = useState<Sheet[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    // Every topic's chunk: the pack is the whole ladder by definition.
    Promise.all(TOPICS.map(async (t) => {
      const topic = await loadTopic(t.id);
      return { id: t.id, num: t.num, title: t.title, cheatsheet: topic.cheatsheet ?? '' };
    }))
      .then((all) => { if (alive) setSheets(all.filter((s) => s.cheatsheet.trim())); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);

  const weak = useMemo(
    () => (ready ? weakConcepts(conceptStats(events, QUESTION_INDEX), 8) : []),
    [ready, events],
  );

  if (failed) {
    return (
      <div class="rv-pack">
        <p class="rvp-error" role="alert">
          <Icon name="alert" size={15} />The cheat sheets could not be loaded. Check your connection and try again.
        </p>
      </div>
    );
  }

  return (
    <div class="rv-pack">
      <header class="rvp-top rvp-no-print">
        <h1 class="rvp-h1">Revision pack</h1>
        <p class="rvp-lede">
          Every cheat sheet, the best-practice cards, and whatever is still shaky for you — one page, made
          to be printed. The final is closed book and written by hand, so this is for the desk, not the
          screen.
        </p>
        <div class="rvp-actions">
          <Button variant="primary" onClick={() => window.print()}>
            <Icon name="download" size={15} />Print or save as PDF
          </Button>
          <a class="rvp-link" href={href.plan()}>Back to the run-in</a>
        </div>
      </header>

      <p class="rvp-print-head rvp-print-only">PyLadder revision pack · CITS1401</p>

      {weak.length > 0 ? (
        <section class="rvp-sec rvp-weak" aria-labelledby="rvp-weak-h">
          <h2 class="rvp-h2" id="rvp-weak-h">Still shaky for you</h2>
          <p class="rvp-note">From the questions you have answered. Worth a second look before the rest.</p>
          <ul class="rvp-weak-list">
            {weak.map((w) => (
              <li key={w.concept}>
                <span class="rvp-weak-name">{conceptLabel(w.concept)}</span>
                <span class="rvp-weak-num num">{w.solved} of {w.attempted}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sheets === null ? (
        <div class="rvp-loading rvp-no-print"><Skeleton h={160} /><Skeleton h={160} /></div>
      ) : (
        sheets.map((s) => (
          <section key={s.id} class="rvp-sec rvp-sheet" aria-labelledby={`rvp-${s.id}`}>
            <h2 class="rvp-h2" id={`rvp-${s.id}`}>
              <span class="rvp-num num">{s.num}</span> {s.title}
            </h2>
            <Markdown text={s.cheatsheet} class="rvp-md" />
          </section>
        ))
      )}

      <section class="rvp-sec" aria-labelledby="rvp-patterns">
        <h2 class="rvp-h2" id="rvp-patterns">Ways of writing it that mark well</h2>
        <ul class="rvp-patterns">
          {PATTERNS.map((p) => (
            <li key={p.id}>
              <span class="rvp-pat-title">{p.title}</span>
              <Markdown text={p.why} class="rvp-md rvp-pat-why" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
