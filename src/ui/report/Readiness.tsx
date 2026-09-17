// Readiness card: mid-sem practice results, paper-style accuracy and recursion as three figures,
// then the project rules checklist (check in ink when followed, cross in red when broken).
import type { TopicId } from '../../content/ids.ts';
import type { ReportData } from '../../engine/report.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { pct, plural } from './format.ts';
import { RULE_LABEL } from './words.ts';

export function Readiness({ data, topicId }: { data: ReportData['readiness']; topicId?: TopicId }) {
  const showMidsem = !topicId;
  const showRecursion = !topicId || topicId === 'recursion';
  const rules = data.projectRules.filter((r) => r.ok + r.broken > 0);
  const unchecked = data.projectRules.length - rules.length;

  return (
    <div class="rp-card rp-flush">
      <div class="rp-figures">
        {showMidsem ? (
          <div class="rp-figure">
            <span class="rp-figure-label">Mid-sem practice test</span>
            {data.midsem.attempts > 0 ? (
              <>
                <span class="rp-figure-num">{pct(data.midsem.best)} <span class="rp-figure-unit">best</span></span>
                <span class="rp-figure-sub">Last {pct(data.midsem.last)} · {plural(data.midsem.attempts, 'attempt')}</span>
              </>
            ) : (
              <>
                <span class="rp-figure-num is-empty">Not taken</span>
                <span class="rp-figure-sub">15 questions, timed, no hints</span>
              </>
            )}
            <a class="rp-figure-link" href={href.midsem()}>{data.midsem.attempts > 0 ? 'Take another' : 'Take the test'}</a>
          </div>
        ) : null}
        <div class="rp-figure">
          <span class="rp-figure-label">Paper-style questions</span>
          <span class={`rp-figure-num${data.paperAccuracy === null ? ' is-empty' : ''}`}>{data.paperAccuracy === null ? 'None yet' : pct(data.paperAccuracy)}</span>
          <span class="rp-figure-sub">No Run button, like the final exam</span>
        </div>
        {showRecursion ? (
          <div class="rp-figure">
            <span class="rp-figure-label">Recursion</span>
            <span class={`rp-figure-num${data.recursionAccuracy === null ? ' is-empty' : ''}`}>{data.recursionAccuracy === null ? 'None yet' : pct(data.recursionAccuracy)}</span>
            <span class="rp-figure-sub">Every recent final has one</span>
            {topicId !== 'recursion' ? <a class="rp-figure-link" href={href.topic('recursion')}>Practise recursion</a> : null}
          </div>
        ) : null}
      </div>

      <div class="rp-rules">
        <h3 class="rp-card-title sm">Project rules</h3>
        {rules.length === 0 ? (
          <p class="rp-quiet">Not checked yet. Project questions are in Files and CSV, Project rules and Project simulator.</p>
        ) : (
          <ul class="rp-rule-list" aria-label="How often each project rule was followed or broken">
            {rules.map((r) => {
              const broken = r.broken > 0;
              return (
                <li key={r.rule} class={`rp-rule${broken ? ' bad' : ' ok'}`}>
                  <span class="rp-rule-icon" aria-hidden="true"><Icon name={broken ? 'x' : 'check'} size={14} /></span>
                  <span class="rp-rule-text">
                    <span class="rp-rule-title">{RULE_LABEL[r.rule]?.title ?? r.rule}</span>
                    <span class="rp-rule-why">{RULE_LABEL[r.rule]?.why}</span>
                  </span>
                  <span class="rp-rule-result">
                    {broken ? `Broken ${r.broken === 1 ? 'once' : `${r.broken} times`}` : 'Followed'}
                    <span class="rp-rule-count"> · {r.ok} of {r.ok + r.broken}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {rules.length > 0 && unchecked > 0 ? <p class="rp-faint rp-rules-note">{plural(unchecked, 'rule')} not checked yet in this range.</p> : null}
      </div>
    </div>
  );
}
