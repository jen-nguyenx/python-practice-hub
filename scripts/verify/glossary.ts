// Checks and generated output for the glossary.
//
// A definition is prose and nobody can run it, so most of the checking here is about whether it is fit to
// be read: written in words a beginner has, pointing at a lesson that exists, not defining a word with
// itself. Where a term carries a demo, the demo is run and its output recorded — the app does not tell a
// student what Python does, it shows them, and a glossary is no exception.
import { TERMS } from '../../src/content/glossary.ts';
import type { GeneratedTerms, Term } from '../../src/content/glossarySchema.ts';
import { stable } from './experiments.ts';
import type { Harness } from './pyodide.ts';
import type { Issues } from './report.ts';
import { scope } from './report.ts';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/** A definition longer than this has stopped being a definition. */
const MAX_WORDS = 40;
/** A demo is a demonstration, not a lesson. */
const MAX_LINES = 8;
/** A set of strings iterates differently every run, so recording one would flake CI. */
const SET_REPR = /\{[^{}:]*['"][^{}:]*\}/;

const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const quote = (s: string) => JSON.stringify(s);

/** [[other-term]] links inside a definition. */
function links(text: string): string[] {
  return [...text.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1]);
}

export interface GlossaryResult { index: Term[]; generated: GeneratedTerms }

export async function checkGlossary(
  issues: Issues,
  harness: (() => Promise<Harness>) | null,
  lessonIds: ReadonlySet<string>,
): Promise<GlossaryResult> {
  const index: Term[] = [];
  const generated: GeneratedTerms = {};
  const ids = new Set(TERMS.map((t) => t.id));
  const seen = new Set<string>();
  const words = new Set<string>();

  for (const [i, t] of TERMS.entries()) {
    const id = nonEmpty(t?.id) ? t.id : `#${i + 1}`;
    const sc = scope(issues, 'glossary', id);

    if (!nonEmpty(t?.id) || !KEBAB.test(t.id)) sc.error('id must be kebab-case');
    else if (seen.has(t.id)) sc.error('duplicate id');
    else seen.add(t.id);

    if (!nonEmpty(t?.term)) sc.error('term is empty');
    else if (words.has(t.term.toLowerCase())) sc.error(`another entry already defines ${quote(t.term)}`);
    else words.add(t.term.toLowerCase());

    if (!nonEmpty(t?.short)) {
      sc.error('short is empty; every term needs a definition');
    } else {
      const n = t.short.trim().split(/\s+/).length;
      if (n > MAX_WORDS) sc.error(`the definition runs to ${n} words; keep it to ${MAX_WORDS}`);
      // "A parameter is a parameter you pass" helps nobody. Only the defining sentence is circular
      // though — a later one naming examples ("lists and sets are mutable") is doing useful work.
      const first = t.short.split(/(?<=\.)\s/)[0].toLowerCase().replace(/\[\[[a-z0-9-]+\]\]/g, '');
      if (nonEmpty(t?.term) && first.includes(t.term.toLowerCase())) {
        sc.error(`the definition uses the word ${quote(t.term)} to define it`);
      }
    }

    for (const text of [t?.short, t?.note].filter(nonEmpty)) {
      for (const link of links(text)) {
        if (!ids.has(link)) sc.error(`links to [[${link}]], which is not a term`);
      }
    }

    if (t?.confusedWith !== undefined && !ids.has(t.confusedWith)) {
      sc.error(`confusedWith ${quote(t.confusedWith)} is not a term`);
    }
    if (t?.lessonId !== undefined && !lessonIds.has(t.lessonId)) {
      sc.error(`lessonId ${quote(t.lessonId)} is not a lesson`);
    }
    if (t?.also !== undefined && (!Array.isArray(t.also) || !t.also.every(nonEmpty))) {
      sc.error('also must be a list of words');
    }

    index.push(t);

    if (!nonEmpty(t?.demo)) continue;
    const lines = t.demo.replace(/\n$/, '').split('\n').length;
    if (lines > MAX_LINES) sc.error(`the demo runs to ${lines} lines; keep it to ${MAX_LINES}`);
    if (!harness) continue;

    const h = await harness();
    const out = h.runCapture(t.demo, []);
    if (out.error) {
      sc.error(`the demo raises ${out.error.type}${out.error.message ? `: ${out.error.message}` : ''}; it is meant to show the term working`);
      continue;
    }
    if (!out.stdout.trim()) {
      sc.error('the demo prints nothing, so it demonstrates nothing; print the result');
      continue;
    }
    if (SET_REPR.test(out.stdout)) {
      sc.error('this prints a set of strings, which iterates in a different order on every run; show it through sorted(...)');
    }
    generated[t.id] = { stdout: stable(out.stdout) };
  }

  return { index, generated };
}
