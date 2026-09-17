"""Static checks on student code: one pass producing {flag, line} for every flag in AST_FLAGS (src/content/ids.ts).

Flags are hints for the Problems panel and pattern cards, never a score. Each check is written to prefer
missing a case over flagging correct code.
"""
import ast

FLAG_ORDER = [
    'import_used', 'print_call', 'input_call', 'global_stmt', 'while_no_update', 'while_true_no_break',
    'acc_reset_in_loop', 'range_len_index', 'mutate_while_iterating', 'shadow_builtin', 'mutable_default',
    'missing_return', 'return_print', 'bare_function_name', 'compare_to_true', 'if_return_bool_literal',
    'is_literal', 'or_with_literal', 'none_from_inplace', 'discarded_str_method', 'open_without_with',
    'round_in_loop', 'csv_ext_literal', 'bare_except', 'loop_present',
    'for_each', 'enumerate_used', 'dict_get_used', 'fstring_used', 'early_return', 'with_open',
    'header_index_lookup', 'recursion_present', 'docstring_present',
]
_FLAG_RANK = {f: i for i, f in enumerate(FLAG_ORDER)}

SHADOWABLE = frozenset({
    'list', 'dict', 'str', 'int', 'float', 'sum', 'max', 'min', 'len', 'input', 'print', 'type', 'id', 'range',
    'set', 'tuple', 'sorted', 'open', 'round', 'abs', 'bool', 'map', 'filter', 'zip', 'all', 'any', 'format',
    'iter', 'next', 'object', 'hash', 'pow', 'chr', 'ord', 'reversed', 'enumerate', 'slice', 'bytes', 'complex',
    'dir', 'vars', 'help', 'exit', 'quit', 'eval', 'exec', 'compile', 'divmod', 'isinstance', 'frozenset',
})
PURE_CALLS = frozenset({'len', 'abs', 'int', 'float', 'str', 'min', 'max', 'sum', 'round', 'bool'})
INPLACE_METHODS = frozenset({'sort', 'append', 'extend', 'insert', 'remove', 'reverse', 'clear', 'update'})
STR_METHODS = frozenset({
    'upper', 'lower', 'strip', 'lstrip', 'rstrip', 'replace', 'title', 'capitalize', 'casefold', 'swapcase',
    'zfill', 'center', 'ljust', 'rjust', 'removeprefix', 'removesuffix', 'split', 'join',
})
UNCALLED_METHODS = frozenset({
    'sort', 'reverse', 'clear', 'upper', 'lower', 'strip', 'split', 'close', 'pop', 'keys', 'values', 'items',
    'copy', 'readline', 'readlines', 'read', 'title', 'capitalize',
})
MUTATING_METHODS = frozenset({'append', 'remove', 'pop', 'insert', 'extend', 'clear', 'popitem'})
MUTATORS = MUTATING_METHODS | {'sort', 'reverse', 'update', 'add', 'discard', 'setdefault'}
EMPTY_CALLS = frozenset({'list', 'dict', 'set', 'str'})
PRINTY_PREFIXES = ('print', 'show', 'display', 'report', 'draw', 'greet', 'say', 'describe', 'output', 'log',
                   'menu', 'main', 'hello', 'welcome', 'intro', 'test', 'demo', 'run')
LOOP_NODES = (ast.For, ast.AsyncFor, ast.While)
COMP_NODES = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
SCOPE_NODES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)


def _walk_local(node, stop=SCOPE_NODES):
    """Walk children of node without entering nested function/class scopes."""
    todo = list(ast.iter_child_nodes(node))
    while todo:
        n = todo.pop()
        yield n
        if isinstance(n, stop):
            continue
        todo.extend(ast.iter_child_nodes(n))


def _walk_region(stmts, stop):
    todo = list(stmts)
    while todo:
        n = todo.pop()
        yield n
        if isinstance(n, stop):
            continue
        todo.extend(ast.iter_child_nodes(n))


