// Core lesson for topic 04: defining and calling functions.
// Nothing here states what Python does. Every value a reader sees comes from the verifier running the block.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'core-functions',
  title: 'Writing your own functions',
  summary: 'def, parameters, and the difference between showing an answer and handing it back',
  track: 'core',
  minutes: 24,
  topicId: 'functions-basics',
  prereqs: ['core-for-loops'],
  outcomes: [
    'Write a function with a def line, a docstring and a return, and call it',
    'Say what the caller ends up holding, and why print and return are not interchangeable',
    'Tell a parameter from an argument, and predict what a wrong-order call does',
    'Explain why a name created inside a function cannot be used outside it',
    'Use a returned value in a sum, a condition, an f-string or another call',
  ],
  sections: [
    {
      id: 'why-functions',
      title: 'Why write a function',
      blocks: [
        {
          kind: 'prose',
          body: 'A function is a piece of work with a name, a way in and a way out. You describe the job once, and from then on you ask for it by name and give it whatever values it needs.\n\nThe reason this matters is not tidiness. It is that a function can be checked on its own. If a program that does four things is wrong, you have one bug somewhere in the whole file. If it is four functions, you can call each one with a value you know the answer to, and find out in a minute which of them is lying. Every assignment in this unit gets easier the moment it is split into functions.',
        },
        {
          kind: 'compare',
          caption: 'The same conversion, three times. On the left the formula is written out three times, so a mistake in it has to be found and fixed three times.',
          left: {
            label: 'The formula, repeated',
            bad: true,
            code: `print(round(18.0 * 9 / 5 + 32, 1))
print(round(31.5 * 9 / 5 + 32, 1))
print(round(41.0 * 9 / 5 + 31, 1))
`,
          },
          right: {
            label: 'The formula, named once',
            code: `def c_to_f(celsius):
    """Return celsius converted to Fahrenheit."""
    return celsius * 9 / 5 + 32


print(round(c_to_f(18.0), 1))
print(round(c_to_f(31.5), 1))
print(round(c_to_f(41.0), 1))
`,
          },
        },
        {
          kind: 'prose',
          body: 'One line on the left has a typo in the formula. It is the third one, and finding it took you longer than it should have, which is the whole argument for functions in a sentence. On the right there is one copy of the rule, so there is one place for it to be wrong and one place to fix it.',
        },
      ],
    },
    {
      id: 'def-and-call',
      title: 'Define, then call',
      blocks: [
        {
          kind: 'prose',
          body: 'A definition starts with `def`, the name, the parameters in brackets and a colon, then an indented body. The first line of the body should be a docstring in triple quotes saying what the function returns. Give every function one: it is marked in this unit, and it is the fastest way to notice that you are not sure yourself what the function is meant to hand back.\n\nA `def` on its own runs nothing. It creates the function and moves on. The body runs each time the name is followed by brackets.',
        },
        {
          kind: 'code',
          caption: 'A definition, two calls, and the docstring read back out.',
          code: `def fare(zones):
    """Return the SmartRider fare in dollars for a trip through this many zones."""
    cost = zones * 2.5
    return cost


print(fare(2))
print(fare(5))
print(fare.__doc__)
`,
        },
        {
          kind: 'code',
          caption: 'The body of this one never runs. Nothing calls it.',
          code: `def shout():
    print('nobody ever sees this')


print('the program finished')
`,
        },
        {
          kind: 'prose',
          body: 'The brackets are what run it, and they are needed even when there is nothing to put in them. Leaving them off is not an error, which is the problem: the name on its own is the function itself, and printing it produces a description of the object rather than an answer.',
        },
        {
          kind: 'code',
          caption: 'The same name, with and without brackets.',
          code: `def welcome():
    """Return the greeting shown on the front page."""
    return 'Kaya, welcome to UWA'


print(welcome)
print(welcome())
`,
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Put your functions at the top',
          body: 'The `def` has to have run before any line that calls the function. Defining everything at the top of the file and calling it underneath is both the convention and the way to avoid a `NameError` that has nothing to do with spelling.',
        },
      ],
    },
    {
      id: 'return-versus-print',
      title: 'return versus print',
      blocks: [
        {
          kind: 'prose',
          body: 'This is the most important idea in the whole unit, and it is worth slowing down for.\n\n`print` shows a value to a human. `return` hands a value to the rest of the program. On the screen they look identical, which is precisely why the confusion survives: you run your function, you see the right number, and you conclude it works.\n\nIt does not. A function that prints gives its caller nothing. A function with no `return` hands back `None`, no matter what it printed or worked out along the way.',
        },
        {
          kind: 'compare',
          caption: 'The same arithmetic, the same right answers on screen, and only one of these can be used.',
          left: {
            label: 'The function prints',
            bad: true,
            code: `def area(width, height):
    print(width * height)


total = area(3, 4) + area(2, 5)
print(total)
`,
          },
          right: {
            label: 'The function returns',
            code: `def area(width, height):
    """Return the area of a rectangle."""
    return width * height


total = area(3, 4) + area(2, 5)
print(total)
`,
          },
        },
        {
          kind: 'quiz',
          prompt: 'The `area` function on the left prints its answer instead of returning it. What does the expression `area(3, 4)` actually hand back to whatever called it?',
          options: [
            { text: 'None', correct: true, why: 'A function with no `return` statement always hands back `None`, no matter what it printed or worked out along the way.' },
            { text: '12', why: '12 is what was printed to the screen. Printing sends characters to the screen; it does not send a value back to the code that made the call.' },
            { text: "'12' as text", why: 'The function does not return text either. It returns nothing at all, which Python represents as `None`.' },
            { text: 'An error, immediately', why: 'The call itself raises nothing. The error only appears later, when something tries to use the `None` it handed back — such as adding two of them together.' },
          ],
        },
        {
          kind: 'predict',
          ask: 'One of these functions returns, and one only prints. Predict everything this prints, in order.',
          code: `def twice(n):
    return n * 2


def show_twice(n):
    print(n * 2)


a = twice(5)
b = show_twice(5)
print(a, b)
`,
        },
        {
          kind: 'experiment',
          id: 't04-x1',
        },
        {
          kind: 'callout',
          tone: 'exam',
          title: 'The marker never looks at the screen',
          body: 'When a question says "return", it is graded by calling your function and checking the value that comes back. A function that prints the right answer and returns nothing scores zero on that test, however right the output looked. If you also want to see the value, print it at the call site: `print(area(3, 4))`.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your function prints the correct answer when you run it, and the marker says it returns `None`. How can both be true?',
          answer: 'Because printing and returning are unrelated. `print` sends characters to the screen and produces no value for the program; `return` produces a value for the program and sends nothing to the screen. A function can do both, one, or neither. Change `print(x)` on the last line of the function to `return x`, and if you still want to see the value, wrap the call: `print(my_function(...))`.',
        },
      ],
    },
    {
      id: 'where-return-goes',
      title: 'return ends the function',
      blocks: [
        {
          kind: 'prose',
          body: '`return` does two things at once: it hands a value back, and it ends the function immediately. Nothing after it in that call runs — not the rest of the body, not the rest of a loop.\n\nThat makes indentation matter more inside a function than anywhere else, because a `return` placed one level too deep can only be reached on a pass that already returned, so it never runs at all. The cases that were supposed to reach it fall off the end of the function instead, and falling off the end is always `None`.',
        },
        {
          kind: 'code',
          caption: 'One branch has an answer and the other has nothing. Watch the second line of output.',
          code: `def size(n):
    """Return 'big' when n is over ten."""
    if n > 10:
        return 'big'


print(size(15))
print(size(5))
`,
        },
        {
          kind: 'experiment',
          id: 't04-x2',
        },
        {
          kind: 'prose',
          body: 'The "everything else" answer goes at the same indentation as the `if`, one level in from `def`, and it needs no condition of its own. Anything still running has already failed the test above, because `return` ended every case that passed it.\n\nThe same shape appears with loops, and it is worth learning as a pattern: return as soon as you find what you are looking for, and put the "not found" answer **after** the loop, never in an `else` inside it. An `else` inside the loop gives up after checking the very first value.',
        },
      ],
    },
    {
      id: 'parameters-and-arguments',
      title: 'Which value goes where',
      blocks: [
        {
          kind: 'prose',
          body: 'The names in the `def` line are **parameters**. The values in the call are **arguments**. The parameters are empty boxes; calling the function fills them.\n\nThey are matched by position and by nothing else. Python does not know that one of them means adults and the other means children — it fills the first from the first, the second from the second, and starts the body.',
        },
        {
          kind: 'code',
          caption: 'Three calls. Two of them produce a number and the third stops the program.',
          code: `def trip_cost(adults, children):
    """Return the cost of the ferry trip in dollars."""
    return adults * 5 + children * 2


print(trip_cost(2, 3))
print(trip_cost(3, 2))
print(trip_cost(2))
`,
        },
        {
          kind: 'prose',
          body: 'Compare the first two lines of output. The same two numbers in the other order gave a different price, with no error and no warning, because both calls are perfectly legal — one of them is answering a question nobody asked. A wrong argument order is the quietest bug in this topic.\n\nThe third call is the loud kind. Python refuses to run the body at all and names the parameter it never received. Too many arguments gets a similar message counting them for you. Both point at the call line, not at the `def`.',
        },
        {
          kind: 'experiment',
          id: 't04-x3',
        },
        {
          kind: 'checkpoint',
          prompt: 'How do you protect yourself against calling a two-parameter function with its arguments the wrong way round?',
          answer: 'Name the parameters so the order is obvious at the call site — `trip_cost(adults, children)` rather than `trip_cost(a, b)` — and say in the docstring what each one is. Then test with two values that cannot be confused, such as 1 and 10, where a swap gives an obviously wrong answer. Testing with 2 and 2 proves nothing at all.',
        },
      ],
    },
    {
      id: 'using-the-value',
      title: 'Using what comes back',
      blocks: [
        {
          kind: 'prose',
          body: 'Everything a function creates — its parameters and every name assigned in its body — exists only while that call is running. When the call ends, those names are gone. The returned value is the only thing that gets out.',
        },
        {
          kind: 'code',
          caption: 'The call ran, and the name it created inside did not survive it. This one stops on purpose.',
          code: `def c_to_f(celsius):
    """Return celsius converted to Fahrenheit."""
    fahrenheit = celsius * 9 / 5 + 32
    return fahrenheit


c_to_f(38.5)
print(fahrenheit)
`,
        },
        {
          kind: 'prose',
          body: 'The call on the second-to-last line did all the work correctly and then threw the answer away, because nothing caught it. Catch it in a variable, and the value is yours.',
        },
        {
          kind: 'code',
          caption: 'A call is an expression, so it fits anywhere a value fits.',
          code: `def c_to_f(celsius):
    """Return celsius converted to Fahrenheit."""
    return celsius * 9 / 5 + 32


def is_century_heat(celsius):
    """Return True when the temperature is at least 100 degrees Fahrenheit."""
    return c_to_f(celsius) >= 100


today = 38.5
hot = c_to_f(today)
print(hot)
print(f'{today} C is {hot:.1f} F')
if is_century_heat(today):
    print('over the century')
print(is_century_heat(20.0))
`,
        },
        {
          kind: 'prose',
          body: 'Four different uses of a returned value in one block: stored in a variable, dropped into an f-string, used as the condition of an `if`, and passed straight into another function. The second function never repeats the conversion arithmetic; it calls the first one and builds on the answer. That is what makes small functions worth writing.\n\nNotice also that `is_century_heat` is tested with `if is_century_heat(today):` and not `== True`. It already hands back a yes-or-no value.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'return-value-across-a-range',
            title: 'Watching a return value across a range of arguments',
            intro: 'Drag the Celsius temperature into `c_to_f` and watch what comes back. The picture plots the same function against many arguments at once.',
            template: 'def c_to_f(celsius):\n    """Return celsius converted to Fahrenheit."""\n    return celsius * 9 / 5 + 32\n\n\ntoday = ⟦c⟧\nprint("c_to_f(", today, ") =", c_to_f(today))\n',
            knobs: [
              { id: 'c', kind: 'range', label: 'the Celsius temperature to convert', min: -40, max: 40, start: 20 },
            ],
            probes: {
              converted: '[[c, c_to_f(c)] for c in range(-40, 41)]',
              'same-number': '[[c, c] for c in range(-40, 41)]',
              here: '[[⟦c⟧, c_to_f(⟦c⟧)], [⟦c⟧, ⟦c⟧]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'Celsius',
              yLabel: 'value',
              marker: 'here',
              caption: 'The return value across a range of arguments, next to the argument itself. The dots mark the temperature you chose.',
              series: [
                { probe: 'converted', label: 'c_to_f(celsius)' },
                { probe: 'same-number', label: 'celsius (for comparison)' },
              ],
            },
            notes: {
              '0': 'At -40 the function returns -40 too. This is the one temperature where the Celsius number and the Fahrenheit number are identical, which is exactly where the two lines in the picture cross.',
              '40': 'At 0 Celsius the function returns 32, the freezing point of water. It is a good value to test a temperature function against, because you already know the answer by heart.',
              '80': 'At 40 Celsius the function returns 104. The gap between the two lines is now the widest shown: it only grows as the temperature climbs away from -40.',
            },
            takeaway: 'A function has exactly one return value for each argument, so plotting them across a range shows the whole relationship at once instead of one call at a time. Here the two lines cross exactly once, at -40, the single temperature where the Celsius reading and the Fahrenheit reading happen to agree. Everywhere else they diverge, which is why "the same number" is not the same thing as "the same temperature".',
          },
        },
      ],
    },
    {
      id: 'worked-example',
      title: 'Two functions, one answer',
      blocks: [
        {
          kind: 'prose',
          body: 'The worked example below splits a task into a helper that answers one small question and a second function that uses it inside a loop. Watch for two things: the helper returns a condition directly, and it is tested on its own before anything is built on top of it.',
        },
        {
          kind: 'workedExample',
        },
      ],
    },
    {
      id: 'traps',
      title: 'Traps and practice',
      blocks: [
        {
          kind: 'prose',
          body: 'The first of these is the one to take most seriously: the code looks completely right on screen and still hands back nothing.',
        },
        {
          kind: 'mistakes',
        },
        {
          kind: 'practice',
          body: 'Go and write some functions. When you finish one, call it from the Playground with a value you already know the answer to, and check what comes back rather than what appears on the screen.',
        },
      ],
    },
  ],
};

export default lesson;
