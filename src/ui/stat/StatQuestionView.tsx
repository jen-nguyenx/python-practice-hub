// One STAT2402 exam question, for answering or, once marked, for review.
//
// Nothing here decides what R does. The output under a question's code is what R printed when the verifier
// ran it; a number question's right answer and a predict question's right output are the verifier's too.
// This file lays them out and remembers what the student picked or typed.
import type { StatAnswer, StatItem } from '../../engine/statExam.ts';
import { correctAnswer, displayOrder } from '../../engine/statExam.ts';
import { STAT_KIND_LABEL } from '../../content/statQuestionSchema.ts';
import { normOutput } from '../../runtime/r/driver.ts';
import { CodeBlock } from '../components/CodeBlock.tsx';
import { CodeLang } from '../components/codeLang.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { CodeEditor } from '../editor/CodeEditor.tsx';

/** What marking found, for the review. `earned` is null when the question could not be marked. */
export interface StatReview { earned: number | null; tests?: { passed: number; total: number } }

function ROutput({ stdout, error }: { stdout?: string; error?: { message: string } }) {
  const text = (stdout ?? '').replace(/\n$/, '');
  if (!text && !error) return <p class="lb-out is-quiet">R prints nothing here.</p>;
  return (
    <div class="lb-out" role="group" aria-label="What R printed">
      <pre><code>
        {text ? text.split('\n').map((l, i) => <span key={i} class="lb-out-line">{l || ' '}{'\n'}</span>) : null}
        {error ? <span class="lb-out-line is-error">{error.message}{'\n'}</span> : null}
      </code></pre>
    </div>
  );
}

export function StatQuestionView({ item, number, answer, onAnswer, review }: {
  item: StatItem;
  /** 1-based position in the test. */
  number: number;
  answer?: StatAnswer;
  onAnswer?: (a: StatAnswer) => void;
  review?: StatReview;
}) {
  const { q, gen } = item;
  const locked = review !== undefined || !onAnswer;
  const right = review ? correctAnswer(item) : null;
  // A predict question's output is its answer, so it is only shown once the test is marked.
  const showOutput = q.kind === 'choice' ? q.code !== undefined : q.kind === 'number' || (q.kind === 'predict' && review !== undefined);

  return (
    <CodeLang.Provider value="r">
      <div class="sq" data-qid={q.id}>
        <p class="sq-meta">
          <span>Question {number}</span>
          <span>{STAT_KIND_LABEL[q.kind]}</span>
          <span>{item.marks} {item.marks === 1 ? 'mark' : 'marks'}</span>
        </p>
        <Markdown text={q.prompt} class="lb-md sq-prompt" />

        {q.kind !== 'write' && 'code' in q && q.code ? (
          <div class="sq-code">
            <CodeBlock code={q.code} numbered label="The R code" />
            {showOutput && gen ? <ROutput stdout={gen.stdout} error={gen.error} /> : null}
          </div>
        ) : null}

        {q.kind === 'choice' || q.kind === 'predict' ? (
          <ul class="ib-options" role="radiogroup" aria-label="Choose one">
            {displayOrder(q).map((text) => {
              const picked = answer && 'picked' in answer && answer.picked === text;
              const isRight = review && right !== null && (q.kind === 'predict' ? normOutput(text) === right : text === right);
              return (
                <li key={text}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!!picked}
                    class={`ib-option${picked ? ' is-picked' : ''}${isRight ? ' is-right' : ''}${review && picked && !isRight ? ' is-wrong' : ''}`}
                    disabled={locked}
                    onClick={() => onAnswer?.({ kind: q.kind, picked: text })}
                  >
                    <span class={`ib-option-t${q.kind === 'predict' ? ' mono' : ''}`}>{text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {q.kind === 'number' ? (
          <label class="ib-field sq-number">
            <span class="ib-field-l">Your answer</span>
            <span class="sq-number-row">
              <input
                class="ib-input sq-number-in"
                inputMode="decimal"
                autocomplete="off"
                spellcheck={false}
                value={answer && 'typed' in answer ? answer.typed : ''}
                disabled={locked}
                onInput={(e) => onAnswer?.({ kind: 'number', typed: (e.currentTarget as HTMLInputElement).value })}
              />
              {q.unit ? <span class="sq-unit">{q.unit}</span> : null}
            </span>
          </label>
        ) : null}

        {q.kind === 'write' ? (
          review ? (
            <div class="sq-write-review">
              <p class="ib-field-l">Your code</p>
              <CodeBlock code={answer && 'code' in answer ? answer.code : q.starter} numbered label="Your code" />
            </div>
          ) : (
            <div class="ib-field">
              <span class="ib-field-l">{q.run === 'function' && q.fnName ? `Your ${q.fnName}()` : 'Your code'}</span>
              <CodeEditor
                value={answer && 'code' in answer ? answer.code : q.starter}
                onChange={(code) => onAnswer?.({ kind: 'write', code })}
                language="r"
                minHeight={140}
                maxHeight={420}
                ariaLabel={`Your R code for question ${number}`}
              />
              <p class="sq-hint">Marked by running tests in R when you finish, so it must define {q.run === 'function' && q.fnName ? `${q.fnName}()` : 'what the question asks for'}.</p>
            </div>
          )
        ) : null}

        {review ? (
          <div class={`sq-review${review.earned !== null && review.earned >= item.marks ? ' is-right' : ''}`}>
            <p class="sq-verdict">
              <Icon name={review.earned !== null && review.earned >= item.marks ? 'check' : review.earned ? 'dot' : 'x'} size={14} />
              {review.earned === null
                ? 'Not marked: this question\'s recorded answer is missing.'
                : `${review.earned} of ${item.marks} ${item.marks === 1 ? 'mark' : 'marks'}`}
              {review.tests ? <span class="sq-tests"> · {review.tests.passed} of {review.tests.total} tests passed</span> : null}
            </p>
            {q.kind === 'number' && right !== null ? (
              <p class="sq-right">R's answer: <b class="num">{right}</b>{q.unit ? ` ${q.unit}` : ''}</p>
            ) : null}
            {q.kind === 'write' ? (
              <div class="sq-solution">
                <p class="ib-field-l">One way to do it</p>
                <CodeBlock code={q.solution} numbered label="A worked answer" />
              </div>
            ) : null}
            <Markdown text={q.explain} class="lb-md sq-explain" />
          </div>
        ) : null}
      </div>
    </CodeLang.Provider>
  );
}