def _base_name(node):
    while isinstance(node, (ast.Subscript, ast.Attribute, ast.Starred)):
        node = node.value
    return node.id if isinstance(node, ast.Name) else None


def _target_names(target):
    if isinstance(target, ast.Name):
        return [target.id]
    if isinstance(target, (ast.Tuple, ast.List)):
        out = []
        for elt in target.elts:
            out.extend(_target_names(elt))
        return out
    if isinstance(target, ast.Starred):
        return _target_names(target.value)
    return []


def _is_bool_const(node, value=None):
    return isinstance(node, ast.Constant) and isinstance(node.value, bool) and (value is None or node.value is value)


def _is_call_to(node, name):
    return isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == name


def _stmt_lists(node):
    for field in ('body', 'orelse', 'finalbody'):
        v = getattr(node, field, None)
        if isinstance(v, list) and v and isinstance(v[0], ast.stmt):
            yield v
    if isinstance(node, (ast.Try,) + ((ast.TryStar,) if hasattr(ast, 'TryStar') else ())):
        for h in node.handlers:
            yield h.body
    if isinstance(node, ast.Match):
        for c in node.cases:
            yield c.body


class Checker(ast.NodeVisitor):
    def __init__(self, tree):
        self.tree = tree
        self.found = set()
        self.parents = {}
        for node in ast.walk(tree):
            for child in ast.iter_child_nodes(node):
                self.parents[child] = node
        self.functions = set()
        assigned = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self.functions.add(node.name)
            elif isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                for t in targets:
                    assigned.update(_target_names(t))
            elif isinstance(node, (ast.For, ast.AsyncFor)):
                assigned.update(_target_names(node.target))
        self.pure_functions = self.functions - assigned
        self.globals_declared = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Global, ast.Nonlocal)):
                self.globals_declared.update(node.names)
        self.shadowed = set()
        self.docstrings = set()
        for node in ast.walk(tree):
            if isinstance(node, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                body = node.body
                if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant) \
                        and isinstance(body[0].value.value, str):
                    self.docstrings.add(body[0].value)
                    if not isinstance(node, ast.Module):
                        self.add('docstring_present', body[0])

    # ----- helpers -----
    def add(self, flag, node_or_line):
        line = node_or_line if isinstance(node_or_line, int) else getattr(node_or_line, 'lineno', 1)
        self.found.add((flag, int(line or 1)))

    def parent(self, node):
        return self.parents.get(node)

    def enclosing_function(self, node):
        p = self.parent(node)
        while p is not None:
            if isinstance(p, (ast.FunctionDef, ast.AsyncFunctionDef)):
                return p
            if isinstance(p, (ast.Lambda, ast.ClassDef)):
                return None
            p = self.parent(p)
        return None

    def in_loop(self, node):
        p = self.parent(node)
        while p is not None:
            if isinstance(p, LOOP_NODES + COMP_NODES):
                return p
            if isinstance(p, SCOPE_NODES):
                return None
            p = self.parent(p)
        return None

    def inside(self, node, types):
        p = self.parent(node)
        while p is not None:
            if isinstance(p, types):
                return True
            if isinstance(p, SCOPE_NODES):
                return False
            p = self.parent(p)
        return False

    def containing_list(self, node):
        p = self.parent(node)
        if p is None:
            return None, -1
        for lst in _stmt_lists(p):
            for i, s in enumerate(lst):
                if s is node:
                    return lst, i
        return None, -1

    def results(self):
        return [{'flag': f, 'line': ln} for f, ln in sorted(self.found, key=lambda x: (x[1], _FLAG_RANK.get(x[0], 99)))]

    # ----- visitors -----
    def generic_visit(self, node):
        super().generic_visit(node)

    def visit_Import(self, node):
        self.add('import_used', node)
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        self.add('import_used', node)
        self.generic_visit(node)

    def visit_Global(self, node):
        self.add('global_stmt', node)

    def visit_Call(self, node):
        func = node.func
        if isinstance(func, ast.Name):
            if func.id == 'print':
                self.add('print_call', node)
                for arg in node.args:
                    if isinstance(arg, ast.Name) and arg.id in self.pure_functions:
                        self.add('bare_function_name', arg)
            elif func.id == 'input':
                self.add('input_call', node)
            elif func.id == 'enumerate':
                self.add('enumerate_used', node)
            elif func.id == 'open':
                if not isinstance(self.parent(node), ast.withitem):
                    self.add('open_without_with', node)
            elif func.id == 'round':
                self.check_round(node)
        elif isinstance(func, ast.Attribute):
            attr = func.attr
            if attr == 'get' and 1 <= len(node.args) <= 2 and not node.keywords:
                self.add('dict_get_used', node)
            if attr in INPLACE_METHODS and not isinstance(self.parent(node), ast.Expr):
                par = self.parent(node)
                if not isinstance(par, (ast.Attribute, ast.Await, ast.Lambda)):
                    self.add('none_from_inplace', node)
            if attr == 'index' and len(node.args) == 1:
                obj = func.value
                name = ''
                if isinstance(obj, ast.Name):
                    name = obj.id
                elif isinstance(obj, ast.Attribute):
                    name = obj.attr
                name = name.lower()
                chained = (isinstance(obj, ast.Call) and isinstance(obj.func, ast.Attribute)
                           and obj.func.attr == 'split')
                if chained or any(k in name for k in ('head', 'col', 'field', 'title')):
                    self.add('header_index_lookup', node)
        self.generic_visit(node)

    def check_round(self, node):
        par = self.parent(node)
        if isinstance(par, (ast.BinOp, ast.AugAssign)) and self.enclosing_loop_body(node):
            self.add('round_in_loop', node)
            return
        loop = self.enclosing_loop_body(node)
        if loop is None:
            return
        if isinstance(par, ast.Assign) and len(par.targets) == 1 and isinstance(par.targets[0], ast.Name):
            name = par.targets[0].id
            in_args = any(isinstance(n, ast.Name) and n.id == name for a in node.args for n in ast.walk(a))
            if in_args:
                self.add('round_in_loop', node)
                return
            for n in _walk_local(loop):
                if isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name) and n.target.id == name:
                    self.add('round_in_loop', node)
                    return
                if isinstance(n, ast.BinOp):
                    for side in (n.left, n.right):
                        if isinstance(side, ast.Name) and side.id == name:
                            self.add('round_in_loop', node)
                            return

    def enclosing_loop_body(self, node):
        p = self.parent(node)
        while p is not None:
            if isinstance(p, LOOP_NODES):
                return p
            if isinstance(p, SCOPE_NODES):
                return None
            p = self.parent(p)
        return None

    def visit_While(self, node):
        self.add('loop_present', node)
        test = node.test
        if isinstance(test, ast.Constant) and test.value and not isinstance(test.value, str):
            if not self.loop_exits(node):
                self.add('while_true_no_break', node)
        else:
            self.check_while_update(node)
            self.check_or_literal(test)
        self.check_truthy_function(test)
        self.check_acc_reset(node)
        self.generic_visit(node)

    def loop_exits(self, loop):
        """True if a break for this loop, a return, a raise or exit()/quit() appears in its body."""
        todo = list(loop.body)
        while todo:
            n = todo.pop()
            if isinstance(n, (ast.Return, ast.Raise)):
                return True
            if isinstance(n, ast.Break):
                return True
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ('exit', 'quit'):
                return True
            if isinstance(n, SCOPE_NODES):
                continue
            if isinstance(n, LOOP_NODES):
                # breaks inside a nested loop belong to that loop; returns/raises still count
                for m in _walk_local(n):
                    if isinstance(m, (ast.Return, ast.Raise)):
                        return True
                continue
            todo.extend(ast.iter_child_nodes(n))
        return False

    def check_while_update(self, node):
        names = set()
        for n in ast.walk(node.test):
            if isinstance(n, ast.Call):
                if not (isinstance(n.func, ast.Name) and n.func.id in PURE_CALLS):
                    return
            elif isinstance(n, ast.Name) and isinstance(n.ctx, ast.Load):
                names.add(n.id)
            elif isinstance(n, ast.NamedExpr):
                return
        for n in ast.walk(node.test):
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Name):
                names.discard(n.func.id)
        names -= {'True', 'False', 'None'}
        if not names or names & self.globals_declared:
            return
        if self.loop_exits(node):
            return
        updated = set()
        for n in _walk_region(node.body, SCOPE_NODES):
            if isinstance(n, ast.Assign):
                for t in n.targets:
                    updated.update(_target_names(t))
                    b = _base_name(t)
                    if b:
                        updated.add(b)
            elif isinstance(n, (ast.AugAssign, ast.AnnAssign)):
                updated.update(_target_names(n.target))
                b = _base_name(n.target)
                if b:
                    updated.add(b)
            elif isinstance(n, (ast.For, ast.AsyncFor)):
                updated.update(_target_names(n.target))
            elif isinstance(n, ast.NamedExpr):
                updated.update(_target_names(n.target))
            elif isinstance(n, ast.Delete):
                for t in n.targets:
                    b = _base_name(t)
                    if b:
                        updated.add(b)
            elif isinstance(n, ast.withitem) and n.optional_vars is not None:
                updated.update(_target_names(n.optional_vars))
            elif isinstance(n, ast.Call):
                if isinstance(n.func, ast.Attribute):
                    b = _base_name(n.func.value)
                    if b:
                        updated.add(b)
                for a in n.args:
                    # passing a mutable object to a function may change it
                    if isinstance(a, ast.Name):
                        updated.add(a.id)
                if isinstance(n.func, ast.Name) and n.func.id in self.functions:
                    return
            elif isinstance(n, ast.ExceptHandler) and n.name:
                updated.add(n.name)
        if not (names & updated):
            self.add('while_no_update', node)

    def check_acc_reset(self, loop):
        stop = SCOPE_NODES + LOOP_NODES + COMP_NODES
        resets = {}
        accums = {}
        for n in _walk_region(loop.body, stop):
            if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
                v = n.value
                empty = (
                    (isinstance(v, ast.Constant) and not isinstance(v.value, bool)
                     and v.value in (0, 0.0, '') and v.value is not None)
                    or (isinstance(v, (ast.List, ast.Dict)) and not getattr(v, 'elts', getattr(v, 'keys', None)))
                    or (isinstance(v, ast.Call) and isinstance(v.func, ast.Name) and v.func.id in EMPTY_CALLS
                        and not v.args and not v.keywords)
                )
                if empty:
                    name = n.targets[0].id
                    resets.setdefault(name, n)
            elif isinstance(n, ast.AugAssign) and isinstance(n.target, ast.Name):
                accums.setdefault(n.target.id, n)
            elif isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in ('append', 'extend', 'add') \
                    and isinstance(n.func.value, ast.Name):
                accums.setdefault(n.func.value.id, n)
        if not resets:
            return
        lst, idx = self.containing_list(loop)
        for name, reset in resets.items():
            acc = accums.get(name)
            if acc is None or acc.lineno <= reset.lineno:
                continue
            used_outside = False
            if lst is not None:
                for s in lst[:idx]:
                    for n in _walk_region([s], SCOPE_NODES):
                        if isinstance(n, ast.Name) and n.id == name and isinstance(n.ctx, ast.Store):
                            used_outside = True
                for s in lst[idx + 1:]:
                    for n in _walk_region([s], SCOPE_NODES):
                        if isinstance(n, ast.Name) and n.id == name and isinstance(n.ctx, ast.Load):
                            used_outside = True
            if used_outside:
                self.add('acc_reset_in_loop', reset)

    def visit_For(self, node):
        self.add('loop_present', node)
        it = node.iter
        is_range = _is_call_to(it, 'range')
        if not is_range and not _is_call_to(it, 'enumerate'):
            self.add('for_each', node)
        if is_range:
            self.check_range_len(node)
        if isinstance(it, ast.Name):
            self.check_mutate_while_iterating(node, it.id)
        self.check_acc_reset(node)
        self.generic_visit(node)

    visit_AsyncFor = visit_For

    def check_range_len(self, node):
        it = node.iter
        if len(it.args) != 1 or not _is_call_to(it.args[0], 'len') or len(it.args[0].args) != 1:
            return
        seq = it.args[0].args[0]
        if not isinstance(seq, ast.Name) or not isinstance(node.target, ast.Name):
            return
        idx, seq_name = node.target.id, seq.id
        uses = 0
        for n in _walk_region(node.body, SCOPE_NODES):
            if isinstance(n, ast.Name) and n.id == idx:
                par = self.parent(n)
                ok = (isinstance(par, ast.Subscript) and par.slice is n and isinstance(par.value, ast.Name)
                      and par.value.id == seq_name and isinstance(par.ctx, ast.Load))
                if not ok:
                    return
                uses += 1
            elif isinstance(n, ast.Name) and n.id == seq_name and isinstance(n.ctx, ast.Store):
                return
        if uses:
            self.add('range_len_index', node)

    def check_mutate_while_iterating(self, node, seq):
        for n in _walk_region(node.body, SCOPE_NODES):
            hit = None
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute) and n.func.attr in MUTATING_METHODS \
                    and isinstance(n.func.value, ast.Name) and n.func.value.id == seq:
                hit = n
            elif isinstance(n, ast.Delete):
                for t in n.targets:
                    if isinstance(t, ast.Subscript) and isinstance(t.value, ast.Name) and t.value.id == seq:
                        hit = n
            if hit is None:
                continue
            stmt = hit
            while stmt is not None and not isinstance(stmt, ast.stmt):
                stmt = self.parent(stmt)
            lst, i = self.containing_list(stmt) if stmt is not None else (None, -1)
            if lst is not None and any(isinstance(s, (ast.Break, ast.Return, ast.Raise)) for s in lst[i + 1:]):
                continue
            self.add('mutate_while_iterating', hit)

    def visit_comprehension_node(self, node):
        self.add('loop_present', node)
        self.generic_visit(node)

    visit_ListComp = visit_comprehension_node
    visit_SetComp = visit_comprehension_node
    visit_DictComp = visit_comprehension_node
    visit_GeneratorExp = visit_comprehension_node

    def visit_Name(self, node):
        if isinstance(node.ctx, ast.Store) and node.id in SHADOWABLE and node.id not in self.shadowed:
            self.shadowed.add(node.id)
            self.add('shadow_builtin', node)

    def visit_arg(self, node):
        if node.arg in SHADOWABLE and node.arg not in self.shadowed:
            self.shadowed.add(node.arg)
            self.add('shadow_builtin', node)

    def visit_FunctionDef(self, node):
        if node.name in SHADOWABLE and node.name not in self.shadowed:
            self.shadowed.add(node.name)
            self.add('shadow_builtin', node)
        defaults = list(node.args.defaults) + [d for d in node.args.kw_defaults if d is not None]
        for d in defaults:
            if isinstance(d, (ast.List, ast.Dict, ast.Set) + COMP_NODES) or (
                    isinstance(d, ast.Call) and isinstance(d.func, ast.Name) and d.func.id in ('list', 'dict', 'set')):
                self.add('mutable_default', d)
        self.check_function_returns(node)
        self.check_recursion(node)
        self.generic_visit(node)

    visit_AsyncFunctionDef = visit_FunctionDef

    def check_function_returns(self, fn):
        body = list(fn.body)
        if body and isinstance(body[0], ast.Expr) and body[0].value in self.docstrings:
            body = body[1:]
        if not body or all(isinstance(s, ast.Pass) or (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))
                           for s in body):
            return
        value_return = False
        prints = False
        side_effects = False
        computes = False
        params = {a.arg for a in fn.args.args + fn.args.posonlyargs + fn.args.kwonlyargs}
        if fn.args.vararg:
            params.add(fn.args.vararg.arg)
        for n in _walk_region(body, SCOPE_NODES):
            if isinstance(n, ast.Return) and n.value is not None and not (
                    isinstance(n.value, ast.Constant) and n.value.value is None):
                value_return = True
                if _is_call_to(n.value, 'print'):
                    self.add('return_print', n)
            elif isinstance(n, (ast.Yield, ast.YieldFrom, ast.Global, ast.Nonlocal, ast.Raise)):
                side_effects = True
            elif isinstance(n, ast.Call):
                f = n.func
                if isinstance(f, ast.Name) and f.id in ('print', 'input', 'open', 'exit', 'quit'):
                    if f.id == 'print':
                        prints = True
                    side_effects = True
                elif isinstance(f, ast.Attribute):
                    b = _base_name(f.value)
                    if (b in params and f.attr in MUTATORS) or f.attr in ('write', 'writelines', 'close'):
                        side_effects = True
                elif isinstance(f, ast.Name) and f.id in self.functions:
                    side_effects = True
            elif isinstance(n, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                targets = n.targets if isinstance(n, ast.Assign) else [n.target]
                for t in targets:
                    if isinstance(t, (ast.Subscript, ast.Attribute)):
                        if _base_name(t) in params:
                            side_effects = True
                    elif _target_names(t):
                        computes = True
            elif isinstance(n, ast.Delete):
                side_effects = True
        if value_return:
            return
        lowered = fn.name.lower()
        if prints:
            last = body[-1]
            if (isinstance(last, ast.Expr) and _is_call_to(last.value, 'print') and last.value.args
                    and not lowered.startswith(PRINTY_PREFIXES) and computes):
                self.add('return_print', last)
            return
        if side_effects or not computes:
            return
        if lowered.startswith(PRINTY_PREFIXES):
            return
        self.add('missing_return', fn)

    def check_recursion(self, fn):
        for n in _walk_local(fn):
            if _is_call_to(n, fn.name):
                self.add('recursion_present', fn)
                return

    def visit_Return(self, node):
        fn = self.enclosing_function(node)
        if fn is not None:
            par = self.parent(node)
            if par is fn:
                if fn.body and fn.body[-1] is not node:
                    self.add('early_return', node)
            elif self.inside(node, LOOP_NODES):
                self.add('early_return', node)
            else:
                # guard clause: an if directly in the function body that is not the last statement
                stmt = node
                p = self.parent(stmt)
                while p is not None and p is not fn:
                    stmt, p = p, self.parent(p)
                if p is fn and isinstance(stmt, ast.If) and fn.body and fn.body[-1] is not stmt:
                    self.add('early_return', node)
        self.generic_visit(node)

    def visit_Expr(self, node):
        v = node.value
        if isinstance(v, ast.Name) and v.id in self.pure_functions:
            self.add('bare_function_name', node)
        elif isinstance(v, ast.Attribute) and v.attr in UNCALLED_METHODS:
            self.add('bare_function_name', node)
        elif isinstance(v, ast.Call) and isinstance(v.func, ast.Attribute) and v.func.attr in STR_METHODS:
            self.add('discarded_str_method', node)
        self.generic_visit(node)

    def visit_If(self, node):
        self.check_truthy_function(node.test)
        body = node.body
        if len(body) == 1 and isinstance(body[0], ast.Return) and _is_bool_const(body[0].value):
            want = not body[0].value.value
            other = None
            if len(node.orelse) == 1 and isinstance(node.orelse[0], ast.Return):
                other = node.orelse[0].value
            elif not node.orelse:
                lst, i = self.containing_list(node)
                if lst is not None and i + 1 < len(lst) and isinstance(lst[i + 1], ast.Return):
                    other = lst[i + 1].value
            if other is not None and _is_bool_const(other, want):
                self.add('if_return_bool_literal', node)
        elif (len(body) == 1 and isinstance(body[0], ast.Assign) and _is_bool_const(body[0].value)
              and len(body[0].targets) == 1 and isinstance(body[0].targets[0], ast.Name)
              and len(node.orelse) == 1 and isinstance(node.orelse[0], ast.Assign)
              and _is_bool_const(node.orelse[0].value, not body[0].value.value)
              and len(node.orelse[0].targets) == 1 and isinstance(node.orelse[0].targets[0], ast.Name)
              and node.orelse[0].targets[0].id == body[0].targets[0].id):
            self.add('if_return_bool_literal', node)
        self.check_or_literal(node.test)
        self.generic_visit(node)

    def check_truthy_function(self, test):
        t = test.operand if isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not) else test
        if isinstance(t, ast.Name) and t.id in self.pure_functions:
            self.add('bare_function_name', t)

    def visit_IfExp(self, node):
        self.check_or_literal(node.test)
        self.generic_visit(node)

    def visit_Assert(self, node):
        self.check_or_literal(node.test)
        self.generic_visit(node)

    def check_or_literal(self, test):
        if isinstance(test, ast.UnaryOp) and isinstance(test.op, ast.Not):
            test = test.operand
        if isinstance(test, ast.BoolOp):
            if isinstance(test.op, ast.Or):
                has_compare = any(isinstance(v, ast.Compare) for v in test.values)
                lit = any(isinstance(v, ast.Constant) and v.value is not None and not isinstance(v.value, bool)
                          for v in test.values[1:])
                if has_compare and lit:
                    self.add('or_with_literal', test)
                    return
            for v in test.values:
                self.check_or_literal(v)
        elif isinstance(test, ast.Compare):
            for c in [test.left] + list(test.comparators):
                if isinstance(c, ast.BoolOp) and isinstance(c.op, ast.Or) and all(
                        isinstance(v, ast.Constant) and not isinstance(v.value, bool) for v in c.values):
                    self.add('or_with_literal', test)
                    return

    def visit_Compare(self, node):
        operands = [node.left] + list(node.comparators)
        for i, op in enumerate(node.ops):
            left, right = operands[i], operands[i + 1]
            if isinstance(op, (ast.Eq, ast.NotEq, ast.Is, ast.IsNot)) and (_is_bool_const(left) or _is_bool_const(right)):
                self.add('compare_to_true', node)
            if isinstance(op, (ast.Is, ast.IsNot)):
                for side in (left, right):
                    if (isinstance(side, ast.Constant) and side.value is not None and side.value is not Ellipsis
                            and not isinstance(side.value, bool)) or isinstance(side, (ast.List, ast.Tuple, ast.Dict, ast.Set)):
                        self.add('is_literal', node)
        for side in operands:
            if isinstance(side, ast.Name) and side.id in self.pure_functions:
                self.add('bare_function_name', side)
        self.generic_visit(node)

    def visit_BinOp(self, node):
        for side in (node.left, node.right):
            if isinstance(side, ast.Name) and side.id in self.pure_functions:
                self.add('bare_function_name', side)
        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, str) and '.csv' in node.value.lower() and node not in self.docstrings:
            self.add('csv_ext_literal', node)

    def visit_JoinedStr(self, node):
        self.add('fstring_used', node)
        self.generic_visit(node)

    def visit_With(self, node):
        for item in node.items:
            if _is_call_to(item.context_expr, 'open'):
                self.add('with_open', node)
        self.generic_visit(node)

    visit_AsyncWith = visit_With

    def visit_ExceptHandler(self, node):
        if node.type is None:
            self.add('bare_except', node)
        self.generic_visit(node)


