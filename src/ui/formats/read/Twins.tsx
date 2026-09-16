// STUB format component. Replaced by the read-formats agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function Twins(props: FormatProps<QuestionOf<'twins'>>) {
  return <div class="empty-state">Twins format is being built ({props.q.id}).</div>;
}
