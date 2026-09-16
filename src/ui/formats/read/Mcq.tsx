// STUB format component. Replaced by the read-formats agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function Mcq(props: FormatProps<QuestionOf<'mcq'>>) {
  return <div class="empty-state">Mcq format is being built ({props.q.id}).</div>;
}
