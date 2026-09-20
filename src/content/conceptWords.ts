// Concept tags in a student's words.
//
// Questions are tagged with short ids ("dict-get", "f-strings", "off-by-one") so content can be searched
// and grouped. Those ids are for us, not for the reader, so nothing shows one: everything goes through
// conceptLabel first. Most ids humanise on their own — the map below is only for the ones that do not,
// either because the plain reading is wrong ("in" alone means nothing) or because the real name has
// punctuation a hyphenated id cannot carry ("dict.get()").
export const CONCEPT_WORDS: Record<string, string> = {
  'accumulator-init': 'Starting an accumulator',
  'argument-checks': 'Checking arguments',
  'bare-except': 'Bare except',
  'call-stack': 'The call stack',
  'case-insensitive': 'Ignoring upper and lower case',
  'csv': 'CSV files',
  'dict': 'Dictionaries',
  'dict-copy': 'Copying a dictionary',
  'dict-del': 'Removing a key',
  'dict-get': 'dict.get()',
  'dict-items': 'dict.items()',
  'dict-keys': 'dict.keys()',
  'dict-len': 'How many keys',
  'dict-of-lists': 'A dictionary of lists',
  'dict-update': 'Updating a dictionary',
  'dictionary': 'Dictionaries',
  'elif': 'elif',
  'f-strings': 'f-strings',
  'file-cursor': 'Where reading left off',
  'file-not-found': 'FileNotFoundError',
  'for-each': 'Looping over items',
  'for-range': 'Looping over a range',
  'if-syntax': 'Writing an if',
  'in': 'The in operator',
  'in-membership': 'Checking something is in a list',
  'index-error': 'IndexError',
  'int-conversion': 'Turning text into a whole number',
  'is-vs-equals': 'is versus ==',
  'keyerror': 'KeyError',
  'len': 'len()',
  'main-contract': 'What main() must return',
  'min-max': 'Smallest and largest',
  'name-error': 'NameError',
  'no-import': 'Working without imports',
  'no-loops': 'Doing it without a loop',
  'no-print': 'Returning instead of printing',
  'none': 'None',
  'none-check': 'Checking for None',
  'none-default': 'None as a default',
  'none-return': 'Returning None',
  'off-by-one': 'Off-by-one',
  'ord-chr': 'ord() and chr()',
  'print-vs-return': 'Printing versus returning',
  'range-len': 'range(len(...))',
  'recursion-error': 'RecursionError',
  'runtime-error': 'Errors while running',
  'snake-case': 'snake_case names',
  'standard-deviation': 'Standard deviation',
  'standard-error': 'Standard error',
  'str-vs-int': 'Text versus numbers',
  'strip-split': 'strip() and split()',
  'true-division': 'True division',
  'try-except': 'try and except',
  'unbound-local-error': 'UnboundLocalError',
  'value-error': 'ValueError',
  'while': 'while loops',
  'with-open': 'with open(...)',
  'zero-division': 'Dividing by zero',
  'zero-division-guard': 'Guarding against dividing by zero',
};

/** A concept tag as a student would say it. Never show the raw tag. */
export function conceptLabel(id: string): string {
  const known = CONCEPT_WORDS[id];
  if (known) return known;
  const words = id.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}
