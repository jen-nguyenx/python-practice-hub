// CITS1401 readiness: mid-sem practice results, paper-style accuracy, recursion accuracy, project rules checklist.
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
    <div class="rp-ready">
      <div class="rp-ready-grid">
        {showMidsem ? (
          <div class="rp-ready-tile">
            <span class="label">Mid-sem practice test</span>
            {data.midsem.attempts > 0 ? (
              <>
                <p class="rp-ready-big num">{pct(data.midsem.best)} <span class="rp-ready-sub">best</span></p>
                <p class="muted num">Last {pct(data.midsem.last)} · {plural(data.midsem.attempts, 'attempt')}</p>
              </>
            ) : <p class="rp-ready-big muted">Not taken</p>}
            <a href={href.midsem()}>{data.midsem.attempts > 0 ? 'Take another practice test' : 'Take a practice test'}</a>
          </div>
        ) : null}
        <div class="rp-ready-tile">
          <span class="label">Paper-style questions</span>
          <p class={`rp-ready-big num${data.paperAccuracy === null ? ' muted' : ''}`}>{data.paperAccuracy === null ? 'None yet' : pct(data.paperAccuracy)}</p>
          <p class="muted">Exam-style coding with no Run button, like the closed-book final.</p>
        </div>
        {showRecursion ? (
          <div class="rp-ready-tile">
            <span class="label">Recursion</span>
            <p class={`rp-ready-big num${data.recursionAccuracy === null ? ' muted' : ''}`}>{data.recursionAccuracy === null ? 'None yet' : pct(data.recursionAccuracy)}</p>
            <p class="muted">Recent final exams all include a recursion question where loops are not allowed.</p>
            {topicId !== 'recursion' ? <a href={href.topic('recursion')}>Practise recursion</a> : null}
          </div>
        ) : null}
      </div>

      <div class="rp-rules">
        <h3>Project rules checklist</h3>
        {rules.length === 0 ? (
          <p class="muted">No project-style answers checked against the rules yet. Project questions are in Files and CSV, Project rules and Project simulator.</p>
        ) : (
          <div class="rp-table-wrap">
            <table class="rp-table">
              <caption class="sr-only">How often each project rule was followed or broken</caption>
              <thead>
                <tr>
                  <th scope="col">Rule</th>
                  <th scope="col" class="n">Followed</th>
                  <th scope="col" class="n">Broken</th>
                  <th scope="col">Result</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.rule}>
                    <th scope="row">
                      <span class="rp-rule-title">{RULE_LABEL[r.rule]?.title ?? r.rule}</span>
                      <span class="rp-rule-why faint">{RULE_LABEL[r.rule]?.why}</span>
                    </th>
                    <td class="n num">{r.ok}</td>
                    <td class="n num">{r.broken}</td>
                    <td class="rp-nowrap">
                      {r.broken > 0
                        ? <span class="rp-rule bad"><Icon name="x" size={13} /> Broken {r.broken === 1 ? 'once' : `${r.broken} times`}</span>
                        : <span class="rp-rule ok"><Icon name="check" size={13} /> Followed every time</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rules.length > 0 && unchecked > 0 ? <p class="faint">{plural(unchecked, 'rule')} not checked yet in this range.</p> : null}
      </div>
    </div>
  );
}
