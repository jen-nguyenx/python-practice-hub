"""Execution sandbox for student code.

Responsibilities: capped stdout capture, queued input(), import blocking, soft time budget,
recursion limit, virtual working directory, and restoring every patched global afterwards.

The soft budget uses sys.monitoring (PEP 669) LINE and JUMP events restricted to '<student>' code.
sys.settrace is not used for the budget because CPython uninstalls a trace function that raises,
so a student's bare `except:` inside a loop would swallow the timeout and the loop would never stop.
Monitoring callbacks keep firing after they raise, so an abort is re-raised at the next student line.
"""
import builtins
import os
import shutil
import sys
import time

from .errors import STUDENT, InputNotAllowed, NeedInput, OutputLimit, StudentTimeout

OUTPUT_CAP = 64 * 1024
STUDENT_RECURSION = 500
CHECK_EVERY = 64
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(ROOT, 'work')

ALWAYS_BLOCKED = frozenset({
    'os', 'sys', 'subprocess', 'js', 'pyodide', 'pyodide_js', '_pyodide', 'micropip', '_pl',
    'importlib', 'builtins', 'ctypes', 'socket', 'shutil', 'pathlib', 'gc', 'inspect', 'threading',
    'multiprocessing', 'signal', 'posix', 'nt', 'pty', 'tty', 'site', 'pdb',
})

_REAL_IMPORT = builtins.__import__
_MON = sys.monitoring
_ACTIVE = None
_TOOL = [None]
_perf = time.perf_counter


def _seconds_text(ms):
    s = ms / 1000.0
    if abs(s - round(s)) < 1e-9:
        n = int(round(s))
        return '%d second%s' % (n, '' if n == 1 else 's')
    return '%g seconds' % s


def _frame_depth():
    f = sys._getframe(1)
    n = 0
    while f is not None:
        n += 1
        f = f.f_back
    return n


class CappedWriter:
    """File-like stdout replacement that stops the program once OUTPUT_CAP bytes were written."""

    encoding = 'utf-8'
    errors = 'strict'

    def __init__(self, sandbox, cap=OUTPUT_CAP):
        self._sb = sandbox
        self._parts = []
        self._size = 0
        self._cap = cap
        self.truncated = False

    def write(self, s):
        if not isinstance(s, str):
            raise TypeError('write() argument must be str, not %s' % type(s).__name__)
        if self.truncated:
            raise self._sb.trigger_abort('output')
        n = len(s) if s.isascii() else len(s.encode('utf-8', 'surrogatepass'))
        if self._size + n > self._cap:
            room = self._cap - self._size
            if room > 0:
                self._parts.append(s.encode('utf-8', 'surrogatepass')[:room].decode('utf-8', 'ignore'))
            self._size = self._cap
            self.truncated = True
            raise self._sb.trigger_abort('output')
        self._parts.append(s)
        self._size += n
        return len(s)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def flush(self):
        pass

    def isatty(self):
        return False

    def writable(self):
        return True

    def readable(self):
        return False

    def getvalue(self):
        return ''.join(self._parts)


class NullWriter:
    encoding = 'utf-8'

    def write(self, s):
        return len(s) if isinstance(s, str) else 0

    def flush(self):
        pass

    def isatty(self):
        return False


def _acquire_tool():
    for tid in (4, 3, 2, 1, 0, 5):
        try:
            _MON.use_tool_id(tid, 'pyladder')
            return tid
        except ValueError:
            continue
    return None


def _on_event(code, *_args):
    if code.co_filename != STUDENT:
        return _MON.DISABLE
    sb = _ACTIVE
    if sb is None:
        return None
    if sb.abort is not None:
        raise sb.make_abort()
    sb.events += 1
    if sb.events >= sb.next_check:
        sb.next_check = sb.events + CHECK_EVERY
        if _perf() > sb.deadline:
            sb.timed_out = True
            raise sb.trigger_abort('timeout')
    return None


def _monitor_on(sb):
    global _ACTIVE
    _ACTIVE = sb
    tid = _acquire_tool()
    _TOOL[0] = tid
    if tid is None:
        return
    ev = _MON.events
    _MON.register_callback(tid, ev.LINE, _on_event)
    _MON.register_callback(tid, ev.JUMP, _on_event)
    _MON.set_events(tid, ev.LINE | ev.JUMP)


