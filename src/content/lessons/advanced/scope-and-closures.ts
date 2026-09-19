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
          body: 'When Python meets a name it has to decide which one you meant. It checks four places, in a fixed order, and stops at the first one that has it.\n\n**Local** — names in the function that is running.\n**Enclosing** — names in a function that this one is written inside.\n**Global** — names at the top level of the file.\n**Built-in** — names Python provides, such as `len` and `print`.\n\nThe initials spell LEGB, which is worth remembering because the order is the whole rule.',
        },
        {
          kind: 'code',
          caption: 'The same name at all four levels. Each `print` finds the nearest one.',
          code: 'name = "global name"\n\ndef outer():\n    name = "enclosing name"\n\n    def inner():\n        name = "local name"\n        print("inner sees: ", name)\n\n    inner()\n    print("outer sees: ", name)\n\nouter()\nprint("module sees:", name)\nprint("len is a built-in:", len)\n',
        },
        {
          kind: 'prose',
          body: 'Each level found its own `name` and never looked further out. Now take the local one away and watch the search go one step further at a time.',
        },
        {
          kind: 'code',
          caption: 'Two outer functions. Only one of them has a `name` for the inner function to find.',
          code: 'name = "global name"\n\ndef with_enclosing():\n    name = "enclosing name"\n\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\ndef without_enclosing():\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\nprint("the outer function defines a name:")\nwith_enclosing()\nprint("the outer function does not:")\nwithout_enclosing()\n',
        },
        {
          kind: 'prose',
          body: 'In the first, the search stopped at the enclosing function. In the second there was nothing to find there, so it carried on to the module level.\n\nA built-in is the last place checked, which has a consequence worth knowing: a name of your own at module level hides the built-in of the same name, for the whole file.',
        },
        {
          kind: 'code',
          caption: 'Shadowing a built-in. This raises further down, on a line that looks innocent.',
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
          body: 'Reading a name searches outwards. Assigning to one does not: **if a function assigns to a name anywhere in its body, that name is local to the function everywhere in its body** — including on lines before the assignment.\n\nPython works this out when it compiles the function, before a single line runs. That is why the error below is so confusing the first time.',
        },
        {
          kind: 'code',
          caption: 'The function reads a name it also assigns to. This raises on purpose.',
          code: 'total = 100\n\ndef spend(amount):\n    print("starting from", total)\n    total = total - amount\n    return total\n\nprint(spend(30))\n',
        },
        {
          kind: 'prose',
          body: 'The `print` on the first line of the function is what failed, not the assignment below it. Because `total` is assigned somewhere in the body, it is a local name for the whole function, and at the moment of the print that local name has not been given a value yet.\n\nThe error type is `UnboundLocalError`, and it is a very specific message: not "I have never heard of this name", but "this name is local here and nothing has been put in it yet". Reading that as a `NameError` sends you hunting for a typo that is not there.',
        },
        {
          kind: 'compare',
          caption: 'Reading a global is fine. Assigning to it is what changes the rules.',
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
          kind: 'prose',
          body: 'The two functions differ by one line, and that line changed what `limit` means everywhere in the function, including the `if` that reads it.\n\nThe decision is made when the function is compiled, which means it does not depend on whether the assignment actually runs. An assignment inside an `if` that turns out to be false still makes the name local.',
        },
        {
          kind: 'code',
          caption: 'The enclosing assignment never runs on the second call. The inner function does not fall back to the module-level name.',
          code: 'name = "global name"\n\ndef outer(define_it):\n    if define_it:\n        name = "enclosing name"\n\n    def inner():\n        print("  inner sees:", name)\n\n    inner()\n\nprint("the if runs:")\nouter(True)\nprint("the if does not run:")\nouter(False)\n',
        },
        {
          kind: 'prose',
          body: 'This is the same rule one level out. Because `outer` assigns to `name` somewhere in its body, `name` belongs to `outer` for the whole of it, and `inner` is compiled to look there — not at the module level. When the assignment does not run, there is nothing in that slot, and the message says so in those words: a free variable not associated with a value.\n\nThe practical warning is that the earlier example, where the inner function did find the module-level name, only worked because the outer function never assigned to it at all.',
        },
        {
          kind: 'prose',
          body: 'The usual fix for all of this is not to reach for `global`. It is to pass the value in and return the new one, so the function has no opinion about where the caller keeps it.',
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
          body: 'Two keywords override the assignment rule. `global x` says "assignments to `x` in this function go to the module-level `x`". `nonlocal x` says "they go to the `x` in the enclosing function".\n\nNeither changes how *reading* works. They exist only to say where an assignment lands.',
        },
        {
          kind: 'code',
          caption: 'The same function with and without the keyword.',
          code: 'count = 0\n\ndef bump_local():\n    count = 1\n    return count\n\ndef bump_global():\n    global count\n    count = count + 1\n    return count\n\nprint("bump_local returns:", bump_local(), "module count:", count)\nprint("bump_global returns:", bump_global(), "module count:", count)\nprint("bump_global returns:", bump_global(), "module count:", count)\n',
        },
        {
          kind: 'prose',
          body: '`bump_local` made its own `count` and the module-level one never moved. `bump_global` reached out and changed the shared one.\n\n`nonlocal` does the same thing one level in, for a name in an enclosing function. Notice that there is no keyword that means "the level above the one above": `nonlocal` finds the nearest enclosing function that has the name, and raises at compile time if none does.',
        },
        {
          kind: 'code',
          caption: 'A counter kept in the enclosing function.',
          code: 'def make_counter():\n    count = 0\n\n    def bump():\n        nonlocal count\n        count = count + 1\n        return count\n\n    return bump\n\nfirst = make_counter()\nsecond = make_counter()\n\nprint(first(), first(), first())\nprint(second())\nprint(first())\n',
        },
        {
          kind: 'prose',
          body: 'The two counters do not interfere, because each call to `make_counter` created its own `count`. That is the first real closure in this lesson, and the next section is about what makes it work.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Why global is usually wrong',
          body: 'A function that changes a global can be called from anywhere and affects everything. Two of them can fight over the same name, tests cannot run in any order, and nothing in the call site says the state moved. Prefer passing values in and returning them out; where state genuinely has to persist, a closure or a class keeps it where the reader can see it.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A function needs to read a module-level dictionary `CONFIG` and add a key to it. Does it need `global`? What if it needed to replace `CONFIG` with a whole new dictionary?',
          answer: 'Adding a key needs no `global`. `CONFIG["debug"] = True` is not an assignment to the name `CONFIG` — it is a method call on the object that name points at — so the name is still resolved by the normal outward search and the dict is mutated in place.\n\nReplacing it, `CONFIG = {...}`, is an assignment to the name, which makes `CONFIG` local to the function and leaves the module-level one untouched. That version needs `global CONFIG` to do what it looks like it does.\n\nThe distinction is the same one as mutating versus rebinding: `global` is about which name an *assignment* binds, and it has nothing to say about mutation.',
        },
      ],
    },
    {
      id: 'closures',
      title: 'What a closure keeps',
      blocks: [
        {
          kind: 'prose',
          body: 'A function defined inside another function can use the outer function\'s names. The surprise is that it can still use them **after the outer function has returned**. Python keeps the enclosing variables alive for as long as the inner function exists. That arrangement — an inner function plus the variables it kept — is a **closure**.',
        },
        {
          kind: 'code',
          caption: 'The outer function has finished by the time the inner one runs.',
          code: 'def make_multiplier(factor):\n    def multiply(n):\n        return n * factor\n    return multiply\n\ntimes_three = make_multiplier(3)\ntimes_ten = make_multiplier(10)\n\nprint(times_three(5))\nprint(times_ten(5))\nprint(times_three(times_ten(1)))\nprint(times_three.__closure__[0].cell_contents)\nprint(times_ten.__closure__[0].cell_contents)\n',
        },
        {
          kind: 'prose',
          body: 'Each call to `make_multiplier` made a separate `factor`, and each returned function kept its own. The last two lines look inside: `__closure__` is where Python stores the captured variables, and each function has a different one.\n\nNow the part that catches everybody. A closure captures the **variable**, not the value it had at the time. If the variable changes later, the closure sees the new value.',
        },
        {
          kind: 'code',
          caption: 'The captured variable is changed after the inner function is made.',
          code: 'def make_reporter():\n    label = "before"\n\n    def report():\n        return f"label is {label}"\n\n    print(report())\n    label = "after"\n    print(report())\n    return report\n\nkept = make_reporter()\nprint(kept())\n',
        },
        {
          kind: 'prose',
          body: '`report` was defined while `label` held one value and produced the other, because it looks the name up when it runs, not when it is defined.\n\nThat is the correct behaviour and it is what makes `nonlocal` counters possible. It is also the cause of the most reliably surprising loop in Python.',
        },
      ],
    },
    {
      id: 'late-binding',
      title: 'The loop variable surprise',
      blocks: [
        {
          kind: 'prose',
          body: 'Here is a loop that builds three functions, each meant to remember its own number. Predict what the three of them return before reading the output.',
        },
        {
          kind: 'compare',
          caption: 'Both loops build three functions. Only one set remembers three different numbers.',
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
          kind: 'prose',
          body: 'On the left, all three functions captured the same variable `i`, and by the time any of them ran, the loop had finished and `i` held its final value. Nothing was copied at any point; there was one `i` and three functions pointing at it.\n\nOn the right, `value=i` is a default argument, and a default is worked out **when the `def` runs** — once per turn of the loop. Each function ends up with its own copy of the number, frozen at the moment it was made.',
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
          kind: 'prose',
          body: 'The default-argument fix is the shortest one, and the same mechanism that makes mutable defaults dangerous is what makes it work here: the default is evaluated at definition time. `functools.partial` does the same job with the intent written more plainly.',
        },
        {
          kind: 'code',
          caption: 'Three ways to keep the value, all producing the same thing.',
          code: 'import functools\n\ndef make_show(value):\n    def show():\n        return value\n    return show\n\nby_factory = [make_show(i) for i in range(3)]\nby_default = [lambda value=i: value for i in range(3)]\nby_partial = [functools.partial(lambda value: value, i) for i in range(3)]\n\nprint([f() for f in by_factory])\nprint([f() for f in by_default])\nprint([f() for f in by_partial])\n',
        },
        {
          kind: 'prose',
          body: 'The factory version is the one to reach for when the inner function is more than a line: calling a function creates a fresh scope, and the parameter `value` is a new variable on every call, so there is nothing to share.',
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
          body: 'A decorator is a closure with syntax on top. Nothing new is needed to understand one: a function that takes a function, wraps it in another function, and hands the wrapper back.\n\nBuild it in the open first, with no `@` anywhere.',
        },
        {
          kind: 'code',
          caption: 'A wrapper, applied by hand.',
          code: 'def timed_label(fn):\n    def wrapper(*args, **kwargs):\n        print(f"-> {fn.__name__}{args}")\n        result = fn(*args, **kwargs)\n        print(f"<- {fn.__name__} gave {result}")\n        return result\n    return wrapper\n\ndef area(width, height):\n    return width * height\n\narea = timed_label(area)\n\nprint("answer:", area(3, 4))\n',
        },
        {
          kind: 'prose',
          body: 'Three things from earlier in this lesson are doing the work. `wrapper` is a closure over `fn`, which is how it still knows what to call after `timed_label` has returned. `*args, **kwargs` let it accept whatever the wrapped function accepts. And `area = timed_label(area)` rebinds the name, so every later call goes through the wrapper.\n\nThat last line is all `@` means.',
        },
        {
          kind: 'code',
          caption: 'The same thing with the syntax. The `@` line runs the rebinding for you.',
          code: 'def timed_label(fn):\n    def wrapper(*args, **kwargs):\n        print(f"-> {fn.__name__}{args}")\n        result = fn(*args, **kwargs)\n        print(f"<- {fn.__name__} gave {result}")\n        return result\n    return wrapper\n\n@timed_label\ndef area(width, height):\n    return width * height\n\n@timed_label\ndef greet(name):\n    return f"hello, {name}"\n\nprint("answer:", area(3, 4))\nprint("answer:", greet("ana"))\n',
        },
        {
          kind: 'prose',
          body: 'One decorator now serves two functions with different signatures, which is what the stars bought.\n\nThere is one loose end. The name has been rebound to `wrapper`, and `wrapper` is what the rest of the program now sees — including its name and its documentation.',
        },
        {
          kind: 'compare',
          caption: 'The same decorator, with and without `functools.wraps`.',
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
          kind: 'prose',
          body: 'Without `functools.wraps`, the decorated function reports itself as `wrapper` and has lost its documentation, which makes tracebacks and help output worse for everyone. `functools.wraps` copies the original\'s name, docstring and a few other attributes onto the wrapper. It is itself a decorator, applied to the inner function, and it costs one line.',
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
          kind: 'prose',
          body: 'The commonest mistake is step five: writing `return wrapper()` instead of `return wrapper`. That calls the wrapper immediately, at decoration time, and binds the name to whatever it returned.',
        },
        {
          kind: 'code',
          caption: 'Returning the result instead of the function. This raises on purpose.',
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
