// Problems: syntax errors and style/logic warnings in plain words. They never change the score.
import type { RuleId } from '../../content/ids.ts';
import type { AstFinding, PyError } from '../../runtime/protocol.ts';
import { Icon } from '../components/Icon.tsx';
import { Markdown } from '../components/Markdown.tsx';
import { FLAG_TEXT, warningFlags } from './plain.ts';
import './workbench.css';

export interface ProblemsListProps {
  syntaxError?: PyError | null;
  flags?: readonly AstFinding[];
  ruleViolations?: readonly { rule: RuleId; line: number; message: string }[];
  compact?: boolean;
}

export function problemCount(p: ProblemsListProps) {
  return (p.syntaxError ? 1 : 0) + warningFlags(p.flags).length + (p.ruleViolations?.length ?? 0);
}

export function ProblemsList({ syntaxError, flags, compact }: ProblemsListProps) {
  const warns = warningFlags(flags);
  if (!syntaxError && warns.length === 0) {
    return compact ? null : <p class="problems-empty"><Icon name="check" size={14} /> No problems found.</p>;
  }
  return (
    <div class={`problems${compact ? ' compact' : ''}`}>
      <ul class="problems-list">
        {syntaxError ? (
          <li class="problem error">
            <span class="problem-icon"><Icon name="x" size={14} label="Error" /></span>
            <span class="problem-line">{syntaxError.line ? `Line ${syntaxError.line}` : 'Code'}</span>
            <span class="problem-text">
              Python cannot read this code: <code>{syntaxError.type}: {syntaxError.message}</code>
            </span>
          </li>
        ) : null}
        {warns.map((f, i) => (
          <li key={`${f.flag}-${f.line}-${i}`} class="problem warning">
            <span class="problem-icon"><Icon name="alert" size={14} label="Warning" /></span>
            <span class="problem-line">Line {f.line}</span>
            <span class="problem-text"><Markdown text={FLAG_TEXT[f.flag] ?? ''} /></span>
          </li>
        ))}
      </ul>
      {compact ? null : <p class="problems-note">Warnings are advice and do not change your score.</p>}
    </div>
  );
}
