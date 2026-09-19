// Decode an error (#/error): paste what Python said and get it back in plain words.
//
// The app already explains an error when code is run here. This is for the rest of a student's life: an
// error from a lab machine, a friend's screenshot, a past paper. Nothing is sent anywhere, because the
// whole catalogue is already in the page.
import { useMemo, useState } from 'preact/hooks';
import { href } from '../../app/router.ts';
import { QUESTION_INDEX } from '../../content/loadIndex.ts';
import { LESSON_FOR_TOPIC } from '../../content/lessons/index.ts';
import { explainError, MISTAKES, matchError } from '../../content/mistakes.ts';
import type { MistakeId } from '../../content/ids.ts';
import { TOPIC_BY_ID } from '../../content/topics.ts';
import { inOwnCode, parseTraceback } from '../../engine/traceback.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import './decode.css';

const SAMPLES = [
  "TypeError: can only concatenate str (not \"int\") to str",
  "NameError: name 'avarage' is not defined",
  'IndexError: list index out of range',
  "KeyError: 'Perth'",
  'SyntaxError: invalid syntax. Perhaps you forgot a comma?',
  "AttributeError: 'NoneType' object has no attribute 'append'",
];

/**
 * Where to learn this, from the topics whose questions are built to catch this mistake. Matching lesson
 * text on keywords from the mistake's name looked plausible and was not: "joining text and numbers"
 * shares the word "numbers" with half the library, so it offered a lesson on decisions for a TypeError.
 */
function lessonsFor(mistake: MistakeId): { id: string; title: string }[] {
  const topics: string[] = [];
  for (const q of QUESTION_INDEX) {
    if (q.detects.includes(mistake) && !topics.includes(q.topicId)) topics.push(q.topicId);
  }
  const out: { id: string; title: string }[] = [];
  for (const t of topics) {
    const l = LESSON_FOR_TOPIC[t];
    if (l && !out.some((x) => x.id === l.id)) out.push({ id: l.id, title: l.title });
    if (out.length === 2) break;
  }
  return out;
}

export function DecodeError() {
  const [text, setText] = useState('');
  const parsed = useMemo(() => parseTraceback(text), [text]);
  const explanation = useMemo(() => (parsed ? explainError(parsed) : null), [parsed]);
  const mistakes = useMemo(() => (parsed ? matchError(parsed).slice(0, 3) : []), [parsed]);

  return (
    <div class="de">
      <header class="de-top">
        <h1 class="de-h1">Decode an error</h1>
        <p class="de-lede">
          Paste what Python said — the whole traceback, or just the last line — and get it back in plain
          words. It never leaves this page.
        </p>
      </header>

      <label class="de-field">
        <span class="sr-only">The error Python gave you</span>
        <textarea
          class="de-input"
          rows={6}
          spellcheck={false}
          placeholder={'Traceback (most recent call last):\n  File "marks.py", line 12, in <module>\n    total = total + row[2]\nTypeError: can only concatenate str (not "int") to str'}
          value={text}
          onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)}
        />
      </label>

      {text.trim() === '' ? (
        <section class="de-samples">
          <p class="de-samples-h">Or try one of these</p>
          <div class="de-chips">
            {SAMPLES.map((s) => (
              <button key={s} type="button" class="de-chip" onClick={() => setText(s)}>{s}</button>
            ))}
          </div>
        </section>
      ) : !parsed ? (
        <div class="de-none">
          <p><strong>That does not look like a Python error.</strong></p>
          <p>
            Look for the last line of what Python printed. It is the one that names a type, like
            <code> TypeError</code> or <code>NameError</code>, followed by a colon.
          </p>
        </div>
      ) : (
        <div class="de-out">
          <article class="de-card">
            <p class="de-kind num">
              <span class="de-type">{parsed.type}</span>
              {parsed.line ? <span>line {parsed.line}</span> : null}
              {parsed.file ? <span>{parsed.file}</span> : null}
            </p>
            <h2 class="de-title">{explanation?.title ?? parsed.type}</h2>
            {explanation ? <Markdown text={explanation.meaning} class="de-md" /> : null}
            {explanation?.fix ? (
              <div class="de-fix">
                <p class="de-fix-t">What to check</p>
                <Markdown text={explanation.fix} class="de-md" />
              </div>
            ) : null}
            {parsed.file && !inOwnCode(parsed.file) ? (
              <p class="de-note">
                That last line is inside a library, not your program. Read <strong>up</strong> the traceback to
                the last file that is yours: the value you passed in is almost always the cause.
              </p>
            ) : null}
          </article>

          {mistakes.length > 0 ? (
            <section class="de-causes">
              <h2 class="de-causes-h">What usually causes this</h2>
              {mistakes.map((id) => {
                const def = MISTAKES[id];
                if (!def) return null;
                const qs = QUESTION_INDEX.filter((q) => q.detects.includes(id)).slice(0, 1);
                const lessons = lessonsFor(id);
                return (
                  <article key={id} class="de-cause">
                    <h3 class="de-cause-h">{def.label}</h3>
                    <Markdown text={def.explain} class="de-md" />
                    <p class="de-links">
                      {lessons.map((l) => (
                        <a key={l.id} class="de-link" href={href.lesson(l.id)}>
                          <Icon name="book" size={13} />{l.title}
                        </a>
                      ))}
                      {qs.map((q) => (
                        <a key={q.qid} class="de-link" href={href.question(q.qid)}>
                          <Icon name="file" size={13} />Practise it{TOPIC_BY_ID[q.topicId] ? ` in ${TOPIC_BY_ID[q.topicId].short}` : ''}
                        </a>
                      ))}
                    </p>
                  </article>
                );
              })}
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
