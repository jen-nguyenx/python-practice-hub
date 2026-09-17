"""Trace-table rows: snapshot watched names once per execution of an anchor line.

When the anchor line's 'line' event fires in a frame, that frame is marked pending. The snapshot is
taken at the next 'line' or 'return' event in the same frame, i.e. after the anchor line finished.
Values are repr strings; names that do not exist yet are ''.
"""
import sys

from .errors import STUDENT

MAX_ROWS = 500
MAX_REPR = 200


def _repr(value):
    try:
        r = repr(value)
    except Exception as e:  # noqa: BLE001
        r = '<repr failed: %s>' % type(e).__name__
    if len(r) > MAX_REPR:
        r = r[:MAX_REPR - 3] + '...'
    return r


class RowRecorder:
    def __init__(self, watch, anchor_line):
        self.watch = [str(w) for w in (watch or [])]
        self.anchor = int(anchor_line)
        self.rows = []
        self.pending = set()
        self.overflow = False

    def snapshot(self, frame):
        loc = frame.f_locals
        glob = frame.f_globals
        row = []
        for name in self.watch:
            if name in loc:
                row.append(_repr(loc[name]))
            elif name in glob:
                row.append(_repr(glob[name]))
            else:
                row.append('')
        if len(self.rows) < MAX_ROWS:
            self.rows.append(row)
        else:
            self.overflow = True

    def _local(self, frame, event, arg):
        if event == 'line' or event == 'return':
            key = id(frame)
            if key in self.pending:
                self.pending.discard(key)
                self.snapshot(frame)
            if event == 'line' and frame.f_lineno == self.anchor:
                self.pending.add(key)
        return self._local

    def _global(self, frame, event, arg):
        if frame.f_code.co_filename == STUDENT:
            return self._local
        return None

    def install(self):
        sys.settrace(self._global)

    def uninstall(self):
        sys.settrace(None)
