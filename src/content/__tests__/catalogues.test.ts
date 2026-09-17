// Catalogue tests: completeness of mistakes and pattern cards, runtime matchers against real Python 3.14
// messages, error explanations, and (with Pyodide) that every example snippet compiles.
import { beforeAll, describe, expect, it } from 'vitest';
import { AST_FLAGS, MISTAKE_IDS, PATTERN_IDS, TOPIC_IDS } from '../ids.ts';
import type { MistakeId } from '../ids.ts';
import { explainError, matchError, MISTAKES } from '../mistakes.ts';
import { PATTERN_BY_ID, PATTERNS } from '../patterns.ts';

// Captured from 3.14.2 in Pyodide 314.0.7 by scratch/catalogues/capture.mjs.
// [snippet, exception type, message, expected mistake ids]
const CAPTURED: [string, string, string, MistakeId[]][] = [
  ["colon_if", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_if~1", "SyntaxError", "expected ':' (<student>, line 2)", ["missing_colon"]],
  ["colon_def", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_def~1", "SyntaxError", "expected ':' (<student>, line 1)", ["missing_colon"]],
  ["colon_for", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_for~1", "SyntaxError", "expected ':' (<student>, line 1)", ["missing_colon"]],
  ["colon_while", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_while~1", "SyntaxError", "expected ':' (<student>, line 2)", ["missing_colon"]],
  ["colon_else", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_else~1", "SyntaxError", "expected ':' (<student>, line 4)", ["missing_colon"]],
  ["colon_elif", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["colon_elif~1", "SyntaxError", "expected ':' (<student>, line 4)", ["missing_colon"]],
  ["else_if", "SyntaxError", "expected ':'", ["missing_colon"]],
  ["else_if~1", "SyntaxError", "expected ':' (<student>, line 4)", ["missing_colon"]],
  ["indent_expected", "IndentationError", "expected an indented block after 'if' statement on line 2", ["indent_error"]],
  ["indent_expected~1", "IndentationError", "expected an indented block after 'if' statement on line 2 (<student>, line 3)", ["indent_error"]],
  ["indent_expected_def", "IndentationError", "expected an indented block after function definition on line 1", ["indent_error"]],
  ["indent_expected_def~1", "IndentationError", "expected an indented block after function definition on line 1 (<student>, line 2)", ["indent_error"]],
  ["indent_expected_for", "IndentationError", "expected an indented block after 'for' statement on line 1", ["indent_error"]],
  ["indent_expected_for~1", "IndentationError", "expected an indented block after 'for' statement on line 1 (<student>, line 2)", ["indent_error"]],
  ["indent_unexpected", "IndentationError", "unexpected indent", ["indent_error"]],
  ["indent_unexpected~1", "IndentationError", "unexpected indent (<student>, line 2)", ["indent_error"]],
  ["indent_unindent", "IndentationError", "unindent does not match any outer indentation level", ["indent_error"]],
  ["indent_unindent~1", "IndentationError", "unindent does not match any outer indentation level (<student>, line 3)", ["indent_error"]],
  ["tab_error", "TabError", "inconsistent use of tabs and spaces in indentation", ["indent_error"]],
  ["tab_error~1", "TabError", "inconsistent use of tabs and spaces in indentation (<student>, line 3)", ["indent_error"]],
  ["unclosed_paren", "SyntaxError", "'(' was never closed", ["unclosed_bracket"]],
  ["unclosed_paren~1", "SyntaxError", "'(' was never closed (<student>, line 1)", ["unclosed_bracket"]],
  ["unclosed_print", "SyntaxError", "'(' was never closed", ["unclosed_bracket"]],
  ["unclosed_print~1", "SyntaxError", "'(' was never closed (<student>, line 1)", ["unclosed_bracket"]],
  ["unclosed_list", "SyntaxError", "'[' was never closed", ["unclosed_bracket"]],
  ["unclosed_list~1", "SyntaxError", "'[' was never closed (<student>, line 1)", ["unclosed_bracket"]],
  ["unclosed_dict", "SyntaxError", "'{' was never closed", ["unclosed_bracket"]],
  ["unclosed_dict~1", "SyntaxError", "'{' was never closed (<student>, line 1)", ["unclosed_bracket"]],
  ["unterminated_string", "SyntaxError", "unterminated string literal (detected at line 1)", ["unclosed_bracket"]],
  ["unterminated_string~1", "SyntaxError", "unterminated string literal (detected at line 1) (<student>, line 1)", ["unclosed_bracket"]],
  ["unterminated_triple", "SyntaxError", "unterminated triple-quoted string literal (detected at line 3)", ["unclosed_bracket"]],
  ["unterminated_triple~1", "SyntaxError", "unterminated triple-quoted string literal (detected at line 3) (<student>, line 2)", ["unclosed_bracket"]],
  ["mismatch_bracket", "SyntaxError", "closing parenthesis ']' does not match opening parenthesis '('", ["unclosed_bracket"]],
  ["mismatch_bracket~1", "SyntaxError", "closing parenthesis ']' does not match opening parenthesis '(' (<student>, line 1)", ["unclosed_bracket"]],
  ["unmatched_close", "SyntaxError", "unmatched ')'", ["unclosed_bracket"]],
  ["unmatched_close~1", "SyntaxError", "unmatched ')' (<student>, line 1)", ["unclosed_bracket"]],
  ["if_assign", "SyntaxError", "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", ["assign_vs_compare"]],
  ["if_assign~1", "SyntaxError", "invalid syntax. Maybe you meant '==' or ':=' instead of '='? (<student>, line 2)", ["assign_vs_compare"]],
  ["while_assign", "SyntaxError", "invalid syntax. Maybe you meant '==' or ':=' instead of '='?", ["assign_vs_compare"]],
  ["while_assign~1", "SyntaxError", "invalid syntax. Maybe you meant '==' or ':=' instead of '='? (<student>, line 2)", ["assign_vs_compare"]],
  ["if_assign_and", "SyntaxError", "invalid syntax", ["syntax_other"]],
  ["if_assign_and~1", "SyntaxError", "invalid syntax (<student>, line 3)", ["syntax_other"]],
  ["assign_to_call", "SyntaxError", "cannot assign to function call here. Maybe you meant '==' instead of '='?", ["assign_vs_compare"]],
  ["assign_to_call~1", "SyntaxError", "cannot assign to function call here. Maybe you meant '==' instead of '='? (<student>, line 3)", ["assign_vs_compare"]],
  ["assign_to_literal", "SyntaxError", "cannot assign to literal here. Maybe you meant '==' instead of '='?", ["assign_vs_compare"]],
  ["assign_to_literal~1", "SyntaxError", "cannot assign to literal here. Maybe you meant '==' instead of '='? (<student>, line 1)", ["assign_vs_compare"]],
  ["print_no_parens", "SyntaxError", "Missing parentheses in call to 'print'. Did you mean print(...)?", ["syntax_other"]],
  ["print_no_parens~1", "SyntaxError", "Missing parentheses in call to 'print'. Did you mean print(...)? (<student>, line 1)", ["syntax_other"]],
  ["missing_comma", "SyntaxError", "invalid syntax. Perhaps you forgot a comma?", ["syntax_other"]],
  ["missing_comma~1", "SyntaxError", "invalid syntax. Perhaps you forgot a comma? (<student>, line 1)", ["syntax_other"]],
  ["return_outside", "SyntaxError", "'return' outside function", ["syntax_other"]],
  ["return_outside~1", "SyntaxError", "'return' outside function (<student>, line 2)", ["syntax_other"]],
  ["keyword_name", "SyntaxError", "invalid syntax", ["syntax_other"]],
  ["keyword_name~1", "SyntaxError", "invalid syntax (<student>, line 1)", ["syntax_other"]],
  ["smart_quotes", "SyntaxError", "invalid character '\u201c' (U+201C)", ["syntax_other"]],
  ["smart_quotes~1", "SyntaxError", "invalid character '\u201c' (U+201C) (<student>, line 1)", ["syntax_other"]],
  ["digit_name", "SyntaxError", "invalid decimal literal", ["syntax_other"]],
  ["digit_name~1", "SyntaxError", "invalid decimal literal (<student>, line 1)", ["syntax_other"]],
  ["try_no_except", "SyntaxError", "expected 'except' or 'finally' block", ["syntax_other"]],
  ["try_no_except~1", "SyntaxError", "expected 'except' or 'finally' block (<student>, line 3)", ["syntax_other"]],
  ["break_outside", "SyntaxError", "'break' outside loop", ["syntax_other"]],
  ["break_outside~1", "SyntaxError", "'break' outside loop (<student>, line 3)", ["syntax_other"]],
  ["elif_after_else", "SyntaxError", "'elif' block follows an 'else' block", ["syntax_other"]],
  ["elif_after_else~1", "SyntaxError", "'elif' block follows an 'else' block (<student>, line 6)", ["syntax_other"]],
  ["fstring_brace", "SyntaxError", "f-string: expecting '}'", ["unclosed_bracket"]],
  ["fstring_brace~1", "SyntaxError", "f-string: expecting '}' (<student>, line 2)", ["unclosed_bracket"]],
  ["double_equals_assign", "SyntaxError", "invalid syntax", ["syntax_other"]],
  ["double_equals_assign~1", "SyntaxError", "invalid syntax (<student>, line 3)", ["syntax_other"]],
  ["is_literal_warning", "SyntaxWarning", "\"is\" with 'int' literal. Did you mean \"==\"?", ["is_vs_equals"]],
  ["is_str_literal_warning", "SyntaxWarning", "\"is\" with 'str' literal. Did you mean \"==\"?", ["is_vs_equals"]],
  ["call_int_warning", "TypeError", "'int' object is not callable", ["shadow_builtin"]],
  ["name_typo_suggest", "NameError", "name 'totl' is not defined", ["name_typo"]],
  ["name_typo_suggest~1", "NameError", "name 'totl' is not defined. Did you mean: 'total'?", ["name_typo"]],
  ["name_Print", "NameError", "name 'Print' is not defined", ["name_typo"]],
  ["name_Print~1", "NameError", "name 'Print' is not defined. Did you mean: 'print'?", ["name_typo"]],
  ["name_true", "NameError", "name 'true' is not defined", ["name_typo"]],
  ["name_true~1", "NameError", "name 'true' is not defined. Did you mean: 'True'?", ["name_typo"]],
  ["name_undefined", "NameError", "name 'average' is not defined", ["name_typo"]],
  ["name_acc_module", "NameError", "name 'count' is not defined", ["name_typo"]],
  ["name_acc_module~1", "NameError", "name 'count' is not defined. Did you mean: 'round'?", ["name_typo"]],
  ["name_local_outside", "NameError", "name 'result' is not defined", ["name_typo"]],
  ["unbound_local_acc", "UnboundLocalError", "cannot access local variable 'total' where it is not associated with a value", ["accumulator_init", "scope_confusion"]],
  ["unbound_local_global", "UnboundLocalError", "cannot access local variable 'count' where it is not associated with a value", ["accumulator_init", "scope_confusion"]],
  ["str_plus_int", "TypeError", "can only concatenate str (not \"int\") to str", ["str_int_concat"]],
  ["str_plus_float", "TypeError", "can only concatenate str (not \"float\") to str", ["str_int_concat"]],
  ["int_plus_str", "TypeError", "unsupported operand type(s) for +: 'int' and 'str'", ["input_without_int"]],
  ["str_lt_int", "TypeError", "'<' not supported between instances of 'str' and 'int'", ["input_without_int"]],
  ["str_gt_int", "TypeError", "'>=' not supported between instances of 'str' and 'int'", ["input_without_int"]],
  ["str_minus_int", "TypeError", "unsupported operand type(s) for -: 'str' and 'int'", ["input_without_int"]],
  ["str_div_int", "TypeError", "unsupported operand type(s) for /: 'str' and 'int'", ["input_without_int"]],
  ["str_times_float", "TypeError", "can't multiply sequence by non-int of type 'float'", ["input_without_int"]],
  ["str_times_str", "TypeError", "can't multiply sequence by non-int of type 'str'", ["input_without_int"]],
  ["sum_of_strings", "TypeError", "unsupported operand type(s) for +: 'int' and 'str'", ["input_without_int"]],
  ["range_of_str", "TypeError", "'str' object cannot be interpreted as an integer", ["input_without_int"]],
  ["input_eof", "EOFError", "EOF when reading a line", []],
  ["int_float_string", "ValueError", "invalid literal for int() with base 10: '12.0'", ["int_of_float_string"]],
  ["int_na", "ValueError", "invalid literal for int() with base 10: 'N/A'", ["int_of_float_string"]],
  ["int_empty", "ValueError", "invalid literal for int() with base 10: ''", ["int_of_float_string"]],
  ["float_na", "ValueError", "could not convert string to float: 'N/A'", ["int_of_float_string"]],
  ["float_empty", "ValueError", "could not convert string to float: ''", ["int_of_float_string"]],
  ["unpack_not_enough", "ValueError", "not enough values to unpack (expected 2, got 1)", []],
  ["unpack_too_many", "ValueError", "too many values to unpack (expected 2, got 3)", []],
  ["list_index_missing", "ValueError", "list.index(x): x not in list", []],
  ["list_remove_missing", "ValueError", "list.remove(x): x not in list", []],
  ["math_domain", "ValueError", "expected a nonnegative input, got -1.0", []],
  ["math_log_zero", "ValueError", "expected a positive input", []],
  ["max_empty", "ValueError", "max() iterable argument is empty", []],
  ["list_index", "IndexError", "list index out of range", ["index_out_of_range"]],
  ["list_index_len", "IndexError", "list index out of range", ["index_out_of_range"]],
  ["string_index", "IndexError", "string index out of range", ["index_out_of_range"]],
  ["tuple_index", "IndexError", "tuple index out of range", ["index_out_of_range"]],
  ["empty_list_index", "IndexError", "list index out of range", ["index_out_of_range"]],
  ["pop_empty", "IndexError", "pop from empty list", ["index_out_of_range"]],
  ["list_assign_index", "IndexError", "list assignment index out of range", ["index_out_of_range"]],
  ["keyerror", "KeyError", "'banana'", ["dict_keyerror"]],
  ["keyerror_increment", "KeyError", "'a'", ["dict_keyerror"]],
  ["keyerror_int", "KeyError", "2", ["dict_keyerror"]],
  ["str_item_assign", "TypeError", "'str' object does not support item assignment", ["string_immutability"]],
  ["str_item_delete", "TypeError", "'str' object doesn't support item deletion", ["string_immutability"]],
  ["str_append", "AttributeError", "'str' object has no attribute 'append'", ["string_immutability"]],
  ["tuple_item_assign", "TypeError", "'tuple' object does not support item assignment", ["tuple_immutability"]],
  ["tuple_append", "AttributeError", "'tuple' object has no attribute 'append'", ["tuple_immutability"]],
  ["none_subscript_sort", "TypeError", "'NoneType' object is not subscriptable", ["none_from_inplace"]],
  ["none_attr_append", "AttributeError", "'NoneType' object has no attribute 'append'", ["none_from_inplace"]],
  ["none_iter", "TypeError", "'NoneType' object is not iterable", ["none_from_inplace"]],
  ["none_len", "TypeError", "object of type 'NoneType' has no len()", ["none_from_inplace"]],
  ["none_plus_int", "TypeError", "unsupported operand type(s) for +: 'NoneType' and 'int'", ["print_vs_return"]],
  ["none_times_int", "TypeError", "unsupported operand type(s) for *: 'NoneType' and 'int'", ["print_vs_return"]],
  ["none_lt_int", "TypeError", "'>' not supported between instances of 'NoneType' and 'int'", ["print_vs_return"]],
  ["none_round", "TypeError", "type NoneType doesn't define __round__ method", ["print_vs_return"]],
  ["none_format", "TypeError", "unsupported format string passed to NoneType.__format__", ["print_vs_return"]],
  ["none_float", "TypeError", "float() argument must be a string or a real number, not 'NoneType'", ["print_vs_return"]],
  ["str_plus_none", "TypeError", "can only concatenate str (not \"NoneType\") to str", ["print_vs_return"]],
  ["int_not_callable", "TypeError", "'int' object is not callable", ["shadow_builtin"]],
  ["list_not_callable", "TypeError", "'list' object is not callable", ["shadow_builtin"]],
  ["str_not_callable", "TypeError", "'str' object is not callable", ["shadow_builtin"]],
  ["float_not_callable", "TypeError", "'float' object is not callable", ["shadow_builtin"]],
  ["dict_not_callable", "TypeError", "'dict' object is not callable", ["shadow_builtin"]],
  ["function_compare", "TypeError", "'>' not supported between instances of 'function' and 'int'", ["forgot_to_call"]],
  ["function_plus", "TypeError", "unsupported operand type(s) for +: 'function' and 'int'", ["forgot_to_call"]],
  ["function_len", "TypeError", "object of type 'function' has no len()", ["forgot_to_call"]],
  ["function_subscript", "TypeError", "'function' object is not subscriptable", ["forgot_to_call"]],
  ["function_iter", "TypeError", "'function' object is not iterable", ["forgot_to_call"]],
  ["method_subscript", "TypeError", "'builtin_function_or_method' object is not subscriptable", ["forgot_to_call"]],
  ["method_len", "TypeError", "object of type 'builtin_function_or_method' has no len()", ["forgot_to_call"]],
  ["method_concat", "TypeError", "unsupported operand type(s) for +: 'builtin_function_or_method' and 'str'", ["forgot_to_call"]],
  ["missing_arg", "TypeError", "area() missing 1 required positional argument: 'h'", ["type_error_other"]],
  ["too_many_args", "TypeError", "area() takes 2 positional arguments but 3 were given", ["type_error_other"]],
  ["zero_args_given", "TypeError", "hello() takes 0 positional arguments but 1 was given", ["type_error_other"]],
  ["index_float", "TypeError", "list indices must be integers or slices, not float", ["int_vs_float_division"]],
  ["str_index_float", "TypeError", "string indices must be integers, not 'float'", ["int_vs_float_division"]],
  ["range_float", "TypeError", "'float' object cannot be interpreted as an integer", ["int_vs_float_division"]],
  ["slice_float", "TypeError", "slice indices must be integers or None or have an __index__ method", ["int_vs_float_division"]],
  ["str_times_float_repeat", "TypeError", "can't multiply sequence by non-int of type 'float'", ["input_without_int"]],
  ["list_index_str", "TypeError", "list indices must be integers or slices, not str", ["type_error_other"]],
  ["int_not_iterable", "TypeError", "'int' object is not iterable", ["type_error_other"]],
  ["int_no_len", "TypeError", "object of type 'int' has no len()", ["type_error_other"]],
  ["int_not_subscriptable", "TypeError", "'int' object is not subscriptable", ["type_error_other"]],
  ["list_plus_int", "TypeError", "can only concatenate list (not \"int\") to list", ["type_error_other"]],
  ["unhashable_list", "TypeError", "cannot use 'list' as a dict key (unhashable type: 'list')", ["type_error_other"]],
  ["join_ints", "TypeError", "sequence item 0: expected str instance, int found", ["type_error_other"]],
  ["attr_str_typo", "AttributeError", "'str' object has no attribute 'uppper'", []],
  ["attr_str_typo~1", "AttributeError", "'str' object has no attribute 'uppper'. Did you mean: 'upper'?", ["name_typo"]],
  ["attr_list_typo", "AttributeError", "'list' object has no attribute 'apend'", []],
  ["attr_list_typo~1", "AttributeError", "'list' object has no attribute 'apend'. Did you mean: 'append'?", ["name_typo"]],
  ["attr_list_add", "AttributeError", "'list' object has no attribute 'add'", []],
  ["attr_dict_append", "AttributeError", "'dict' object has no attribute 'append'", []],
  ["attr_int_append", "AttributeError", "'int' object has no attribute 'append'", []],
  ["zero_div", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_floordiv", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_mod", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_float_div", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_float_div2", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_mean_empty", "ZeroDivisionError", "division by zero", ["zero_division"]],
  ["zero_pow", "ZeroDivisionError", "zero to a negative power", ["zero_division"]],
  ["recursion_no_base", "RecursionError", "maximum recursion depth exceeded", ["missing_base_case"]],
  ["recursion_wrong_step", "RecursionError", "maximum recursion depth exceeded", ["missing_base_case"]],
  ["overflow_float", "OverflowError", "(68, 'Result not representable')", []],
  ["file_not_found", "FileNotFoundError", "[Errno 44] No such file or directory: 'marks.csv'", []],
  ["dict_changed_size", "RuntimeError", "dictionary changed size during iteration", ["mutate_while_iterating"]],
  ["dict_add_while_iter", "RuntimeError", "dictionary changed size during iteration", ["mutate_while_iterating"]],
  ["set_changed_size", "RuntimeError", "Set changed size during iteration", ["mutate_while_iterating"]],
  ["import_missing", "ModuleNotFoundError", "No module named 'numpy'", ["import_used"]],
  ["assertion", "AssertionError", "", []],
  ["assertion_msg", "AssertionError", "maths is broken", []],
  ["fstring_unterminated", "SyntaxError", "unterminated f-string literal (detected at line 2)", ["unclosed_bracket"]],
  ["fstring_unterminated~1", "SyntaxError", "unterminated f-string literal (detected at line 2) (<student>, line 2)", ["unclosed_bracket"]],
  ["format_code_str", "ValueError", "Unknown format code 'f' for object of type 'str'", ["input_without_int"]],
  ["round_str", "TypeError", "type str doesn't define __round__ method", ["input_without_int"]],
  ["abs_str", "TypeError", "bad operand type for abs(): 'str'", ["input_without_int"]],
  ["neg_str", "TypeError", "bad operand type for unary -: 'str'", ["input_without_int"]],
  ["sorted_mixed", "TypeError", "'<' not supported between instances of 'int' and 'str'", ["input_without_int"]],
  ["max_mixed", "TypeError", "'>' not supported between instances of 'str' and 'int'", ["input_without_int"]],
  ["int_in_str", "TypeError", "'in <string>' requires string as left operand, not int", ["type_error_other"]],
  ["in_none", "TypeError", "argument of type 'NoneType' is not a container or iterable", ["none_from_inplace"]],
  ["in_int", "TypeError", "argument of type 'int' is not a container or iterable", ["type_error_other"]],
  ["none_attr_sort_chain", "AttributeError", "'NoneType' object has no attribute 'reverse'", ["none_from_inplace"]],
  ["recursion_none_add", "TypeError", "unsupported operand type(s) for +: 'int' and 'NoneType'", ["print_vs_return"]],
  ["def_empty_body", "IndentationError", "expected an indented block after function definition on line 1", ["indent_error"]],
  ["def_empty_body~1", "IndentationError", "expected an indented block after function definition on line 1 (<student>, line 3)", ["indent_error"]],
  ["else_misaligned", "IndentationError", "unindent does not match any outer indentation level", ["indent_error"]],
  ["else_misaligned~1", "IndentationError", "unindent does not match any outer indentation level (<student>, line 4)", ["indent_error"]],
  ["float_int_mod_str", "TypeError", "%d format: a real number is required, not str", ["type_error_other"]],
  ["str_mul_list", "TypeError", "can't multiply sequence by non-int of type 'list'", ["type_error_other"]],
  ["dict_key_list_index", "KeyError", "0", ["dict_keyerror"]],
  ["keyerror_tuple", "KeyError", "('a', 1)", ["dict_keyerror"]],
  ["pop_empty_dict", "KeyError", "'a'", ["dict_keyerror"]],
  ["list_index_out_negative", "IndexError", "list index out of range", ["index_out_of_range"]],
  ["str_index_str", "TypeError", "string indices must be integers, not 'str'", ["type_error_other"]],
  ["none_setitem", "TypeError", "'NoneType' object does not support item assignment", ["none_from_inplace"]],
  ["csv_ext_twice", "FileNotFoundError", "[Errno 44] No such file or directory: 'marks.csv.csv'", ["csv_ext_assumed"]],
  ["input_eof_twice", "EOFError", "EOF when reading a line", []],
  ["is_not_literal_warning", "SyntaxWarning", "\"is not\" with 'int' literal. Did you mean \"!=\"?", ["is_vs_equals"]],
  ["attr_function", "AttributeError", "'function' object has no attribute 'append'", ["forgot_to_call"]],
  ["none_minus_recursive", "TypeError", "unsupported operand type(s) for -: 'NoneType' and 'int'", ["print_vs_return"]],
  ["cmp_float_str", "TypeError", "'<' not supported between instances of 'float' and 'str'", ["input_without_int"]],
  ["int_iter_unpack", "TypeError", "cannot unpack non-iterable int object", ["type_error_other"]],
];

const CATEGORIES = ['syntax', 'conceptual', 'strategic', 'project', 'style'];
const EMOJI = /\p{Extended_Pictographic}/u;
const lines = (s: string) => s.split('\n').length;

/** Markdown-lite safety: balanced inline code, no stray * (italics) or angle brackets outside code. */
function expectCleanMd(md: string) {
  expect((md.match(/`/g) ?? []).length % 2, md).toBe(0);
  const outside = md.replace(/`[^`]*`/g, '');
  expect(outside, md).not.toMatch(/[*<>]/);
}

describe('mistake catalogue', () => {
  it('has exactly one entry per MISTAKE_ID', () => {
    expect(Object.keys(MISTAKES).sort()).toEqual([...MISTAKE_IDS].sort());
  });

  it.each(MISTAKE_IDS.map((id) => [id]))('%s has complete, valid fields', (id) => {
    const m = MISTAKES[id];
    expect(m.id).toBe(id);
    expect(m.label.trim().length).toBeGreaterThan(3);
    expect(m.label.length).toBeLessThanOrEqual(60);
    expect(m.label).not.toBe(id.replace(/_/g, ' '));
    expect(m.label).not.toContain(id);
    expect(CATEGORIES).toContain(m.category);
    expect(m.explain.trim().length).toBeGreaterThan(40);
    expect(m.fix.trim().length).toBeGreaterThan(20);
    for (const snippet of [m.example.bad, m.example.good]) {
      expect(snippet.trim().length).toBeGreaterThan(0);
      expect(lines(snippet)).toBeLessThanOrEqual(6);
    }
    expect(m.example.bad).not.toBe(m.example.good);
    if (id !== 'import_used') expect(m.example.bad).not.toMatch(/^\s*(import|from)\s/m);
    expect(m.example.good).not.toMatch(/^\s*(import|from)\s/m);
    for (const text of [m.label, m.explain, m.fix, m.example.bad, m.example.good]) expect(text).not.toMatch(EMOJI);
    for (const md of [m.explain, m.fix]) expectCleanMd(md);
    if (m.pattern) expect(PATTERN_IDS).toContain(m.pattern);
    for (const flag of m.astFlags ?? []) expect(AST_FLAGS).toContain(flag);
    for (const r of m.runtime ?? []) {
      expect(r.type).toMatch(/^[A-Z]\w+$/);
      if (r.message !== undefined) {
        expect(r.message.length).toBeGreaterThan(0);
        expect(() => new RegExp(r.message as string)).not.toThrow();
        expect(() => new RegExp(r.message as string, 'u')).not.toThrow();
      }
    }
  });

  it('labels are unique', () => {
    const labels = MISTAKE_IDS.map((id) => MISTAKES[id].label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('every mistake with a pattern is listed in that card\'s triggers', () => {
    for (const id of MISTAKE_IDS) {
      const p = MISTAKES[id].pattern;
      if (p) expect(PATTERN_BY_ID[p].triggers, `${id} -> ${p}`).toContain(id);
    }
  });
});

describe('pattern cards', () => {
  it('has one card per PATTERN_ID in id order', () => {
    expect(PATTERNS.map((p) => p.id)).toEqual([...PATTERN_IDS]);
    expect(Object.keys(PATTERN_BY_ID).sort()).toEqual([...PATTERN_IDS].sort());
  });

  it('has no list-comprehension card', () => {
    expect(PATTERNS.some((p) => /comprehension/i.test(p.id + p.title))).toBe(false);
  });

  it.each(PATTERN_IDS.map((id) => [id]))('%s has complete, valid fields', (id) => {
    const p = PATTERN_BY_ID[id];
    expect(p.id).toBe(id);
    expect(p.title.trim().length).toBeGreaterThan(5);
    expect(p.why.trim().length).toBeGreaterThan(60);
    expect(p.bad.trim().length).toBeGreaterThan(0);
    expect(p.good.trim().length).toBeGreaterThan(0);
    expect(p.bad).not.toBe(p.good);
    expect(lines(p.bad)).toBeLessThanOrEqual(8);
    expect(lines(p.good)).toBeLessThanOrEqual(8);
    expect(p.reference.trim().length).toBeGreaterThan(5);
    expect(p.triggers.length).toBeGreaterThan(0);
    for (const t of p.triggers) expect(MISTAKE_IDS).toContain(t);
    for (const f of p.idiomFlags) expect(AST_FLAGS).toContain(f);
    expect(TOPIC_IDS).toContain(p.topicId);
    for (const text of [p.title, p.why, p.bad, p.good, p.reference]) expect(text).not.toMatch(EMOJI);
    expectCleanMd(p.why);
    expect(p.bad + p.good).not.toMatch(/^\s*(import|from)\s/m);
  });
});

describe('matchError', () => {
  it.each(CAPTURED)('%s: %s %j', (_snippet, type, message, expected) => {
    expect(matchError({ type, message })).toEqual(expected);
  });

  it('returns the broad fallback only when nothing more specific matched', () => {
    expect(matchError({ type: 'SyntaxError', message: 'invalid syntax' })).toEqual(['syntax_other']);
    expect(matchError({ type: 'SyntaxError', message: "expected ':'" })).toEqual(['missing_colon']);
    expect(matchError({ type: 'TypeError', message: 'something new in Python 3.15' })).toEqual(['type_error_other']);
    expect(matchError({ type: 'TypeError', message: "'list' object is not callable" })).toEqual(['shadow_builtin']);
  });

  it('matches our runtime budget errors and import blocking', () => {
    expect(matchError({ type: 'TimeoutError', message: 'budget' })).toEqual(['infinite_while']);
    expect(matchError({ type: 'OutputLimit', message: '' })).toEqual(['infinite_while']);
    expect(matchError({ type: 'ImportError', message: "import of 'csv' is not allowed" })).toEqual(['import_used']);
    expect(matchError({ type: 'RecursionError', message: 'maximum recursion depth exceeded' })).toEqual(['missing_base_case']);
  });

  it('never throws on odd input', () => {
    expect(matchError({ type: 'WeirdError', message: 'x' })).toEqual([]);
    expect(matchError({ type: '', message: '' })).toEqual([]);
    expect(matchError({ type: 'KeyError', message: undefined as unknown as string })).toEqual(['dict_keyerror']);
  });

  it('every runtime matcher is exercised by at least one captured message (except synthetic types)', () => {
    const synthetic = new Set(['TimeoutError', 'OutputLimit', 'ImportError']);
    for (const id of MISTAKE_IDS) {
      for (const r of MISTAKES[id].runtime ?? []) {
        if (synthetic.has(r.type)) continue;
        const re = r.message ? new RegExp(r.message) : null;
        const hit = CAPTURED.some(([, type, message]) => type === r.type && (!re || re.test(message)));
        expect(hit, `${id}: ${r.type} /${r.message ?? ''}/`).toBe(true);
      }
    }
  });
});

describe('explainError', () => {
  const COMMON: [string, string][] = [
    ['SyntaxError', 'invalid syntax'], ['IndentationError', 'unexpected indent'], ['TabError', 'inconsistent use of tabs and spaces in indentation'],
    ['NameError', "name 'x' is not defined"], ['TypeError', 'weird'], ['ValueError', 'weird'], ['IndexError', 'weird'],
    ['KeyError', "'banana'"], ['AttributeError', 'weird'], ['ZeroDivisionError', 'division by zero'],
    ['RecursionError', 'maximum recursion depth exceeded'], ['UnboundLocalError', "cannot access local variable 'total' where it is not associated with a value"],
    ['FileNotFoundError', "[Errno 44] No such file or directory: 'data.csv'"], ['EOFError', 'EOF when reading a line'],
    ['ImportError', 'weird'], ['ModuleNotFoundError', "No module named 'numpy'"], ['TimeoutError', ''], ['OutputLimit', ''],
    ['AssertionError', ''], ['RuntimeError', 'weird'], ['OverflowError', 'weird'], ['SyntaxWarning', 'weird'], ['KeyboardInterrupt', ''],
    ['MemoryError', ''], ['OSError', 'weird'], ['SomethingNewError', 'weird'],
  ];

  const check = (type: string, message: string, line?: number) => {
    const ex = explainError({ type, message, line });
    expect(ex.title.trim().length).toBeGreaterThan(type.length);
    expect(ex.meaning.trim().length).toBeGreaterThan(20);
    expect(ex.fix.trim().length).toBeGreaterThan(10);
    for (const text of [ex.title, ex.meaning, ex.fix]) {
      expect(text).not.toMatch(/undefined|null|NaN|\[object/);
      expect(text).not.toMatch(EMOJI);
    }
    expectCleanMd(ex.meaning);
    expectCleanMd(ex.fix);
    expect(ex.mistakes).toEqual(matchError({ type, message }));
    return ex;
  };

  it.each(COMMON)('%s gives a non-empty explanation', (type, message) => {
    check(type, message);
    check(type, '');
    const withLine = check(type, message, 7);
    expect(withLine.meaning).toMatch(/line 7/);
  });

  it.each(CAPTURED)('%s: %s explanation is complete', (_snippet, type, message) => {
    check(type, message, 3);
  });

  it('does not mention a line when none is given', () => {
    expect(explainError({ type: 'KeyError', message: "'a'" }).meaning).not.toMatch(/line/);
    expect(explainError({ type: 'KeyError', message: "'a'", line: 0 }).meaning).not.toMatch(/line 0/);
  });

  it('uses specific titles and wording', () => {
    expect(explainError({ type: 'KeyError', message: "'banana'" }).title).toBe("KeyError: that key isn't in the dictionary");
    expect(explainError({ type: 'KeyError', message: "'banana'" }).meaning).toContain("`'banana'`");
    const imp = explainError({ type: 'ModuleNotFoundError', message: "No module named 'numpy'" });
    expect(imp.meaning.toLowerCase()).toContain('imports of that module are not available here');
    expect(imp.meaning).toContain('CITS1401 projects do not allow imports');
    expect(explainError({ type: 'ImportError', message: 'blocked' }).meaning).toContain('CITS1401 projects do not allow imports');
    expect(explainError({ type: 'TimeoutError', message: '' }).meaning).toMatch(/ran too long.*while loop/);
    expect(explainError({ type: 'OutputLimit', message: '' }).meaning).toMatch(/printed too much output.*infinite loop/);
    expect(explainError({ type: 'NameError', message: "name 'totl' is not defined. Did you mean: 'total'?" }).meaning).toContain('`total`');
    expect(explainError({ type: 'SyntaxError', message: "expected ':'", line: 4 }).meaning).toMatch(/^Python couldn't read line 4/);
    expect(explainError({ type: 'TypeError', message: 'can only concatenate str (not "int") to str' }).mistakes).toEqual(['str_int_concat']);
  });

  it('sanitises backticks from messages', () => {
    const ex = explainError({ type: 'KeyError', message: "'a`b'" });
    expect((ex.meaning.match(/`/g) ?? []).length % 2).toBe(0);
  });
});

describe('example snippets compile in Python 3.14', () => {
  let tryCompile: (src: string) => { type: string | null; message?: string };

  beforeAll(async () => {
    const { loadPyodide } = await import('pyodide');
    const py = await loadPyodide();
    py.runPython(`
import json, warnings
def _pl_try_compile(src):
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        try:
            compile(src, '<student>', 'exec')
        except SyntaxError as e:
            return json.dumps({'type': type(e).__name__, 'message': e.msg})
    return json.dumps({'type': None})
`);
    const fn = py.globals.get('_pl_try_compile') as (src: string) => string;
    tryCompile = (src) => JSON.parse(fn(src));
  }, 120_000);

  const COMPILE_TIME = new Set(['SyntaxError', 'IndentationError', 'TabError']);

  it('every good example compiles; bad examples fail only when the mistake is a compile-time one', () => {
    expect(tryCompile('if x = 5:\n    pass')).toEqual({ type: 'SyntaxError', message: "invalid syntax. Maybe you meant '==' or ':=' instead of '='?" });
    for (const id of MISTAKE_IDS) {
      const m = MISTAKES[id];
      expect(tryCompile(m.example.good), `${id} good`).toEqual({ type: null });
      const bad = tryCompile(m.example.bad);
      const compileTime = (m.runtime ?? []).some((r) => COMPILE_TIME.has(r.type));
      if (bad.type) {
        expect(compileTime, `${id} bad fails to compile: ${bad.message}`).toBe(true);
        expect(matchError({ type: bad.type, message: bad.message ?? '' }), `${id} bad`).toContain(id);
      }
    }
  });

  it('every pattern card snippet compiles', () => {
    for (const p of PATTERNS) {
      expect(tryCompile(p.bad), `${p.id} bad`).toEqual({ type: null });
      expect(tryCompile(p.good), `${p.id} good`).toEqual({ type: null });
    }
  });
});
