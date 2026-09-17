"""Public entry points of the PyLadder Python runtime.

Every function takes plain JSON-able arguments (Python values, Pyodide JsProxy objects, or JSON strings for
list/object arguments) and returns a JSON string whose shape matches src/runtime/protocol.ts.

    run_program(code, stdin_lines, files, budget_ms)                 -> RunResult
    run_tests(code, tests_json, kind, fn_name, rules, budget_ms_per_test) -> TestsResult
    analyze(code)                                                     -> {syntaxError?, flags}
    pair(reference, buggy, fn_name, args_repr)                        -> PairResult
    trace(code, watch, anchor_line, stdin_lines)                      -> {rows, stdout, error?}
    run_capture(code, stdin_lines)                                    -> {stdout, error?}

Verifier helpers (not used by the browser): literal_info, defines, constructs.
"""
import ast
import copy
import json
import math
import random
import time
import types
import warnings

from . import astchecks
from .compare import normalize_stdout, return_type_wrong, values_equal
from .errors import (
    STUDENT, InputNotAllowed, NeedInput, OutputLimit, StudentTimeout, register_source, runtime_error,
    simple_error, syntax_error,
)
from .sandbox import Sandbox, read_workdir, reset_workdir
from .tracer import RowRecorder

DEFAULT_RUN_BUDGET_MS = 2000
DEFAULT_TEST_BUDGET_MS = 1000
TEST_SEED = 1401
MAX_GOT_REPR = 4000
_perf = time.perf_counter
_FUNCTION_TYPES = (types.FunctionType, types.BuiltinFunctionType, types.MethodType, types.LambdaType)


# ---------------- argument helpers ----------------

def _plain(x):
    if x is not None and hasattr(x, 'to_py'):
        try:
            x = x.to_py()
        except Exception:  # pragma: no cover
            pass
    return x


def _str_arg(x, default=''):
    x = _plain(x)
    if x is None:
        return default
    return x if isinstance(x, str) else str(x)


def _opt_str(x):
    x = _plain(x)
    if x is None:
        return None
    s = str(x)
    return s if s.strip() else None


def _json_value(x):
    x = _plain(x)
    if isinstance(x, str):
        s = x.strip()
        if s[:1] in ('[', '{'):
            try:
                return json.loads(s)
            except ValueError:
                return x
    return x


def _list_arg(x):
    x = _json_value(x)
    if x is None:
        return []
    if isinstance(x, str):
        return [x]
    if isinstance(x, dict):
        return [x]
    try:
        return list(x)
    except TypeError:
        return [x]


def _files_arg(x):
    out = []
    for f in _list_arg(x):
        f = _plain(f)
        if isinstance(f, dict) and 'name' in f:
            out.append({'name': str(f['name']), 'content': '' if f.get('content') is None else str(f.get('content'))})
    return out


def _budget(x, default):
    x = _plain(x)
    try:
        v = float(x)
    except (TypeError, ValueError):
        return default
    if math.isnan(v) or v <= 0:
        return default
    return v


def _dump(obj):
    return json.dumps(obj, ensure_ascii=False)


def _compile(code, filename=STUDENT, mode='exec'):
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        try:
            return compile(code, filename, mode, dont_inherit=True)
        except ValueError as e:  # e.g. null bytes
            err = SyntaxError(str(e))
            err.lineno = 1
            err.offset = 1
            err.filename = filename
            raise err from None


def _fresh_ns():
    return {'__name__': '__main__'}


def _ms_since(t0):
    return round((_perf() - t0) * 1000.0, 1)


def _truncate(s, n=MAX_GOT_REPR):
    return s if len(s) <= n else s[:n - 3] + '...'


# ---------------- run_program ----------------

