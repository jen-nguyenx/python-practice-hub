// Plain-language text for runtime states, AST flags, project rules and Python errors.
import type { AstFlag, MistakeId, RuleId } from '../../content/ids.ts';
import { MISTAKES } from '../../content/mistakes.ts';
import type { AstFinding, PyError, RuntimeStatus } from '../../runtime/protocol.ts';
import type { EditorMarker } from '../editor/types.ts';

export function runtimeStatusText(s: RuntimeStatus): string {
  switch (s.state) {
    case 'idle': return 'Python not started';
    case 'loading': return `Python is starting · ${Math.max(0, Math.round(s.elapsedMs / 1000))} s`;
    case 'ready': return `${s.python} · ready`;
    case 'running': return `${s.python} · running`;
    case 'restarting': return 'Restarting Python';
    case 'error': return 'Python could not start';
  }
}

export function isStarting(s: RuntimeStatus) {
  return s.state === 'idle' || s.state === 'loading' || s.state === 'restarting';
}

/** Warning text for AST flags shown in Problems. Flags without text (idioms, neutral facts) are not shown. */
export const FLAG_TEXT: Partial<Record<AstFlag, string>> = {
  import_used: '`import` is used. CITS1401 projects and exams do not allow imports.',
  global_stmt: '`global` is used. Pass values in as parameters and return results instead.',
  while_no_update: 'This while loop never changes the variable in its condition, so it may never stop.',
  while_true_no_break: '`while True` has no `break`, so the loop never stops.',
  acc_reset_in_loop: 'A running total is set back to its start value inside the loop. Set it once, before the loop.',
  range_len_index: '`range(len(...))` with indexing: looping over the items directly is simpler.',
  mutate_while_iterating: 'The list is changed while the loop goes through it, which skips items. Build a new list instead.',
  shadow_builtin: 'A variable reuses a built-in name (such as `list`, `sum` or `max`), which hides the built-in.',
  mutable_default: 'A list or dict default value is shared between calls. Use `None` as the default and create it inside.',
  missing_return: 'This function never returns a value, so calling it gives `None`.',
  return_print: '`return print(...)` returns `None`. Return the value itself.',
  bare_function_name: 'A function name is used without `()`, so the function is never called.',
  compare_to_true: 'No need to compare with `True` or `False`: write `if flag:` or `if not flag:`.',
  if_return_bool_literal: '`if ...: return True / else: return False` can be one line: `return <condition>`.',
  is_literal: '`is` checks whether two things are the same object. Use `==` to compare with a number or string.',
  or_with_literal: '`x == a or b` is always true when `b` is not empty or zero. Write `x == a or x == b`.',
  none_from_inplace: 'Methods like `sort()` and `append()` change the list and return `None`. Do not assign their result.',
  discarded_str_method: 'String methods return a new string, and the result here is thrown away. Assign it, for example `s = s.strip()`.',
  open_without_with: '`open()` without `with` may leave the file open. Use `with open(...) as f:`.',
  round_in_loop: '`round()` inside a loop rounds part-way through the calculation. Round only the final result.',
  csv_ext_literal: 'The code assumes the file name ends in `.csv`. Project files may have no extension.',
  bare_except: '`except:` with no exception name hides every error. Name it, for example `except ValueError:`.',
};

