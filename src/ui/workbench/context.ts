// Context the question page gives format components: whether the page shows the answer itself, and slots the
// page fills (the result card and the hint controls) so formats can place them inside their own layout.
import type { ComponentChildren } from 'preact';
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export interface WorkbenchContextValue {
  /** Kept for callers that still pass it; the question page has one layout. */
  layout: 'simple' | 'full';
  /** True when the page itself shows the answer (explanation + model code) once revealed. */
  pageShowsAnswer: boolean;
  onCursor?: (line: number, col: number) => void;
  /** Formats fill a fixed-height pane. The redesigned question page scrolls normally, so this stays false. */
  fill?: boolean;
  /** Question page only: the result card, placed by code formats between their editor and tests cards. */
  resultSlot?: ComponentChildren;
  /** Question page only: hint controls for a format's own bottom bar (Parsons). */
  helpSlot?: ComponentChildren;
  /** Question page only: the page renders title, prompt and example itself. */
  onQuestionPage?: boolean;
}

export const WorkbenchContext = createContext<WorkbenchContextValue>({ layout: 'simple', pageShowsAnswer: false });

export function useWorkbench() {
  return useContext(WorkbenchContext);
}