def check_tree(tree):
    c = Checker(tree)
    c.visit(tree)
    return c.results()


def check(code):
    """Return (findings, tree) or ([], None) when the code does not parse."""
    try:
        tree = ast.parse(code)
    except (SyntaxError, ValueError):
        return [], None
    return check_tree(tree), tree


# ---------------- rules ----------------

RULE_MESSAGES = {
    'noImport': 'Imports are not allowed in CITS1401 projects; the marker would give this submission zero for tests.',
    'noInput': 'input() must never be called in CITS1401 projects; the marker detects it and will not test the '
               'submission, so it scores zero for tests.',
    'noPrint': 'print() is not allowed in CITS1401 projects except when terminating gracefully after an error; '
               'extra output breaks the marker\'s tests and costs marks.',
    'roundAtEnd': 'Round only when saving the final results. CITS1401 projects say not to round during calculations; '
                  'rounding here changes later values, so the marker\'s tests would fail.',
    'noCsvExt': 'Do not add or check for ".csv" in file names. CITS1401 projects say file names may not end in .csv, '
                'so the marker\'s files would not be found and those tests would score zero.',
    'noLoops': 'Loops are not allowed here (this includes comprehensions). In the CITS1401 exam recursion question '
               'a solution that uses a loop scores zero.',
    'mainSignature': 'Define main at the top level with the parameters given in the specification. If the marker '
                     'cannot call main(), the submission is graded zero.',
}


