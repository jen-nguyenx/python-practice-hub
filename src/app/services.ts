// App-wide singletons. Import `store`, `py` and `r` from here; never construct your own.
import { createStore } from '../store/index.ts';
import { createPyClient } from '../runtime/pyClient.ts';
import { createRClient } from '../runtime/rClient.ts';

export const store = createStore();
export const py = createPyClient();
/** R for STAT2402 lessons and the R Playground. Loads nothing until something first asks it to run. */
export const r = createRClient();
