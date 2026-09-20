"""Verifier-only entry points. NOT loaded by the browser worker.

These run content through the same Sandbox the graders use, then evaluate expressions in the namespace
the program left behind (probe) or line by line as a shell session (repl). They exist so a lesson's
outputs and pictures come from the interpreter rather than from an author.

They are kept out of `PY_BROWSER_MODULES` on purpose: they are a wrapper around exec/eval, and although
they grant pasted student code nothing it does not already have, there is no reason to ship the surface.
"""
import math
import random
import sys
import types

from .errors import STUDENT, StudentTimeout, register_source, runtime_error, syntax_error
from .harness import (
    _FUNCTION_TYPES, TEST_SEED, _budget, _compile, _dump, _fresh_ns, _json_value, _list_arg, _str_arg,
    _truncate,
)
from .sandbox import Sandbox, reset_workdir


MAX_PROBE_ITEMS = 200
MAX_PROBE_STR = 200

def _jsonable(value, depth=0):
    """Convert a probe result into something JSON can carry. Anything exotic becomes its repr."""
    if value is None or isinstance(value, bool):  # bool before int: True is an int
        return value
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return value if math.isfinite(value) else repr(value)
    if isinstance(value, str):
        return _truncate(value, MAX_PROBE_STR)
    if depth >= 3:
        return _truncate(repr(value), MAX_PROBE_STR)
    if isinstance(value, (list, tuple, set, frozenset)):
        items = list(value)
        return [_jsonable(v, depth + 1) for v in items[:MAX_PROBE_ITEMS]]
    if isinstance(value, dict):
        return {str(k): _jsonable(v, depth + 1) for k, v in list(value.items())[:MAX_PROBE_ITEMS]}
    return _truncate(repr(value), MAX_PROBE_STR)

def probe(code, probes_json, budget_ms=None):
    """Run content code, then evaluate expressions in the namespace it left behind (verifier only).

    This is how a "what if" visualisation stays honest: the picture is drawn from values Python actually
    produced (which indexes a slice really selected, say), not from a JavaScript guess at Python's rules.
    Returns {stdout, values: {id: json-able}, error?, probeErrors?: {id: message}}.
    """
    code = _str_arg(code)
    wanted = _json_value(probes_json)
    if not isinstance(wanted, dict):
        wanted = {}
    budget = _budget(budget_ms, 5000)
    res = {'stdout': '', 'values': {}}
    register_source(code)
    with Sandbox('test') as sb:
        reset_workdir([])
        try:
            code_obj = _compile(code)
        except SyntaxError as e:
            res['error'] = syntax_error(e)
            return _dump(res)
        random.seed(TEST_SEED)
        sb.set_stdin([])
        ns = _fresh_ns()
        out = sb.call(lambda: exec(code_obj, ns), budget_ms=budget)
        res['stdout'] = sb.stdout_value()
        if not out.ok and not isinstance(out.exc, SystemExit):
            res['error'] = runtime_error(out.exc)
            if isinstance(out.exc, StudentTimeout):
                res['timedOut'] = True
            return _dump(res)
        errors = {}
        for pid, src in wanted.items():
            key = str(pid)
            try:
                expr = _compile(str(src), mode='eval')
            except SyntaxError:
                errors[key] = 'is not a Python expression'
                continue
            ev = sb.call(lambda e=expr: eval(e, ns), budget_ms=budget)
            if ev.ok:
                res['values'][key] = _jsonable(ev.value)
            else:
                errors[key] = '%s: %s' % (type(ev.exc).__name__, ev.exc)
        if errors:
            res['probeErrors'] = errors
    return _dump(res)

def repl(lines_json, stdin_lines=None, budget_ms=None):
    """Run lines as a Python shell session and record what each one did (verifier only).

    A lesson that shows ">>> 2 + 3" followed by "5" must get that 5 from the interpreter, not from an
    author. Each line runs in one shared namespace; a line that is an expression records the repr of its
    value, anything else records what it printed. A line that raises records the error and the session
    carries on, because showing a failure is often the point.
    """
    sources = [_str_arg(x) for x in _list_arg(lines_json)]
    stdin = [str(s) for s in _list_arg(stdin_lines)]
    budget = _budget(budget_ms, 5000)
    out = []
    register_source('\n'.join(sources))
    with Sandbox('test') as sb:
        reset_workdir([])
        random.seed(TEST_SEED)
        sb.set_stdin(stdin)
        ns = _fresh_ns()
        for src in sources:
            entry = {'source': src, 'stdout': ''}
            if not src.strip():
                out.append(entry)
                continue
            mode = 'eval'
            try:
                code_obj = _compile(src, mode='eval')
            except SyntaxError:
                mode = 'exec'
                try:
                    code_obj = _compile(src, mode='exec')
                except SyntaxError as e:
                    entry['error'] = syntax_error(e)
                    out.append(entry)
                    continue
            before = len(sb.stdout_value())
            if mode == 'eval':
                res = sb.call(lambda c=code_obj: eval(c, ns), budget_ms=budget)
            else:
                res = sb.call(lambda c=code_obj: exec(c, ns), budget_ms=budget)
            entry['stdout'] = sb.stdout_value()[before:]
            if res.ok:
                # A statement, and an expression evaluating to None, both show nothing: that is the shell's
                # own behaviour and teaching it is part of the point (print() returns None).
                if mode == 'eval' and res.value is not None:
                    entry['value'] = _truncate(_safe_repr(res.value), MAX_PROBE_STR)
            elif not isinstance(res.exc, SystemExit):
                entry['error'] = runtime_error(res.exc)
            out.append(entry)
    return _dump({'lines': out})

