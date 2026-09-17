"""Exceptions used by the sandbox and conversion of Python exceptions into PyError dicts."""
import linecache
import traceback

STUDENT = '<student>'


class StudentTimeout(TimeoutError):
    """Raised by the soft time budget. Reported to the UI as type 'TimeoutError'."""


class OutputLimit(BaseException):
    """Raised when student output passes the byte cap. BaseException so `except Exception` cannot hide it."""


class NeedInput(BaseException):
    """input() was called in run_program with no queued lines left."""

    def __init__(self, prompt=''):
        super().__init__(prompt)
        self.prompt = prompt


class InputNotAllowed(BaseException):
    """input() was called during the top-level pre-flight run of a function/project submission."""


REPORTED_TYPE = {
    StudentTimeout: 'TimeoutError',
    OutputLimit: 'OutputLimit',
    NeedInput: 'NeedInput',
    InputNotAllowed: 'InputCalled',
}


def register_source(code, filename=STUDENT):
    """Make source lines available to traceback formatting."""
    linecache.cache[filename] = (len(code), None, code.splitlines(True), filename)


def reported_type(exc):
    t = type(exc)
    for cls, name in REPORTED_TYPE.items():
        if t is cls:
            return name
    return t.__name__


def _printed_type(t):
    mod = getattr(t, '__module__', None)
    qual = getattr(t, '__qualname__', t.__name__)
    if mod in (None, '__main__', 'builtins'):
        return qual
    return mod + '.' + qual


def exc_message(exc):
    """The text Python prints after 'Type: ', including 'Did you mean' suggestions and notes."""
    try:
        te = traceback.TracebackException.from_exception(exc, capture_locals=False)
        text = ''.join(te.format_exception_only()).rstrip('\n')
    except Exception:  # pragma: no cover - defensive
        try:
            return str(exc)
        except Exception:
            return ''
    prefix = _printed_type(type(exc))
    if text.startswith(prefix + ': '):
        return text[len(prefix) + 2:]
    if text == prefix:
        return ''
    if text.startswith(prefix + '\n'):
        return text[len(prefix) + 1:]
    try:
        return str(exc)
    except Exception:
        return text


def syntax_error(exc):
    """PyError dict for SyntaxError / IndentationError / TabError raised by compile()."""
    line = exc.lineno or 1
    col = exc.offset if exc.offset and exc.offset > 0 else 1
    end_col = exc.end_offset if exc.end_offset else None
    end_line = getattr(exc, 'end_lineno', None)
    if end_line is not None and end_line != line:
        text = exc.text or ''
        end_col = len(text.rstrip('\n')) + 1
    if not end_col or end_col <= col:
        end_col = col + 1
    try:
        tb_text = ''.join(traceback.format_exception_only(type(exc), exc))
    except Exception:  # pragma: no cover
        tb_text = '%s: %s\n' % (type(exc).__name__, exc.msg)
    return {
        'type': type(exc).__name__,
        'message': exc.msg or '',
        'line': line,
        'col': col,
        'endCol': end_col,
        'traceback': tb_text,
    }


def student_frames(exc):
    try:
        tb = traceback.extract_tb(exc.__traceback__)
    except Exception:  # pragma: no cover
        return []
    return [f for f in tb if f.filename == STUDENT]


def runtime_error(exc, message=None):
    """PyError dict for an exception raised while student code ran. Traceback filtered to <student> frames."""
    if isinstance(exc, SyntaxError) and exc.filename == STUDENT:
        return syntax_error(exc)
    frames = student_frames(exc)
    tname = reported_type(exc)
    msg = exc_message(exc) if message is None else message
    parts = []
    if frames:
        parts.append('Traceback (most recent call last):\n')
        try:
            parts.extend(traceback.StackSummary.from_list(frames).format())
        except Exception:  # pragma: no cover
            for f in frames:
                parts.append('  File "%s", line %s, in %s\n' % (f.filename, f.lineno, f.name))
    parts.append(tname + (': ' + msg if msg else '') + '\n')
    err = {'type': tname, 'message': msg, 'traceback': ''.join(parts)}
    if frames and frames[-1].lineno:
        err['line'] = frames[-1].lineno
    return err


def simple_error(type_name, message, line=None):
    err = {'type': type_name, 'message': message, 'traceback': type_name + (': ' + message if message else '') + '\n'}
    if line:
        err['line'] = line
    return err
