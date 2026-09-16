// STUB format component. Replaced by the read-formats agent. Keep the export name and props type.
import type { FormatProps } from '../../../engine/types.ts';
import type { QuestionOf } from '../../../content/schema.ts';

export function Multi(props: FormatProps<QuestionOf<'multi'>>) {
  return <div class="empty-state">Multi format is being built ({props.q.id}).</div>;
}