def run_program(code, stdin_lines=None, files=None, budget_ms=None, seed=None):
    """Run a whole program as the Run button does. Returns RunResult JSON."""
    t0 = _perf()
    code = _str_arg(code)
    stdin = [str(s) for s in _list_arg(stdin_lines)]
    vfiles = _files_arg(files)
    budget = _budget(budget_ms, DEFAULT_RUN_BUDGET_MS)
    seed = _plain(seed)
    res = {'stdout': '', 'timedOut': False, 'outputTruncated': False}
    register_source(code)
    with Sandbox('program') as sb:
        reset_workdir(vfiles)
        try:
            code_obj = _compile(code)
        except SyntaxError as e:
            res['error'] = syntax_error(e)
            res['filesAfter'] = read_workdir()
            res['durationMs'] = _ms_since(t0)
            return _dump(res)
        if seed is not None:
            random.seed(seed)
        sb.set_stdin(stdin)
        ns = _fresh_ns()
        out = sb.call(lambda: exec(code_obj, ns), budget_ms=budget)
        res['stdout'] = sb.stdout_value()
        if not out.ok:
            exc = out.exc
            if isinstance(exc, NeedInput):
                res['needInput'] = {'prompt': exc.prompt}
            elif isinstance(exc, SystemExit):
                pass
            else:
                if isinstance(exc, StudentTimeout):
                    res['timedOut'] = True
                res['error'] = runtime_error(exc)
        res['outputTruncated'] = sb.output_truncated()
        res['filesAfter'] = read_workdir()
    res['durationMs'] = _ms_since(t0)
    return _dump(res)


def run_capture(code, stdin_lines=None, budget_ms=None):
    """Run content code for the verifier: seeded random, queued stdin (EOFError when exhausted).
    Returns {stdout, error?, timedOut}."""
    code = _str_arg(code)
    stdin = [str(s) for s in _list_arg(stdin_lines)]
    budget = _budget(budget_ms, 5000)
    res = {'stdout': ''}
    register_source(code)
    with Sandbox('test') as sb:
        reset_workdir([])
        try:
            code_obj = _compile(code)
        except SyntaxError as e:
            res['error'] = syntax_error(e)
            return _dump(res)
        random.seed(TEST_SEED)
        sb.set_stdin(stdin)
        ns = _fresh_ns()
        out = sb.call(lambda: exec(code_obj, ns), budget_ms=budget)
        res['stdout'] = sb.stdout_value()
        if not out.ok and not isinstance(out.exc, SystemExit):
            res['error'] = runtime_error(out.exc)
            if isinstance(out.exc, StudentTimeout):
                res['timedOut'] = True
    return _dump(res)


# ---------------- analyze ----------------

def analyze(code):
    code = _str_arg(code)
    flags, _tree = astchecks.check(code)
    res = {'flags': flags}
    register_source(code)
    try:
        _compile(code)
    except SyntaxError as e:
        res['syntaxError'] = syntax_error(e)
    return _dump(res)


# ---------------- run_tests ----------------

def _printed_expected(stdout, expected):
    if not stdout or expected is None:
        return False
    try:
        cands = {repr(expected), str(expected)}
    except Exception:  # pragma: no cover
        return False
    lines = {ln.strip() for ln in stdout.splitlines()}
    for c in cands:
        if c in lines:
            return True
        if len(c) >= 3 and c in stdout:
            return True
    return False


def _base_outcome(t):
    o = {
        'id': str(t.get('id', '')),
        'label': str(t.get('label', t.get('id', ''))),
        'hidden': bool(t.get('hidden', False)),
    }
    tag = t.get('tag')
    if tag:
        o['tag'] = str(tag)
    o.update({'pass': False, 'stdout': '', 'timedOut': False, 'detections': []})
    return o


def _add(o, mistake):
    if mistake and mistake not in o['detections']:
        o['detections'].append(mistake)


def _in_while(line, whiles):
    return line is not None and any(a <= line <= b for a, b in whiles)


