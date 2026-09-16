// Format -> component registry. Used by the question controller and the test modes.
import type { ComponentType } from 'preact';
import type { Format } from '../../content/ids.ts';
import type { FormatProps } from '../../engine/types.ts';
import { Mcq } from './read/Mcq.tsx';
import { Multi } from './read/Multi.tsx';
import { Predict } from './read/Predict.tsx';
import { Trace } from './read/Trace.tsx';
import { Twins } from './read/Twins.tsx';
import { ErrorTranslator } from './read/ErrorTranslator.tsx';
import { Cloze } from './code/Cloze.tsx';
import { Parsons } from './code/Parsons.tsx';
import { FixBug } from './code/FixBug.tsx';
import { Write } from './code/Write.tsx';
import { Refactor } from './code/Refactor.tsx';
import { TestWriter } from './code/TestWriter.tsx';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const FORMAT_COMPONENTS: Record<Format, ComponentType<FormatProps<any>>> = {
  mcq: Mcq, multi: Multi, predict: Predict, trace: Trace, twins: Twins, errorTranslator: ErrorTranslator,
  cloze: Cloze, parsons: Parsons, fixBug: FixBug, write: Write, refactor: Refactor, testWriter: TestWriter,
};

/** How many checks each format allows before the answer is shown automatically. */
export const CHECK_LIMIT: Record<Format, number> = {
  mcq: 1, multi: 1, errorTranslator: 1, predict: 2, trace: 2, twins: 2,
  cloze: 3, parsons: 3, testWriter: 3, fixBug: Infinity, write: Infinity, refactor: Infinity,
};
