// CITS1401 project/exam rule violations with their marking consequence.
import type { RuleId } from '../../content/ids.ts';
import { Icon } from '../components/Icon.tsx';
import { RULE_TEXT } from './plain.ts';
import './workbench.css';

export function RuleViolations({ violations }: { violations: readonly { rule: RuleId; line: number; message: string }[] }) {
  if (!violations.length) return null;
  return (
    <div class="rules" role="region" aria-label="Rule violations">
      <p class="rules-head"><Icon name="alert" /> <strong>{violations.length === 1 ? '1 rule broken' : `${violations.length} rules broken`}</strong></p>
      <ul class="rules-list">
        {violations.map((v, i) => {
          const t = RULE_TEXT[v.rule];
          return (
            <li key={`${v.rule}-${v.line}-${i}`}>
              <div><strong>{t?.name ?? v.rule}</strong>{v.line ? <span class="muted"> · line {v.line}</span> : null}</div>
              {v.message ? <div>{v.message}</div> : null}
              {t ? <div class="rules-consequence">In marking: {t.consequence}</div> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function RulesList({ rules }: { rules: readonly RuleId[] }) {
  if (!rules.length) return null;
  return (
    <div class="rules-given">
      <h3 class="label">Rules for this question</h3>
      <ul>
        {rules.map((r) => <li key={r}>{RULE_TEXT[r]?.name ?? r}</li>)}
      </ul>
    </div>
  );
}