def _fail(o, exc, sb, whiles, kind):
    o['stdout'] = sb.stdout_value()
    if isinstance(exc, SystemExit):
        o['error'] = simple_error('SystemExit', 'Your code called exit(), which would stop the marker\'s whole test run')
    else:
        o['error'] = runtime_error(exc)
    if isinstance(exc, StudentTimeout):
        o['timedOut'] = True
        if _in_while(o['error'].get('line'), whiles):
            _add(o, 'infinite_while')
    if isinstance(exc, KeyboardInterrupt):
        o['_stop'] = True
    if o.get('tag'):
        _add(o, o['tag'])
    if kind == 'project' and (sb.input_called or isinstance(exc, EOFError)):
        _add(o, 'input_called')


def _test_error(o, message):
    o['error'] = simple_error('TestError', message)
    return o


def _run_one_test(sb, code_obj, t, kind, budget, whiles, timing):
    o = _base_outcome(t)
    start = _perf()
    try:
        return _run_one_test_inner(sb, code_obj, t, kind, budget, whiles, o)
    finally:
        if timing:
            o['durationMs'] = _ms_since(start)


def _run_one_test_inner(sb, code_obj, t, kind, budget, whiles, o):
    call = t.get('call')
    has_call = isinstance(call, str) and call.strip() != ''
    cmp = t.get('cmp') or 'eq'
    tol = t.get('tol')
    expected = None
    call_obj = None
    if has_call:
        expect_src = t.get('expect')
        if not isinstance(expect_src, str) or not expect_src.strip():
            return _test_error(o, 'This test has a call but no expected value')
        o['expected'] = expect_src
        try:
            expected = ast.literal_eval(expect_src.strip())
        except Exception as e:  # noqa: BLE001
            return _test_error(o, 'The expected value %s is not a Python literal (%s)' % (expect_src, e))
        try:
            call_obj = _compile(call.strip(), '<test>', 'eval')
        except SyntaxError as e:
            return _test_error(o, 'The test call %s is not valid Python (%s)' % (call, e.msg))
    else:
        exp_stdout = t.get('expectStdout')
        if not isinstance(exp_stdout, str):
            return _test_error(o, 'This test has neither a call nor expectStdout')
        o['expected'] = exp_stdout
    setup = t.get('setup')
    setup_obj = None
    if isinstance(setup, str) and setup.strip():
        try:
            setup_obj = _compile(setup, '<setup>', 'exec')
        except SyntaxError as e:
            return _test_error(o, 'The test setup is not valid Python (%s)' % e.msg)

    reset_workdir(_files_arg(t.get('files')))
    random.seed(TEST_SEED)
    sb.set_stdin([str(s) for s in _list_arg(t.get('stdin'))])
    sb.new_output()
    sb.budget_ms = budget
    deadline = _perf() + budget / 1000.0
    ns = _fresh_ns()

    out = sb.call(lambda: exec(code_obj, ns), deadline=deadline)
    if not out.ok and (has_call or not isinstance(out.exc, SystemExit)):
        _fail(o, out.exc, sb, whiles, kind)
        return o

    if not has_call:
        stdout = sb.stdout_value()
        o['stdout'] = stdout
        o['pass'] = normalize_stdout(stdout) == normalize_stdout(t.get('expectStdout'))
        if not o['pass'] and o.get('tag'):
            _add(o, o['tag'])
        if kind == 'project' and sb.input_called:
            _add(o, 'input_called')
        return o

    if setup_obj is not None:
        out = sb.call(lambda: exec(setup_obj, ns), deadline=deadline)
        if not out.ok:
            _fail(o, out.exc, sb, whiles, kind)
            return o

    snapshots = {}
    for name in _list_arg(t.get('argsUnchanged')):
        name = str(name)
        if name in ns:
            try:
                snapshots[name] = copy.deepcopy(ns[name])
            except Exception:  # noqa: BLE001
                pass

    sb.new_output()
    holder = {}

    def do_call():
        value = eval(call_obj, ns)
        holder['value'] = value
        holder['repr'] = repr(value)

    out = sb.call(do_call, deadline=deadline)
    if not out.ok:
        _fail(o, out.exc, sb, whiles, kind)
        return o
    stdout = sb.stdout_value()
    o['stdout'] = stdout
    got = holder.get('value')
    o['got'] = _truncate(holder.get('repr', ''))
    ok = values_equal(got, expected, cmp, tol)
    for name, snap in snapshots.items():
        if not values_equal(ns.get(name), snap, 'eq', nan_equal=True):
            ok = False
            _add(o, 'mutated_input')
    o['pass'] = ok
    if not ok:
        if o.get('tag'):
            _add(o, o['tag'])
        if got is None and expected is not None and _printed_expected(stdout, expected):
            _add(o, 'print_vs_return')
        if '<function ' in stdout or '<bound method ' in stdout or isinstance(got, _FUNCTION_TYPES):
            _add(o, 'forgot_to_call')
        if got is not None and return_type_wrong(got, expected, tol):
            _add(o, 'return_type_wrong')
    if kind == 'project' and sb.input_called:
        _add(o, 'input_called')
    return o


