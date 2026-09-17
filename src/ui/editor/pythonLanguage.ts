// Python 3 Monarch tokenizer and completion word lists. Pure data (no Monaco import).
// Adds function, builtin and def names on top of what Monaco's bundled Python grammar offers.

export const PY_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del',
  'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'match',
  'case', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
];

export const PY_BUILTINS = [
  'abs', 'all', 'any', 'bin', 'bool', 'chr', 'dict', 'dir', 'divmod', 'enumerate', 'filter', 'float', 'format',
  'frozenset', 'getattr', 'hasattr', 'hex', 'id', 'input', 'int', 'isinstance', 'iter', 'len', 'list', 'map', 'max',
  'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'range', 'repr', 'reversed', 'round', 'set',
  'slice', 'sorted', 'str', 'sum', 'super', 'tuple', 'type', 'zip',
];

/** Exception names highlighted like builtins (not offered as completions). */
const PY_EXCEPTIONS = [
  'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError', 'ZeroDivisionError', 'FileNotFoundError',
  'NameError', 'AttributeError', 'RecursionError', 'StopIteration', 'OSError', 'IOError', 'EOFError',
  'AssertionError', 'RuntimeError', 'NotImplementedError', 'UnicodeDecodeError', 'PermissionError',
];

// Typed loosely so this file does not need Monaco's types; monaco.ts casts it to IMonarchLanguage.
export const PY_MONARCH = {
  defaultToken: '',
  tokenPostfix: '.python',
  keywords: PY_KEYWORDS,
  builtins: [...PY_BUILTINS, ...PY_EXCEPTIONS],
  brackets: [
    { open: '{', close: '}', token: 'delimiter.curly' },
    { open: '[', close: ']', token: 'delimiter.bracket' },
    { open: '(', close: ')', token: 'delimiter.parenthesis' },
  ],
  tokenizer: {
    root: [
      [/(def|class)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'function']],
      { include: '@whitespace' },
      { include: '@numbers' },
      { include: '@strings' },
      [/[,:;.]/, 'delimiter'],
      [/[{}[\]()]/, '@brackets'],
      [/@[a-zA-Z_]\w*/, 'tag'],
      [/[a-zA-Z_]\w*(?=\s*\()/, { cases: { '@keywords': 'keyword', '@builtins': 'predefined', '@default': 'function' } }],
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@builtins': 'predefined', '@default': 'identifier' } }],
      [/[+\-*/%=<>!&|^~]+/, 'operator'],
    ],
    whitespace: [
      [/\s+/, 'white'],
      [/#.*$/, 'comment'],
    ],
    numbers: [
      [/0[xX][0-9a-fA-F_]+/, 'number'],
      [/0[bB][01_]+/, 'number'],
      [/\d[\d_]*(\.\d*)?([eE][+-]?\d+)?[jJ]?/, 'number'],
      [/\.\d+([eE][+-]?\d+)?/, 'number'],
    ],
    strings: [
      [/[rRbBuUfF]{0,2}'''/, 'string', '@tsq'],
      [/[rRbBuUfF]{0,2}"""/, 'string', '@tdq'],
      [/[rRbBuUfF]{0,2}'$/, 'string'],
      [/[rRbBuUfF]{0,2}"$/, 'string'],
      [/[rRbBuUfF]{0,2}'/, 'string', '@sq'],
      [/[rRbBuUfF]{0,2}"/, 'string', '@dq'],
    ],
    tsq: [
      [/[^'\\]+/, 'string'],
      [/\\./, 'string.escape'],
      [/'''/, 'string', '@popall'],
      [/'/, 'string'],
    ],
    tdq: [
      [/[^"\\]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"""/, 'string', '@popall'],
      [/"/, 'string'],
    ],
    sq: [
      [/[^\\']+$/, 'string', '@popall'],
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape'],
      [/'/, 'string', '@popall'],
      [/\\$/, 'string'],
    ],
    dq: [
      [/[^\\"]+$/, 'string', '@popall'],
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape'],
      [/"/, 'string', '@popall'],
      [/\\$/, 'string'],
    ],
  },
};
