// STUB format component. Replaced by the workbench agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function Cloze(props: FormatProps<QuestionOf<'cloze'>>) {
  return <div class="empty-state">Cloze format is being built ({props.q.id}).</div>;
}
