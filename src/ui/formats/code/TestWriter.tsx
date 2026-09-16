// STUB format component. Replaced by the workbench agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function TestWriter(props: FormatProps<QuestionOf<'testWriter'>>) {
  return <div class="empty-state">TestWriter format is being built ({props.q.id}).</div>;
}
