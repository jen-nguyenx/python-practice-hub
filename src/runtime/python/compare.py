"""Value comparison semantics shared by tests, pair() and the verifier (PLAN 3.2)."""
import math

_MAX_DEPTH = 200


def is_num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _num_equal(a, b, use_float, tol, nan_equal):
    if isinstance(a, float) or isinstance(b, float):
        fa, fb = float(a), float(b)
        if math.isnan(fa) or math.isnan(fb):
            return nan_equal and math.isnan(fa) and math.isnan(fb)
        if use_float:
            if math.isinf(fa) or math.isinf(fb):
                return fa == fb
            return math.isclose(fa, fb, rel_tol=1e-9, abs_tol=tol)
        return fa == fb
    return a == b


def _eq(got, exp, use_float, tol, nan_equal, depth):
    if depth > _MAX_DEPTH:
        return False
    if isinstance(exp, bool) or isinstance(got, bool):
        return isinstance(exp, bool) and isinstance(got, bool) and got == exp
    if exp is None or got is None:
        return exp is None and got is None
    if is_num(exp):
        return is_num(got) and _num_equal(got, exp, use_float, tol, nan_equal)
    if isinstance(exp, str):
        return isinstance(got, str) and got == exp
    if isinstance(exp, tuple):
        if not isinstance(got, tuple) or len(got) != len(exp):
            return False
        return all(_eq(g, e, use_float, tol, nan_equal, depth + 1) for g, e in zip(got, exp))
    if isinstance(exp, list):
        if not isinstance(got, list) or len(got) != len(exp):
            return False
        return all(_eq(g, e, use_float, tol, nan_equal, depth + 1) for g, e in zip(got, exp))
    if isinstance(exp, dict):
        if not isinstance(got, dict) or len(got) != len(exp):
            return False
        for k, ev in exp.items():
            if k not in got:
                return False
            if not _eq(got[k], ev, use_float, tol, nan_equal, depth + 1):
                return False
        return True
    if isinstance(exp, (set, frozenset)):
        return isinstance(got, (set, frozenset)) and set(got) == set(exp)
    try:
        return type(got) is type(exp) and bool(got == exp)
    except Exception:
        return False


def _unordered(got, exp, tol, nan_equal):
    if isinstance(exp, (list, tuple)):
        if type(exp) is list and not isinstance(got, list):
            return False
        if type(exp) is tuple and not isinstance(got, tuple):
            return False
        if len(got) != len(exp):
            return False
        remaining = list(got)
        for e in exp:
            for i, g in enumerate(remaining):
                if _eq(g, e, True, tol, nan_equal, 1):
                    del remaining[i]
                    break
            else:
                return False
        return True
    return _eq(got, exp, True, tol, nan_equal, 0)


def values_equal(got, exp, cmp='eq', tol=None, nan_equal=False):
    """Compare a student value with an expected value.

    eq: structural, type-strict for containers/str/bool/None; int and float compare numerically.
    float: like eq, floats use math.isclose(rel_tol=1e-9, abs_tol=tol or 1e-6), recursively.
    unordered: top-level list/tuple compared as a multiset (greedy), elements with float semantics.
    """
    if tol is None:
        tol = 1e-6
    try:
        tol = float(tol)
    except (TypeError, ValueError):
        tol = 1e-6
    try:
        if cmp == 'unordered':
            return _unordered(got, exp, tol, nan_equal)
        return _eq(got, exp, cmp == 'float', tol, nan_equal, 0)
    except Exception:
        return False


def _decimals(x):
    r = repr(x)
    if 'e' in r or 'n' in r or '.' not in r:
        return None
    return len(r.split('.', 1)[1])


def _loose(got, exp, tol, depth):
    if depth > _MAX_DEPTH:
        return False
    if isinstance(exp, bool) or isinstance(got, bool):
        if isinstance(exp, bool) and isinstance(got, str):
            return got.strip() == str(exp)
        return isinstance(exp, bool) and isinstance(got, bool) and got == exp
    if is_num(exp) and is_num(got):
        if _num_equal(got, exp, True, tol, True):
            return True
        if isinstance(exp, float) and isinstance(got, float) and not math.isnan(got) and not math.isinf(got):
            dp = _decimals(exp)
            if dp is not None and math.isclose(round(got, dp), exp, rel_tol=1e-9, abs_tol=tol):
                return True
        return False
    if is_num(exp) and isinstance(got, str):
        s = got.strip()
        if s == str(exp) or s == repr(exp):
            return True
        try:
            return _num_equal(float(s), exp, True, tol, True)
        except ValueError:
            return False
    if isinstance(exp, str) and (is_num(got) or got is None):
        return str(got) == exp.strip()
    if isinstance(exp, (list, tuple)) and isinstance(got, (list, tuple)):
        return len(got) == len(exp) and all(_loose(g, e, tol, depth + 1) for g, e in zip(got, exp))
    if isinstance(exp, dict) and isinstance(got, dict):
        if set(got.keys()) != set(exp.keys()):
            return False
        return all(_loose(got[k], exp[k], tol, depth + 1) for k in exp)
    return _eq(got, exp, True, tol, True, depth)


def return_type_wrong(got, exp, tol=None):
    """True when got != exp but would match after a type conversion (list<->tuple, str<->number)
    or after rounding a float to the expected number of decimal places."""
    if tol is None:
        tol = 1e-6
    try:
        if values_equal(got, exp, 'float', tol):
            return False
        return _loose(got, exp, float(tol), 0)
    except Exception:
        return False


def normalize_stdout(s):
    """CRLF -> LF, strip trailing whitespace on each line, drop trailing blank lines."""
    if s is None:
        return ''
    s = s.replace('\r\n', '\n').replace('\r', '\n')
    lines = [ln.rstrip() for ln in s.split('\n')]
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)