def _not_run(t):
    o = _base_outcome(t)
    o['notRun'] = True
    return o


def run_tests(code, tests_json, kind='function', fn_name=None, rules=None, budget_ms_per_test=None, timing=False):
    """Run tests against student code. Returns TestsResult JSON."""
    code = _str_arg(code)
    tests = [dict(_plain(t)) for t in _list_arg(tests_json) if isinstance(_plain(t), dict)]
    kind = _str_arg(kind, 'function') or 'function'
    fn_name = _opt_str(fn_name)
    rule_list = [str(r) for r in _list_arg(rules)]
    budget = _budget(budget_ms_per_test, DEFAULT_TEST_BUDGET_MS)
    timing = bool(_plain(timing))

    flags, tree = astchecks.check(code)
    result = {
        'outcomes': [],
        'flags': flags,
        'ruleViolations': astchecks.rule_violations(tree, flags, rule_list, tests),
        'passed': 0,
        'total': len(tests),
    }
    register_source(code)
    try:
        code_obj = _compile(code)
    except SyntaxError as e:
        result['compileError'] = syntax_error(e)
        return _dump(result)

    whiles = astchecks.while_lines(tree)
    with Sandbox('test', block_all_imports='noImport' in rule_list) as sb:
        needs_preflight = kind != 'program' and (fn_name is not None or any(t.get('call') for t in tests))
        if needs_preflight:
            reset_workdir([])
            random.seed(TEST_SEED)
            sb.set_stdin([])
            sb.input_mode = 'preflight'
            ns = _fresh_ns()
            out = sb.call(lambda: exec(code_obj, ns), budget_ms=budget)
            sb.input_mode = 'test'
            if not out.ok:
                exc = out.exc
                if isinstance(exc, SystemExit):
                    err = simple_error('SystemExit', 'Your file calls exit() while loading, so no tests could run')
                else:
                    err = runtime_error(exc)
                err['mistakes'] = ['top_level_code']
                result['topLevelError'] = err
                return _dump(result)
            if fn_name is not None and not callable(ns.get(fn_name)):
                result['missingFunction'] = fn_name
                return _dump(result)

        stop = False
        for t in tests:
            if stop:
                result['outcomes'].append(_not_run(t))
                continue
            o = _run_one_test(sb, code_obj, t, kind, budget, whiles, timing)
            if o.pop('_stop', False) or o['timedOut']:
                stop = True
            result['outcomes'].append(o)
    result['passed'] = sum(1 for o in result['outcomes'] if o['pass'])
    return _dump(result)


# ---------------- pair ----------------

_TUPLE_HELP = 'Enter the arguments as a Python tuple of values, for example ([3, 1, 2],) or (5, "abc"). ' \
              'One argument needs a trailing comma: (5,).'


