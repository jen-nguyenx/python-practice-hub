// STUB format component. Replaced by the workbench agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function FixBug(props: FormatProps<QuestionOf<'fixBug'>>) {
  return <div class="empty-state">FixBug format is being built ({props.q.id}).</div>;
}
