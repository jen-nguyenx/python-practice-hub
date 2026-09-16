// App-wide singletons. Import `store` and `py` from here; never construct your own.
import { createStore } from '../store/index.ts';
import { createPyClient } from '../runtime/pyClient.ts';

export const store = createStore();
export const py = createPyClient();
