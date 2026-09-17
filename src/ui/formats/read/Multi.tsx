// Select all that apply. Graded by the set of picked option ids.
import { useState } from 'preact/hooks';
import type { FormatProps, GradeResult } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';
import { gradeMulti } from '../../../engine/grade.ts';
import { CodeBlock } from '../../components/CodeBlock.tsx';
import { asStringArray, isRecord } from './logic.ts';
import type { OptionRowProps } from './shared.tsx';
import { CheckBar, Label, Mark, OptionRow, OptionText, ReadFrame, useDraftState, visibility } from './shared.tsx';

type Q = QuestionOf<'multi'>;
interface MultiDraft { picks: string[] }

export function Multi(props: FormatProps<Q>) {
  return <MultiBody key={props.q.id} {...props} />;
}

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x) => b.includes(x));

function MultiBody(props: FormatProps<Q>) {
  const { q } = props;
  const ids = q.options.map((o) => o.id);
  const [draft, setDraft] = useDraftState<MultiDraft>(
    props.draft, props.onDraft,
    (d) => {
      const picks = isRecord(d) ? asStringArray(d.picks) : null;
      return picks ? { picks: ids.filter((id) => picks.includes(id)) } : null;
    },
    () => ({ picks: [] }),
  );
  const [checked, setChecked] = useState<{ picks: string[]; result: GradeResult } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const vis = visibility(props, checked !== null, submitted);
  const picks = draft.picks;
  const ready = picks.length > 0;
  const canCheck = ready && !vis.inputLocked && props.checksLeft > 0;

  const check = () => {
    if (!canCheck) return;
    const result = gradeMulti(q, picks);
    setChecked({ picks: picks.slice(), result });
    if (vis.testMode) setSubmitted(true);
    props.onCheck(result, { picks: picks.slice() });
  };

  const toggle = (id: string) => {
    if (vis.inputLocked) return;
    const next = picks.includes(id) ? picks.filter((x) => x !== id) : ids.filter((x) => x === id || picks.includes(x));
    setDraft({ picks: next });
  };

  // Per-option marks only once the answer is out (otherwise they would give the answer away).
  const markPicks = vis.full && vis.marks ? (checked?.picks ?? picks) : null;
  const stillChecked = checked !== null && sameSet(checked.picks, picks);
  let status = null;
  if (!vis.testMode && checked && (vis.full || stillChecked)) {
    const r = checked.result;
    status = <span><Mark ok={r.correct} />{!r.correct && r.score > 0 ? ' Partly right.' : null}</span>;
  }

  return (
    <ReadFrame
      kind="multi" onCheck={check}
      bar={
        <CheckBar
          vis={vis} revealed={props.revealed} locked={props.locked} checksLeft={props.checksLeft}
          ready={ready} notReadyText="Tick at least one first" missing={false} submitted={submitted}
          onCheck={check} status={status}
        />
      }
    >
      {q.code ? <CodeBlock code={q.code} numbered label="Code for this question" /> : null}
      <fieldset class="rf-fieldset">
        <Label as="legend">Select all that apply</Label>
        <div class="rf-opts">
          {q.options.map((o) => {
            let tone: OptionRowProps['tone'] = null;
            let mark: OptionRowProps['mark'] = null;
            let open = false;
            if (markPicks) {
              const picked = markPicks.includes(o.id);
              if (picked && o.correct) { tone = 'ok'; mark = { ok: true, label: 'Right pick' }; }
              else if (picked) { tone = 'bad'; mark = { ok: false, label: 'Wrong pick' }; open = true; }
              else if (o.correct) { tone = 'missed'; mark = { ok: false, label: 'Missed' }; open = true; }
              else { mark = { ok: true, label: 'Left out', quiet: true }; }
            }
            return (
              <OptionRow
                key={o.id} type="checkbox" value={o.id}
                checked={picks.includes(o.id)} disabled={vis.inputLocked}
                onChange={() => toggle(o.id)}
                tone={tone} mark={mark}
                why={markPicks && open ? o.why : null}
                whyToggle={markPicks && !open ? o.why : null}
              >
                <OptionText text={o.text} />
              </OptionRow>
            );
          })}
        </div>
      </fieldset>
    </ReadFrame>
  );
}
