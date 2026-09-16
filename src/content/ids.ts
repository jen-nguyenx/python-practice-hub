// Closed id catalogues. Every tag used in content must come from these lists.
// Adding an id here is the ONLY way to introduce a new one (the verifier and tsc both enforce it).

export const TOPIC_IDS = [
  'variables-expressions',
  'if-elif-else',
  'for-loops-range',
  'functions-basics',
  'strings',
  'lists-tuples',
  'while-nested-loops',
  'dictionaries',
  'files-csv',
  'exceptions',
  'functions-project',
  'project-simulator',
  'recursion',
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

export const MISTAKE_IDS = [
  // syntax
  'missing_colon', 'indent_error', 'unclosed_bracket', 'name_typo', 'syntax_other',
  // conceptual
  'int_vs_float_division', 'str_int_concat', 'input_without_int', 'int_of_float_string',
  'assign_vs_compare', 'is_vs_equals', 'or_with_literal', 'elif_vs_if',
  'off_by_one_range', 'accumulator_init', 'modify_loop_var', 'early_return_in_loop',
  'infinite_while', 'float_equality', 'print_vs_return', 'forgot_to_call', 'scope_confusion',
  'mutable_default_arg', 'string_immutability', 'case_sensitive_compare', 'index_out_of_range',
  'none_from_inplace', 'aliasing_copy', 'tuple_immutability', 'mutate_while_iterating',
  'dict_keyerror', 'file_newline', 'zero_division', 'missing_base_case',
  'recursion_result_ignored', 'type_error_other', 'mutated_input',
  // strategic
  'sort_tiebreak', 'return_type_wrong', 'missing_function', 'top_level_code',
  // exam / project rules
  'loop_in_recursion', 'header_order_assumed', 'csv_ext_assumed', 'invalid_row_not_skipped',
  'no_graceful_exit', 'efficiency_repeat_pass', 'import_used', 'input_called', 'print_in_main',
  'round_mid_calc', 'missing_main',
  // style
  'compare_to_true', 'shadow_builtin', 'style_naming', 'global_state', 'bare_except', 'file_not_closed',
] as const;
export type MistakeId = (typeof MISTAKE_IDS)[number];

export type MistakeCategory = 'syntax' | 'conceptual' | 'strategic' | 'project' | 'style';

// Flags produced by runtime/python/astchecks.py. Mistake-like flags first, then idiom flags.
export const AST_FLAGS = [
  'import_used', 'print_call', 'input_call', 'global_stmt', 'while_no_update', 'while_true_no_break',
  'acc_reset_in_loop', 'range_len_index', 'mutate_while_iterating', 'shadow_builtin', 'mutable_default',
  'missing_return', 'return_print', 'bare_function_name', 'compare_to_true', 'if_return_bool_literal',
  'is_literal', 'or_with_literal', 'none_from_inplace', 'discarded_str_method', 'open_without_with',
  'round_in_loop', 'csv_ext_literal', 'bare_except', 'loop_present',
  // idioms (positive signals)
  'for_each', 'enumerate_used', 'dict_get_used', 'fstring_used', 'early_return', 'with_open',
  'header_index_lookup', 'recursion_present', 'docstring_present',
] as const;
export type AstFlag = (typeof AST_FLAGS)[number];

// CITS1401 project and exam rules that can be enforced on a write question.
export const RULE_IDS = ['noImport', 'noInput', 'noPrint', 'roundAtEnd', 'noCsvExt', 'noLoops', 'mainSignature'] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const PATTERN_IDS = [
  'snake-case-names', 'no-shadow-builtins', 'for-each-loop', 'enumerate-index', 'in-membership',
  'dict-get-default', 'sort-key-tiebreak', 'with-open-strip-split', 'header-lookup', 'guard-clause',
  'if-flag-directly', 'return-boolean-directly', 'is-for-none-only', 'none-default-arg', 'init-accumulator',
  'new-list-not-mutate', 'return-not-print', 'round-at-output', 'specific-except', 'function-per-task',
  'test-edge-cases', 'recursion-checklist', 'floor-division-intent', 'fstrings-for-output',
] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const FORMATS = [
  'mcq', 'multi', 'predict', 'trace', 'twins', 'errorTranslator',
  'cloze', 'parsons', 'fixBug', 'write', 'refactor', 'testWriter',
] as const;
export type Format = (typeof FORMATS)[number];

/** Formats where the student produces runnable code. Count toward a topic's "code" minimum. */
export const CODE_FORMATS: readonly Format[] = ['cloze', 'parsons', 'fixBug', 'write', 'refactor', 'testWriter'];
/** Formats graded purely from pre-generated data, usable before Python has loaded. */
export const OFFLINE_FORMATS: readonly Format[] = ['mcq', 'multi', 'predict', 'trace', 'twins', 'errorTranslator'];

export type Ladder = 'read' | 'repair' | 'write';
export const FORMAT_LADDER: Record<Format, Ladder> = {
  mcq: 'read', multi: 'read', predict: 'read', trace: 'read', twins: 'read', errorTranslator: 'read',
  cloze: 'repair', parsons: 'repair', fixBug: 'repair',
  write: 'write', refactor: 'write', testWriter: 'write',
};

export const FORMAT_LABEL: Record<Format, string> = {
  mcq: 'Multiple choice', multi: 'Select all', predict: 'Predict the output', trace: 'Trace table',
  twins: 'Spot the difference', errorTranslator: 'Error translator', cloze: 'Fill in the blank',
  parsons: 'Parsons puzzle', fixBug: 'Fix the bug', write: 'Write code', refactor: 'Refactor',
  testWriter: 'Break the code',
};

export type Diff = 'easy' | 'medium' | 'hard';
export const DIFFS: readonly Diff[] = ['easy', 'medium', 'hard'];
