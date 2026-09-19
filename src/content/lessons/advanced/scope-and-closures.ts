// Advanced: which name Python finds, what a nested function remembers, and the first decorator.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'scope-and-closures',
  title: 'Scope and closures',
  summary: 'Where Python looks for a name, what a nested function keeps hold of, and how a decorator is built from that',
  track: 'advanced',
  order: 7,
  minutes: 28,
  prereqs: ['lambda-and-sorting'],
  outcomes: [
    'Work out which name a piece of code will find, in order',
    'Explain why assigning to a name makes it local for the whole function',
    'Use `nonlocal` and say why `global` is usually the wrong answer',
    'Say what a closure captures, and write a decorator that uses it',
  ],
  sections: [
    {
      id: 'legb',
      title: 'Where Python looks',
      blocks: [
        {
          kind: 'prose',
          body: 'When Python meets a name, it checks four places in a fixed order, stopping at the first that has it: **Local** (the running function), **Enclosing** (a function this one is written inside), **Global** (the top of the file), **Built-in** (names Python provides, like `len`). The initials spell LEGB, and the order is the whole rule.',
        },
        {
          kind: 'annotate',
          ask: 'The same name at all four levels. Click a line to see which one it finds.',
          code: 'name = "global name"\n\ndef outer():\n    name = "enclosing name"\n\n    def inner():\n        name = "local name"\n        print("inner sees: ", name)\n\n    inner()\n    print("outer sees: ", name)\n\nouter()\nprint("module sees:", name)\nprint("len is a built-in:", len)\n',
          notes: {
            '1': 'The module-level name. Anything that never finds a closer name ends up here.',
            '4': 'A new name called name, local to outer — the enclosing level for anything defined inside outer.',
            '7': 'Another new name, local to inner itself — the closest possible match, so this is the one inner\'s print below will use.',
            '8': 'Finds the local name from line 7 first — Local beats Enclosing, Global and Built-in every time.',
            '11': 'Runs after inner() has finished, back at outer\'s own level — finds the enclosing name from line 4, since outer has no closer one of its own.',
            '14': 'Back at module level: finds the name from line 1, since neither outer\'s nor inner\'s name is visible outside its own function.',
            '15': 'len was never redefined anywhere, so the search reaches all the way to Built-in and finds Python\'s own function.',
          },
        },
        {
          kind: 'code',
          caption: 'Take the local name away and watch the search go one level further: the first function finds an enclosing name, the second has none there and carries on to the module level.',
          code: 'name = "global name"\n\ndef with_enclosing():\n    name = "enclosing name"\n\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\ndef without_enclosing():\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\nprint("the outer function defines a name:")\nwith_enclosing()\nprint("the outer function does not:")\nwithout_enclosing()\n',
        },
        {
          kind: 'code',
          caption: 'A built-in is the last place checked, so a name of your own at module level hides the built-in for the whole file — the last line here raises further down, on a line that looks innocent.',
          code: 'words = ["fig", "apple"]\nprint(len(words))\n\nlist = ["my", "own", "list"]\nprint(list)\n\nprint(list(range(3)))\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Names to avoid',
          body: '`list`, `dict`, `set`, `str`, `int`, `sum`, `max`, `min`, `id`, `type`, `input` and `file` are all built-ins that read like sensible variable names. The failure comes later and does not mention shadowing. Add a word: `word_list`, `total_sum`, `user_input`.',
        },
      ],
    },
    {
      id: 'assignment-makes-local',
      title: 'Assignment decides',
      blocks: [
        {
          kind: 'prose',
          body: 'Reading a name searches outward. Assigning to one does not: **if a function assigns to a name anywhere in its body, that name is local to the function everywhere in its body** — including on lines before the assignment. Python works this out when it compiles the function, before a single line runs.',
        },
        {
          kind: 'code',
          caption: 'The print on the first line is what fails here, not the assignment below it — total is local for the whole function, so at the moment of the print that local name has nothing in it yet. The error is UnboundLocalError, not NameError: not "never heard of this name" but "this name is local here and empty so far".',
          code: 'total = 100\n\ndef spend(amount):\n    print("starting from", total)\n    total = total - amount\n    return total\n\nprint(spend(30))\n',
        },
        {
          kind: 'compare',
          caption: 'Reading a global is fine; assigning to it changes the rules everywhere in the function, including the if that reads it first — and the decision is made at compile time, so an assignment inside an if that never runs still makes the name local, as the next example shows.',
          left: {
            label: 'Reads only',
            code: 'limit = 100\n\ndef check(amount):\n    if amount > limit:\n        return f"{amount} is over the limit of {limit}"\n    return f"{amount} is fine"\n\nprint(check(150))\nprint(check(50))\n',
          },
          right: {
            label: 'Reads and assigns',
            code: 'limit = 100\n\ndef check(amount):\n    if amount > limit:\n        limit = amount\n        return f"raised the limit to {limit}"\n    return f"{amount} is fine"\n\nprint(check(150))\n',
            bad: true,
          },
        },
        {
          kind: 'code',
          caption: 'The enclosing assignment never runs on the second call, and inner does not fall back to the module-level name: because outer assigns to name somewhere in its body, name belongs to outer for the whole of it, so inner is compiled to look there. When the assignment does not run, the message says exactly that — a free variable not associated with a value.',
          code: 'name = "global name"\n\ndef outer(define_it):\n    if define_it:\n        name = "enclosing name"\n\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\nprint("the if runs:")\nouter(True)\nprint("the if does not run:")\nouter(False)\n',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The usual fix',
          body: 'The way out is usually not `global`: pass the value in and return the new one, so the function has no opinion about where the caller keeps it.',
        },
        {
          kind: 'code',
          caption: 'The same job, with the state kept by the caller.',
          code: 'def check(amount, limit):\n    if amount > limit:\n        return f"raised the limit to {amount}", amount\n    return f"{amount} is fine", limit\n\nlimit = 100\nmessage, limit = check(150, limit)\nprint(message, "-> limit is now", limit)\n\nmessage, limit = check(50, limit)\nprint(message, "-> limit is now", limit)\n',
        },
      ],
    },
    {
      id: 'global-nonlocal',
      title: 'global and nonlocal',
      blocks: [
        {
          kind: 'prose',
          body: 'Two keywords override the assignment rule. `global x` sends assignments to the module-level `x`; `nonlocal x` sends them to the `x` in the enclosing function. Neither changes how *reading* works — they only say where an assignment lands.',
        },
        {
          kind: 'code',
          caption: 'bump_local makes its own count and the module-level one never moves; bump_global reaches out and changes the shared one. nonlocal does the same thing one level in — and there is no keyword for "the level above that": it finds the nearest enclosing function with the name, and raises at compile time if none does.',
          code: 'count = 0\n\ndef bump_local():\n    count = 1\n    return count\n\ndef bump_global():\n    global count\n    count = count + 1\n    return count\n\nprint("bump_local returns:", bump_local(), "module count:", count)\nprint("bump_global returns:", bump_global(), "module count:", count)\nprint("bump_global returns:", bump_global(), "module count:", count)\n',
        },
        {
          kind: 'code',
          caption: 'A counter kept in the enclosing function. The two counters do not interfere, because each call to make_counter creates its own count — the first real closure in this lesson.',
          code: 'def make_counter():\n    count = 0\n\n    def bump():\n        nonlocal count\n        count = count + 1\n        return count\n\n    return bump\n\nfirst = make_counter()\nsecond = make_counter()\n\nprint(first(), first(), first())\nprint(second())\nprint(first())\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Why global is usually wrong',
          body: 'A function that changes a global can be called from anywhere and affects everything. Two of them can fight over the same name, tests cannot run in any order, and nothing in the call site says the state moved. Prefer passing values in and returning them out; where state genuinely has to persist, a closure or a class keeps it where the reader can see it.',
        },
        {
          kind: 'quiz',
          prompt: 'A function needs to read a module-level dictionary CONFIG and add a key to it: `CONFIG["debug"] = True`. Does it need `global CONFIG`?',
          options: [
            {
              text: 'No — this mutates the object CONFIG already points at, rather than assigning to the name CONFIG, so the normal outward search still finds it',
              correct: true,
              why: 'Only an assignment to the name itself (CONFIG = {...}) triggers the local-everywhere rule; indexing into the existing dict does not touch the name binding at all.',
            },
            {
              text: 'Yes — any change to CONFIG requires declaring it global first',
              why: 'Assigning a whole new value to the name would need it; mutating the existing dict in place through [] does not.',
            },
            {
              text: 'No, but only because dictionaries are a special case exempt from the assignment rule',
              why: 'There is no special case — the same reasoning applies to any mutable object: CONFIG.update(...), some_list.append(...), all mutate without assigning to the name.',
            },
            {
              text: 'It depends on whether CONFIG was created inside or outside a function',
              why: 'It depends only on whether this function assigns to the name CONFIG itself, not on where CONFIG was originally created.',
            },
          ],
        },
      ],
    },
    {
      id: 'closures',
      title: 'What a closure keeps',
      blocks: [
        {
          kind: 'prose',
          body: 'A function defined inside another can use the outer function\'s names, and can still use them **after the outer function has returned** — Python keeps the enclosing variables alive for as long as the inner function exists. That pairing, an inner function plus the variables it kept, is a **closure**.',
        },
        {
          kind: 'code',
          caption: 'Each call to make_multiplier makes a separate factor, and each returned function keeps its own — __closure__ is where Python stores the captured variables, and each function here has a different one.',
          code: 'def make_multiplier(factor):\n    def multiply(n):\n        return n * factor\n    return multiply\n\ntimes_three = make_multiplier(3)\ntimes_ten = make_multiplier(10)\n\nprint(times_three(5))\nprint(times_ten(5))\nprint(times_three(times_ten(1)))\nprint(times_three.__closure__[0].cell_contents)\nprint(times_ten.__closure__[0].cell_contents)\n',
        },
        {
          kind: 'code',
          caption: 'The captured variable is changed after the inner function is made. Predict which value the second call prints before checking the quiz below.',
          code: 'def make_reporter():\n    label = "before"\n\n    def report():\n        return f"label is {label}"\n\n    print(report())\n    label = "after"\n    print(report())\n    return report\n\nkept = make_reporter()\nprint(kept())\n',
        },
        {
          kind: 'quiz',
          prompt: 'report is defined while label holds "before", but the second call to report() prints "after". Why?',
          options: [
            {
              text: 'A closure captures the variable itself, not the value it held at definition time — report looks label up when it runs, not when it was defined',
              correct: true,
              why: 'That is exactly what makes nonlocal counters possible too: the name is resolved every time the function runs.',
            },
            {
              text: 'Python re-runs the outer function each time report() is called, recomputing label',
              why: 'make_reporter runs only once, when kept = make_reporter() executes; report is called afterward without the outer function running again.',
            },
            {
              text: 'report keeps a snapshot of label taken the moment it was defined, and the second print shows a stale copy by mistake',
              why: 'There is no snapshot — that is precisely the wrong mental model. The closure holds a reference to the variable, so it always reflects the latest value.',
            },
            {
              text: 'Reassigning label creates a completely new closure, replacing the old report function',
              why: 'report is defined only once and is never replaced; reassigning label just changes what its shared variable holds.',
            },
          ],
        },
      ],
    },
    {
      id: 'late-binding',
      title: 'The loop variable surprise',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is a loop that builds three functions, each meant to remember its own number.',
        },
        {
          kind: 'predict',
          ask: 'Predict what this prints.',
          code: 'makers = []\nfor i in range(3):\n    def show():\n        return i\n    makers.append(show)\n\nprint([f() for f in makers])\n',
          choices: [
            '[2, 2, 2]',
            '[0, 1, 2]',
            '[0, 0, 0]',
            '[3, 3, 3]',
          ],
        },
        {
          kind: 'compare',
          caption: 'On the left, all three functions capture the same variable i, which holds its final value by the time any of them runs — nothing was copied, there is one i and three functions pointing at it. On the right, value=i is a default argument, worked out **when the def runs**, once per turn of the loop, so each function ends up with its own frozen copy.',
          left: {
            label: 'Capturing the loop variable',
            code: 'makers = []\nfor i in range(3):\n    def show():\n        return i\n    makers.append(show)\n\nprint([f() for f in makers])\n\nlambdas = [lambda: i for i in range(3)]\nprint([f() for f in lambdas])\n',
            bad: true,
          },
          right: {
            label: 'Capturing the value with a default',
            code: 'makers = []\nfor i in range(3):\n    def show(value=i):\n        return value\n    makers.append(show)\n\nprint([f() for f in makers])\n\nlambdas = [lambda value=i: value for i in range(3)]\nprint([f() for f in lambdas])\n',
          },
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'how-many-closures-share-one-i',
            title: 'More closures, same surprise',
            intro: 'Drag **how many closures** are made in the loop. Every one of them still reports whatever `i` finished on.',
            template: 'makers = []\nfor i in range(⟦count⟧):\n    def show():\n        return i\n    makers.append(show)\n\nresults = [f() for f in makers]\nprint(results)\n',
            knobs: [
              { id: 'count', kind: 'range', label: 'how many closures', min: 2, max: 8, start: 4 },
            ],
            probes: {
              results: 'results',
              labels: '[\'closure \' + str(i) for i in range(len(results))]',
            },
            visual: {
              kind: 'bars',
              values: 'results',
              labels: 'labels',
              max: 7,
              caption: 'One bar per closure, each showing what it returns. Every bar is the same height.',
            },
            notes: {
              '0': 'Two closures, and both return 1 — the loop\'s final value of `i`, not 0 and 1 as their positions might suggest.',
              '6': 'Eight closures now, and the bars are still one flat line, just at a higher number. Adding more closures never makes them disagree, because they were never looking at different things.',
            },
            takeaway: 'Every closure in the loop points at the same variable `i`, not a copy of what `i` held when it was made. Whether there are two of them or eight, the bars stay flat, because there is only one `i` and every function is reading it after the loop has already finished with it.',
          },
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Two more ways to freeze the value',
          body: 'The default-argument fix is the shortest, using the same mechanism that makes mutable defaults dangerous: the default is evaluated at definition time. `functools.partial` does the same job more plainly. A factory function — one call per turn of the loop — works too, and is the one to reach for when the inner function is more than a line: calling a function creates a fresh scope, so its parameter is a new variable every time.',
        },
        {
          kind: 'code',
          caption: 'Three ways to keep the value, all producing the same thing.',
          code: 'import functools\n\ndef make_show(value):\n    def show():\n        return value\n    return show\n\nby_factory = [make_show(i) for i in range(3)]\nby_default = [lambda value=i: value for i in range(3)]\nby_partial = [functools.partial(lambda value: value, i) for i in range(3)]\n\nprint([f() for f in by_factory])\nprint([f() for f in by_default])\nprint([f() for f in by_partial])\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'A colleague builds event handlers in a loop: `for button in buttons: button.on_click = lambda: handle(button.name)`. Every button ends up doing the same thing. Explain what went wrong in terms of what the closure captured, and give two fixes.',
          answer: 'Every lambda captured the variable `button`, not the button it was made for. After the loop, `button` points at the last one, so every handler reports that name.\n\nFix one, the default: `lambda b=button: handle(b.name)` — the default is evaluated once per turn of the loop, so each handler gets its own value.\n\nFix two, a factory: write `def make_handler(b): return lambda: handle(b.name)` and call it in the loop. Each call gets its own scope and its own `b`.\n\nA third option is to capture the value rather than the object right away — `name = button.name` inside the loop does not help, because that is still one variable shared by all the closures. The fix has to create a new scope or a new binding per turn, which is what both the default and the factory do.',
        },
      ],
    },
    {
      id: 'decorator',
      title: 'A decorator, built up',
      blocks: [
        {
          kind: 'prose',
          body: 'A decorator is a closure with syntax on top: a function that takes a function, wraps it in another function, and hands the wrapper back. Build it in the open first, with no `@` anywhere.',
        },
        {
          kind: 'code',
          caption: 'A wrapper, applied by hand. Three things from earlier in this lesson are doing the work: wrapper is a closure over fn, *args, **kwargs let it accept whatever fn accepts, and area = timed_label(area) rebinds the name so every later call goes through the wrapper — which is all @ means.',
          code: 'def timed_label(fn):\n    def wrapper(*args, **kwargs):\n        print(f"-> {fn.__name__}{args}")\n        result = fn(*args, **kwargs)\n        print(f"<- {fn.__name__} gave {result}")\n        return result\n    return wrapper\n\ndef area(width, height):\n    return width * height\n\narea = timed_label(area)\n\nprint("answer:", area(3, 4))\n',
        },
        {
          kind: 'code',
          caption: 'The same thing with the syntax — the @ line runs the rebinding for you, and one decorator now serves two functions with different signatures, which is what the stars bought.',
          code: 'def timed_label(fn):\n    def wrapper(*args, **kwargs):\n        print(f"-> {fn.__name__}{args}")\n        result = fn(*args, **kwargs)\n        print(f"<- {fn.__name__} gave {result}")\n        return result\n    return wrapper\n\n@timed_label\ndef area(width, height):\n    return width * height\n\n@timed_label\ndef greet(name):\n    return f"hello, {name}"\n\nprint("answer:", area(3, 4))\nprint("answer:", greet("ana"))\n',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'One loose end',
          body: 'The name has been rebound to `wrapper`, and `wrapper` is what the rest of the program now sees — including its name and its documentation, as the comparison below shows.',
        },
        {
          kind: 'compare',
          caption: 'The same decorator, with and without functools.wraps. Without it, the decorated function reports itself as wrapper and has lost its documentation, which makes tracebacks and help output worse for everyone; wraps copies the original\'s name, docstring and a few other attributes onto the wrapper, and costs one line.',
          left: {
            label: 'Without wraps',
            code: 'def plain(fn):\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs)\n    return wrapper\n\n@plain\ndef area(width, height):\n    """Area of a rectangle."""\n    return width * height\n\nprint(area.__name__)\nprint(area.__doc__)\n',
            bad: true,
          },
          right: {
            label: 'With wraps',
            code: 'import functools\n\ndef kept(fn):\n    @functools.wraps(fn)\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs)\n    return wrapper\n\n@kept\ndef area(width, height):\n    """Area of a rectangle."""\n    return width * height\n\nprint(area.__name__)\nprint(area.__doc__)\n',
          },
        },
        {
          kind: 'steps',
          title: 'Writing a decorator',
          items: [
            'Write `def decorator(fn):` — it takes the function being decorated.',
            'Inside it, write `def wrapper(*args, **kwargs):` so it accepts anything.',
            'Put `@functools.wraps(fn)` on the line above `wrapper`.',
            'Do your work, call `result = fn(*args, **kwargs)`, do any work after, and `return result`.',
            'Return `wrapper` from the decorator — return the function, do not call it.',
          ],
        },
        {
          kind: 'code',
          caption: 'The commonest mistake is step five: writing return wrapper() instead of return wrapper. That calls the wrapper immediately, at decoration time, and binds the name to whatever it returned — which is what raises here, on purpose.',
          code: 'def broken(fn):\n    def wrapper(*args, **kwargs):\n        return fn(*args, **kwargs)\n    return wrapper()\n\n@broken\ndef area(width, height):\n    return width * height\n\nprint(area(3, 4))\n',
        },
        {
          kind: 'checkpoint',
          prompt: 'Write a decorator `remember` that caches a function\'s results so a repeated call with the same arguments does not run the body again. Say where the cache lives, what it is keyed by, and one kind of function this must not be used on.',
          answer: 'The cache is a dict in the decorator\'s scope, captured by the wrapper as a closure:\n\n```\nimport functools\n\ndef remember(fn):\n    cache = {}\n\n    @functools.wraps(fn)\n    def wrapper(*args):\n        if args not in cache:\n            cache[args] = fn(*args)\n        return cache[args]\n\n    return wrapper\n```\n\nIt is keyed by `args`, which works because `args` is a tuple, and a tuple of immutable arguments is hashable. That is also the first limitation: a call with a list argument raises, and handling `**kwargs` needs the keyword arguments turned into something hashable too.\n\nIt must not be used on a function whose answer can change — anything reading a file, the clock, a random number, or anything that mutates its arguments. Caching assumes the same input always gives the same output. The standard library has this written properly as `functools.cache`, with a size limit and the argument handling done for you.',
        },
      ],
    },
  ],
};

export default lesson;