def _main_arity(tests):
    counts = set()
    for t in tests or []:
        call = t.get('call') if isinstance(t, dict) else None
        if not call:
            continue
        try:
            expr = ast.parse(call, mode='eval').body
        except SyntaxError:
            continue
        if _is_call_to(expr, 'main'):
            counts.add(len(expr.args) + len(expr.keywords))
    return counts


def rule_violations(tree, findings, rules, tests=None):
    rules = [r for r in (rules or []) if r in RULE_MESSAGES]
    if not rules or tree is None:
        return []
    out = []
    by_flag = {}
    for f in findings:
        by_flag.setdefault(f['flag'], []).append(f['line'])

    def emit(rule, lines, message=None):
        for ln in sorted(set(lines)):
            out.append({'rule': rule, 'line': ln, 'message': message or RULE_MESSAGES[rule]})

    checker = None
    for rule in rules:
        if rule == 'noImport':
            emit(rule, by_flag.get('import_used', []))
        elif rule == 'noInput':
            emit(rule, by_flag.get('input_call', []))
        elif rule == 'noPrint':
            if checker is None:
                checker = Checker(tree)
            lines = []
            for n in ast.walk(tree):
                if _is_call_to(n, 'print') and not checker.inside(n, (ast.ExceptHandler,)):
                    lines.append(n.lineno)
            emit(rule, lines)
        elif rule == 'roundAtEnd':
            if checker is None:
                checker = Checker(tree)
            lines = list(by_flag.get('round_in_loop', []))
            for n in ast.walk(tree):
                if _is_call_to(n, 'round'):
                    par = checker.parent(n)
                    if isinstance(par, (ast.BinOp, ast.AugAssign, ast.UnaryOp)):
                        lines.append(n.lineno)
            emit(rule, lines)
        elif rule == 'noCsvExt':
            emit(rule, by_flag.get('csv_ext_literal', []))
        elif rule == 'noLoops':
            emit(rule, by_flag.get('loop_present', []))
        elif rule == 'mainSignature':
            mains = [n for n in tree.body if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == 'main']
            if not mains:
                emit(rule, [1], 'There is no top-level def main(...). The marker calls main() directly, so without it '
                                'the submission is graded zero.')
                continue
            fn = mains[-1]
            a = fn.args
            positional = len(a.posonlyargs) + len(a.args)
            required = positional - len(a.defaults)
            arities = _main_arity(tests)
            bad = [k for k in arities if not (required <= k <= positional or (a.vararg is not None and k >= required))]
            if bad:
                emit(rule, [fn.lineno],
                     'main takes %d parameter%s but the marker calls it with %d argument%s. Match the signature in the '
                     'specification, or the submission is graded zero.'
                     % (positional, '' if positional == 1 else 's', bad[0], '' if bad[0] == 1 else 's'))
    out.sort(key=lambda v: (v['line'], v['rule']))
    return out


def while_lines(tree):
    """(start, end) line ranges of while loops, used to tag timeouts as infinite_while."""
    if tree is None:
        return []
    return [(n.lineno, getattr(n, 'end_lineno', n.lineno) or n.lineno) for n in ast.walk(tree) if isinstance(n, ast.While)]