def _parse_args(args_repr):
    src = args_repr.strip()
    if not src:
        raise ValueError(_TUPLE_HELP)
    try:
        value = ast.literal_eval(src)
    except (ValueError, SyntaxError, TypeError, MemoryError, RecursionError) as e:
        raise ValueError('%s (%s)' % (_TUPLE_HELP, str(e).split('\n')[0] or type(e).__name__)) from None
    if not isinstance(value, tuple):
        raise ValueError('That is a %s, not a tuple. %s' % (type(value).__name__, _TUPLE_HELP))
    return value


def _describe_exc(exc):
    if isinstance(exc, SyntaxError):
        return 'raises SyntaxError: %s' % (exc.msg or '')
    err = runtime_error(exc)
    msg = err.get('message') or ''
    return 'raises %s%s' % (err['type'], (': ' + msg) if msg else '')


def _run_impl(code, fn_name, args_repr, budget):
    """Returns (kind, payload, text): ('value', v, repr) or ('raises', type_name, text)."""
    args = _parse_args(args_repr)
    register_source(code)
    try:
        code_obj = _compile(code)
    except SyntaxError as e:
        return ('raises', 'SyntaxError', _describe_exc(e))
    with Sandbox('test') as sb:
        reset_workdir([])
        random.seed(TEST_SEED)
        sb.set_stdin([])
        sb.budget_ms = budget
        deadline = _perf() + budget / 1000.0
        ns = _fresh_ns()
        out = sb.call(lambda: exec(code_obj, ns), deadline=deadline)
        if not out.ok:
            return ('raises', runtime_error(out.exc)['type'], _describe_exc(out.exc))
        fn = ns.get(fn_name)
        if not callable(fn):
            return ('raises', 'NameError', "raises NameError: name '%s' is not defined" % fn_name)
        holder = {}

        def do_call():
            value = fn(*args)
            holder['value'] = value
            holder['repr'] = repr(value)

        out = sb.call(do_call, deadline=deadline)
        if not out.ok:
            return ('raises', runtime_error(out.exc)['type'], _describe_exc(out.exc))
        return ('value', holder.get('value'), _truncate(holder.get('repr', '')))


def pair(reference, buggy, fn_name, args_repr, budget_ms=None):
    """Run reference and buggy implementations on the same argument tuple. Returns PairResult JSON."""
    reference = _str_arg(reference)
    buggy = _str_arg(buggy)
    fn_name = _str_arg(fn_name)
    args_repr = _str_arg(args_repr)
    budget = _budget(budget_ms, DEFAULT_TEST_BUDGET_MS)
    res = {'validArgs': False, 'differs': False, 'refResult': '', 'bugResult': ''}
    try:
        _parse_args(args_repr)
    except ValueError as e:
        res['parseError'] = str(e)
        return _dump(res)
    res['validArgs'] = True
    ref = _run_impl(reference, fn_name, args_repr, budget)
    bug = _run_impl(buggy, fn_name, args_repr, budget)
    res['refResult'] = ref[2]
    res['bugResult'] = bug[2]
    if ref[0] != bug[0]:
        res['differs'] = True
    elif ref[0] == 'raises':
        res['differs'] = ref[1] != bug[1]
    else:
        res['differs'] = not values_equal(bug[1], ref[1], 'float', nan_equal=True)
    return _dump(res)


# ---------------- trace ----------------

def trace(code, watch, anchor_line, stdin_lines=None, budget_ms=None):
    """Trace-table rows for a trace question. Returns {rows, stdout, error?}."""
    code = _str_arg(code)
    watch_names = [str(w) for w in _list_arg(watch)]
    try:
        anchor = int(_plain(anchor_line))
    except (TypeError, ValueError):
        anchor = 0
    stdin = [str(s) for s in _list_arg(stdin_lines)]
    budget = _budget(budget_ms, 5000)
    res = {'rows': [], 'stdout': ''}
    register_source(code)
    try:
        code_obj = _compile(code)
    except SyntaxError as e:
        res['error'] = syntax_error(e)
        return _dump(res)
    rec = RowRecorder(watch_names, anchor)
    with Sandbox('test') as sb:
        reset_workdir([])
        random.seed(TEST_SEED)
        sb.set_stdin(stdin)
        ns = _fresh_ns()

        def run():
            rec.install()
            try:
                exec(code_obj, ns)
            finally:
                rec.uninstall()

        out = sb.call(run, budget_ms=budget)
        res['stdout'] = sb.stdout_value()
        if not out.ok and not isinstance(out.exc, SystemExit):
            res['error'] = runtime_error(out.exc)
    res['rows'] = rec.rows
    return _dump(res)