export function warningFlags(flags: readonly AstFinding[] | undefined): AstFinding[] {
  if (!flags) return [];
  const seen = new Set<string>();
  return flags.filter((f) => {
    const key = `${f.flag}:${f.line}`;
    if (!FLAG_TEXT[f.flag] || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const RULE_TEXT: Record<RuleId, { name: string; consequence: string }> = {
  noImport: { name: 'No import statements', consequence: 'Projects and exams allow no imports. Code that imports a module is not marked, so it scores zero.' },
  noInput: { name: 'Never call input()', consequence: 'The automatic marker cannot answer input(), so your code is not tested and scores zero.' },
  noPrint: { name: 'No print() except when stopping gracefully', consequence: 'Printing results instead of returning them fails the tests, and stray printing loses style marks.' },
  roundAtEnd: { name: 'Round only the final results', consequence: 'Rounding during the calculation changes the answer, so tests that check 4 decimal places fail.' },
  noCsvExt: { name: 'Do not assume a .csv extension', consequence: 'Test files may have no extension, so code that checks for .csv fails those tests.' },
  noLoops: { name: 'No loops: use recursion', consequence: 'The question forbids loops. In the exam an answer with a loop scores zero for that question.' },
  mainSignature: { name: 'Define main() exactly as specified', consequence: 'If main() is missing or has different parameters, the marker cannot run your code and the submission scores zero.' },
};

export function mistakeLabel(id: MistakeId | string | undefined): string | undefined {
  if (!id) return undefined;
  return (MISTAKES as Record<string, { label: string } | undefined>)[id]?.label;
}

export function errorOneLine(err: PyError): string {
  const where = err.line ? ` (line ${err.line})` : '';
  if (err.type === 'TimeoutError') return `Took too long: the code may be stuck in a loop${where}`;
  if (err.type === 'OutputLimit') return `Too much output: the code may be printing in an endless loop${where}`;
  return `${err.type}: ${err.message}${where}`;
}

export function markersFrom(opts: { syntaxError?: PyError | null; runtimeError?: PyError | null; flags?: readonly AstFinding[] }): EditorMarker[] {
  const out: EditorMarker[] = [];
  const syn = opts.syntaxError;
  if (syn?.line) out.push({ line: syn.line, col: syn.col, endCol: syn.endCol, message: `${syn.type}: ${syn.message}`, severity: 'error' });
  const rt = opts.runtimeError;
  if (rt?.line && rt !== syn) out.push({ line: rt.line, message: errorOneLine(rt), severity: 'error' });
  for (const f of warningFlags(opts.flags)) {
    out.push({ line: f.line, message: stripTicks(FLAG_TEXT[f.flag] ?? ''), severity: 'warning' });
  }
  return out;
}

export function stripTicks(s: string) {
  return s.replace(/`/g, '');
}

/** Short plain names for every AST flag, used when a refactor still needs to remove or add something. */
export const FLAG_NAME: Record<AstFlag, string> = {
  import_used: 'an `import` statement', print_call: 'a `print()` call', input_call: 'an `input()` call', global_stmt: 'a `global` statement',
  while_no_update: 'a while loop whose condition never changes', while_true_no_break: '`while True` without `break`',
  acc_reset_in_loop: 'a total reset inside the loop', range_len_index: 'looping with `range(len(...))` and indexing',
  mutate_while_iterating: 'changing a list while looping over it', shadow_builtin: 'a variable named after a built-in',
  mutable_default: 'a list or dict as a default argument', missing_return: 'a function with no `return`',
  return_print: '`return print(...)`', bare_function_name: 'a function name without `()`', compare_to_true: 'comparing with `True` or `False`',
  if_return_bool_literal: '`if ...: return True else: return False`', is_literal: '`is` used to compare with a value',
  or_with_literal: '`x == a or b`', none_from_inplace: 'assigning the result of `sort()` or `append()`',
  discarded_str_method: 'a string method whose result is thrown away', open_without_with: '`open()` without `with`',
  round_in_loop: '`round()` inside a loop', csv_ext_literal: 'a hard-coded `.csv` check', bare_except: 'a bare `except:`',
  loop_present: 'a loop', for_each: 'looping directly over the items (`for item in items`)', enumerate_used: '`enumerate()`',
  dict_get_used: '`dict.get(key, default)`', fstring_used: 'an f-string', early_return: 'an early `return` (guard clause)',
  with_open: '`with open(...) as f:`', header_index_lookup: 'finding columns by header name', recursion_present: 'recursion (the function calls itself)',
  docstring_present: 'a docstring',
};