def _monitor_off():
    global _ACTIVE
    _ACTIVE = None
    tid = _TOOL[0]
    _TOOL[0] = None
    if tid is None:
        return
    try:
        _MON.set_events(tid, 0)
        _MON.register_callback(tid, _MON.events.LINE, None)
        _MON.register_callback(tid, _MON.events.JUMP, None)
    finally:
        _MON.free_tool_id(tid)


class CallOutcome:
    __slots__ = ('ok', 'value', 'exc', 'ms')

    def __init__(self, ok, value=None, exc=None, ms=0.0):
        self.ok = ok
        self.value = value
        self.exc = exc
        self.ms = ms


def _safe_name(name):
    name = str(name).replace('\\', '/')
    parts = [p for p in name.split('/') if p not in ('', '.', '..')]
    return '/'.join(parts) or 'file'


def reset_workdir(files):
    """Clear the virtual working directory, write files into it and chdir there."""
    try:
        os.chdir(ROOT)
    except OSError:
        os.makedirs(ROOT, exist_ok=True)
        os.chdir(ROOT)
    if os.path.isdir(WORK):
        shutil.rmtree(WORK, ignore_errors=True)
    os.makedirs(WORK, exist_ok=True)
    for f in files or []:
        rel = _safe_name(f.get('name', 'file'))
        path = os.path.join(WORK, rel)
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(path, 'w', encoding='utf-8', newline='') as fh:
            fh.write(str(f.get('content', '')))
    os.chdir(WORK)


def read_workdir(max_bytes=256 * 1024):
    out = []
    if not os.path.isdir(WORK):
        return out
    for dirpath, _dirs, names in os.walk(WORK):
        for n in names:
            path = os.path.join(dirpath, n)
            rel = os.path.relpath(path, WORK).replace(os.sep, '/')
            try:
                with open(path, 'rb') as fh:
                    data = fh.read(max_bytes + 1)
            except OSError:
                continue
            text = data[:max_bytes].decode('utf-8', 'replace')
            out.append({'name': rel, 'content': text})
    out.sort(key=lambda f: f['name'])
    return out


