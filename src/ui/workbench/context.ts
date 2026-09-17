// Context the question page gives format components (layout choice, cursor position for the status bar).
import { createContext } from 'preact';
import { useContext } from 'preact/hooks';

export interface WorkbenchContextValue {
  layout: 'simple' | 'full';
  /** True when the page itself shows the answer (explanation + model code) once revealed. */
  pageShowsAnswer: boolean;
  onCursor?: (line: number, col: number) => void;
}

export const WorkbenchContext = createContext<WorkbenchContextValue>({ layout: 'simple', pageShowsAnswer: false });

export function useWorkbench() {
  return useContext(WorkbenchContext);
}
