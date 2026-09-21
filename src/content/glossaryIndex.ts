// The glossary, loaded as one small chunk: it is searched as a whole, so it is fetched as a whole.
import GLOSSARY_INDEX_JSON from './generated/glossary-index.json';
import GLOSSARY_OUTPUT_JSON from './generated/glossary.json';
import type { GeneratedTerms, Term, TermEntry } from './glossarySchema.ts';

const INDEX = GLOSSARY_INDEX_JSON as Term[];
const OUTPUT = GLOSSARY_OUTPUT_JSON as GeneratedTerms;

/** Every term with the output the verifier recorded for its demo. */
export const TERM_ENTRIES: TermEntry[] = INDEX.map((t) => ({ ...t, stdout: OUTPUT[t.id]?.stdout ?? '' }));

export const TERM_BY_ID = new Map(TERM_ENTRIES.map((t) => [t.id, t]));