def _safe_repr(value):
    try:
        return repr(value)
    except Exception as e:  # noqa: BLE001
        return '<repr failed: %s>' % type(e).__name__


# ---------------- walkthrough (verifier only) ----------------

MAX_WALK_STEPS = 80
MAX_WALK_NAMES = 8
MAX_WALK_ITEMS = 10


def _walk_value(value):
    """A short repr for the variable panel. Anything unprintable becomes a placeholder."""
    try:
        r = repr(value)
    except Exception as e:  # noqa: BLE001
        return '<repr failed: %s>' % type(e).__name__
    return r if len(r) <= 60 else r[:57] + '...'


def _interesting(name, value):
    """Names a reader would recognise from the program: not machinery, not imports, not functions."""
    if name.startswith('_'):
        return False
    if isinstance(value, types.ModuleType) or isinstance(value, _FUNCTION_TYPES):
        return False
    return not isinstance(value, type)


class _Walker:
    """Records the state after every line of the program, so a reader can step through it afterwards.

    The snapshot is taken at the NEXT line event in the same frame, which is the moment the line just
    recorded has finished. That is the same trick RowRecorder uses for a single anchor line, widened to
    every line so the result is a full walkthrough rather than a trace table.
    """

    def __init__(self, watch, sandbox):
        self.watch = [str(w) for w in watch] if watch else None
        self.sb = sandbox
        self.steps = []
        self.pending = {}
        self.overflow = False

    def _snapshot(self, frame, line):
        if len(self.steps) >= MAX_WALK_STEPS:
            self.overflow = True
            return
        scope = dict(frame.f_globals)
        scope.update(frame.f_locals)
        names = self.watch if self.watch is not None else [
            k for k, v in scope.items() if _interesting(k, v)
        ][:MAX_WALK_NAMES]
        seen = {}
        items = {}
        for name in names:
            if name not in scope:
                continue
            value = scope[name]
            seen[name] = _walk_value(value)
            # A list or tuple is drawn as boxes rather than as its repr, so a reader can see which item
            # a loop is on. Recorded here because only Python knows what the elements really are.
            if isinstance(value, (list, tuple)) and len(value) <= MAX_WALK_ITEMS:
                items[name] = [_walk_value(v) for v in value]
        step = {'line': line, 'vars': seen, 'out': len(self.sb.stdout_value())}
        if items:
            step['items'] = items
        self.steps.append(step)

    def _local(self, frame, event, arg):
        if event in ('line', 'return'):
            key = id(frame)
            was = self.pending.pop(key, None)
            if was is not None:
                self._snapshot(frame, was)
            if event == 'line':
                self.pending[key] = frame.f_lineno
        return self._local

    def _global(self, frame, event, arg):
        return self._local if frame.f_code.co_filename == STUDENT else None

    def install(self):
        sys.settrace(self._global)

    def uninstall(self):
        sys.settrace(None)
        for key, line in list(self.pending.items()):
            self.pending.pop(key, None)


def walk(code, watch_json=None, budget_ms=None):
    """Record the state after every line, for a step-through walkthrough (verifier only).

    Returns {steps: [{line, vars, out}], stdout, error?, overflow}. `out` is how many characters had been
    printed by that point, so the reader sees output appear as they step rather than all at once.
    """
    code = _str_arg(code)
    watch = [str(w) for w in _list_arg(watch_json)] or None
    budget = _budget(budget_ms, 5000)
    res = {'steps': [], 'stdout': ''}
    register_source(code)
    with Sandbox('test') as sb:
        reset_workdir([])
        try:
            code_obj = _compile(code)
        except SyntaxError as e:
            res['error'] = syntax_error(e)
            return _dump(res)
        random.seed(TEST_SEED)
        sb.set_stdin([])
        ns = _fresh_ns()
        walker = _Walker(watch, sb)

        def run():
            walker.install()
            try:
                exec(code_obj, ns)
            finally:
                walker.uninstall()

        out = sb.call(run, budget_ms=budget)
        res['stdout'] = sb.stdout_value()
        res['steps'] = walker.steps
        if walker.overflow:
            res['overflow'] = True
        if not out.ok and not isinstance(out.exc, SystemExit):
            res['error'] = runtime_error(out.exc)
    return _dump(res)