# ---------------- verifier helpers ----------------

def _has_float(node):
    for n in ast.walk(node):
        if isinstance(n, ast.Constant) and isinstance(n.value, float):
            return True
        if isinstance(n, ast.Constant) and isinstance(n.value, complex):
            return True
    return False


def literal_info(expr):
    """{ok, error?, hasFloat, isTuple, typeName} for a test's expect string or an argsExample."""
    expr = _str_arg(expr)
    res = {'ok': False, 'hasFloat': False, 'isTuple': False, 'typeName': ''}
    try:
        tree = ast.parse(expr.strip(), mode='eval')
        value = ast.literal_eval(expr.strip())
    except Exception as e:  # noqa: BLE001
        res['error'] = '%s: %s' % (type(e).__name__, str(e).split('\n')[0])
        return _dump(res)
    res['ok'] = True
    res['hasFloat'] = _has_float(tree)
    res['isTuple'] = isinstance(value, tuple)
    res['typeName'] = type(value).__name__
    return _dump(res)


def defines(code, fn_name):
    """{compileError?, error?, defined} after executing code at module level."""
    code = _str_arg(code)
    fn_name = _str_arg(fn_name)
    res = {'defined': False}
    register_source(code)
    try:
        code_obj = _compile(code)
    except SyntaxError as e:
        res['compileError'] = syntax_error(e)
        return _dump(res)
    with Sandbox('preflight') as sb:
        reset_workdir([])
        random.seed(TEST_SEED)
        ns = _fresh_ns()
        out = sb.call(lambda: exec(code_obj, ns), budget_ms=DEFAULT_TEST_BUDGET_MS)
        if not out.ok:
            res['error'] = runtime_error(out.exc)
        res['defined'] = callable(ns.get(fn_name))
    return _dump(res)


def constructs(code):
    """Constructs used in code, for concept-order warnings: {parsed, used: [...], defs: [...]}."""
    code = _str_arg(code)
    try:
        tree = ast.parse(code)
    except (SyntaxError, ValueError):
        return _dump({'parsed': False, 'used': [], 'defs': []})
    used = set()
    defs = []
    for n in ast.walk(tree):
        if isinstance(n, (ast.For, ast.AsyncFor)):
            used.add('for')
        elif isinstance(n, ast.While):
            used.add('while')
        elif isinstance(n, (ast.Dict, ast.DictComp)) or (isinstance(n, ast.Call) and isinstance(n.func, ast.Name)
                                                         and n.func.id == 'dict'):
            used.add('dict')
        elif isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == 'open':
            used.add('open')
        elif isinstance(n, (ast.Try,) + ((ast.TryStar,) if hasattr(ast, 'TryStar') else ())):
            used.add('try')
        elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defs.append(n.name)
        elif isinstance(n, (ast.Import, ast.ImportFrom)):
            used.add('import')
        elif isinstance(n, (ast.ListComp, ast.SetComp, ast.GeneratorExp)):
            used.add('comprehension')
        elif isinstance(n, ast.ClassDef):
            used.add('class')
        elif isinstance(n, ast.Lambda):
            used.add('lambda')
    if defs:
        used.add('def')
    for f in astchecks.check_tree(tree):
        if f['flag'] == 'recursion_present':
            used.add('recursion')
    return _dump({'parsed': True, 'used': sorted(used), 'defs': defs})