class Sandbox:
    """Context manager that patches the interpreter for student runs and restores it afterwards.

    input_mode:
      'program'   queued lines; when empty stop with NeedInput(prompt)
      'test'      queued lines; when empty raise EOFError
      'preflight' any call raises InputNotAllowed
    """

    def __init__(self, input_mode='program', block_all_imports=False, cap=OUTPUT_CAP):
        self.input_mode = input_mode
        self.block_all_imports = block_all_imports
        self.cap = cap
        self.stdin = []
        self.input_called = False
        self.need_input_prompt = None
        self.abort = None
        self.timed_out = False
        self.events = 0
        self.next_check = CHECK_EVERY
        self.deadline = 0.0
        self.budget_ms = 0
        self.out = None
        self.any_truncated = False
        self._saved = None

    # ----- lifecycle -----
    def __enter__(self):
        self._saved = {
            'builtins': dict(builtins.__dict__),
            'stdout': sys.stdout,
            'stderr': sys.stderr,
            'stdin': sys.stdin,
            'cwd': os.getcwd() if os.path.isdir(os.getcwd()) else ROOT,
            'limit': sys.getrecursionlimit(),
        }
        builtins.input = self._input
        builtins.__import__ = self._import
        builtins.breakpoint = _no_breakpoint
        self.new_output()
        sys.stderr = NullWriter()
        return self

    def __exit__(self, *exc):
        saved = self._saved
        if saved is None:
            return False
        _monitor_off()
        sys.stdout = saved['stdout']
        sys.stderr = saved['stderr']
        sys.stdin = saved['stdin']
        bd = builtins.__dict__
        old = saved['builtins']
        for k in list(bd.keys()):
            if k not in old:
                del bd[k]
        for k, v in old.items():
            if bd.get(k, _MISSING) is not v:
                bd[k] = v
        try:
            sys.setrecursionlimit(saved['limit'])
        except Exception:  # pragma: no cover
            pass
        try:
            os.chdir(saved['cwd'])
        except OSError:
            try:
                os.chdir(ROOT)
            except OSError:  # pragma: no cover
                pass
        self._saved = None
        return False

    # ----- output -----
    def new_output(self):
        if self.out is not None and self.out.truncated:
            self.any_truncated = True
        self.out = CappedWriter(self, self.cap)
        sys.stdout = self.out
        return self.out

    def stdout_value(self):
        return self.out.getvalue() if self.out is not None else ''

    def output_truncated(self):
        return self.any_truncated or (self.out is not None and self.out.truncated)

    # ----- input -----
    def set_stdin(self, lines):
        self.stdin = [str(x) for x in (lines or [])]
        self.input_called = False
        self.need_input_prompt = None

    def _input(self, prompt=''):
        self.input_called = True
        prompt = '' if prompt is None else str(prompt)
        if self.input_mode == 'preflight':
            raise self.trigger_abort('input')
        if self.stdin:
            line = self.stdin.pop(0)
            sys.stdout.write(prompt + line + '\n')
            return line
        if self.input_mode == 'program':
            self.need_input_prompt = prompt
            raise self.trigger_abort('needinput')
        if prompt:
            sys.stdout.write(prompt)
        raise EOFError('Your program asked for more input than this test provides')

    # ----- imports -----
    def _import(self, name, globals=None, locals=None, fromlist=(), level=0):
        try:
            caller = sys._getframe(1)
            from_student = caller.f_code.co_filename == STUDENT
        except ValueError:  # pragma: no cover
            from_student = False
        if from_student:
            top = str(name).partition('.')[0]
            if level:
                raise ImportError('Relative imports are not available here', name=top)
            if top in ALWAYS_BLOCKED:
                raise ImportError('Importing %s is not available here' % top, name=top)
            if self.block_all_imports:
                raise ImportError(
                    'Importing %s is not allowed in this question: CITS1401 projects must not import any module' % top,
                    name=top)
        return _REAL_IMPORT(name, globals, locals, fromlist, level)

    # ----- aborts -----
    def trigger_abort(self, kind):
        if self.abort is None:
            self.abort = kind
        return self.make_abort()

    def make_abort(self):
        kind = self.abort
        if kind == 'timeout':
            return StudentTimeout(
                'Your code ran for more than %s, so it was stopped. Check that every loop can finish.'
                % _seconds_text(self.budget_ms))
        if kind == 'output':
            return OutputLimit(
                'Your program printed more than %d KB of output, so it was stopped.' % (self.cap // 1024))
        if kind == 'needinput':
            return NeedInput(self.need_input_prompt or '')
        if kind == 'input':
            return InputNotAllowed(
                'input() was called while your file was loading. Tests cannot type anything, '
                'so move input() inside a function or remove it.')
        return RuntimeError('stopped')  # pragma: no cover

    # ----- running -----
    def call(self, fn, budget_ms=None, deadline=None):
        """Run fn() under the soft budget with the recursion limit applied. Never raises."""
        self.abort = None
        self.timed_out = False
        self.events = 0
        self.next_check = CHECK_EVERY
        if budget_ms is not None:
            self.budget_ms = budget_ms
        start = _perf()
        self.deadline = deadline if deadline is not None else start + (self.budget_ms or 2000) / 1000.0
        saved_limit = sys.getrecursionlimit()
        outcome = None
        try:
            sys.setrecursionlimit(_frame_depth() + STUDENT_RECURSION)
            _monitor_on(self)
            try:
                value = fn()
            finally:
                _monitor_off()
            outcome = CallOutcome(True, value=value)
        except BaseException as e:  # noqa: BLE001 - student code may raise anything
            _monitor_off()
            outcome = CallOutcome(False, exc=e)
        finally:
            try:
                sys.setrecursionlimit(saved_limit)
            except Exception:  # pragma: no cover
                pass
        outcome.ms = (_perf() - start) * 1000.0
        if outcome.ok and self.abort is not None:
            # Student code swallowed our abort exception and then finished without another line event.
            outcome = CallOutcome(False, exc=self.make_abort(), ms=outcome.ms)
        return outcome


_MISSING = object()


def _no_breakpoint(*_a, **_k):
    raise RuntimeError('breakpoint() is not available here')
