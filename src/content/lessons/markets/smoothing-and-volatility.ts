// Smoothing and volatility: a sliding window over a price series, and how much a price tends to move.
//
// Second lesson of the Markets track. Every average, every return and every "unusual" flag is printed by
// Python, and the picture is drawn from pairs Python produced for each window size. Nothing is typed in.
import type { Lesson } from '../../lessonSchema.ts';

const PRICES = '[100, 102, 101, 103, 102, 104, 103, 105, 112, 110, 111, 109, 110, 108, 109, 107, 108, 106, 107, 105]';

const lesson: Lesson = {
  id: 'smoothing-and-volatility',
  title: 'Smoothing and volatility',
  summary: 'Smooth a price series with a sliding window, measure how much it moves, and ask whether today\'s move is out of the ordinary',
  track: 'markets',
  order: 2,
  minutes: 10,
  prereqs: ['a-price-series'],
  outcomes: [
    'Compute a [[moving-average]] with a sliding window, and say what a longer window does to it',
    'Work out [[volatility]] by hand as the standard deviation of returns, with a loop and `math.sqrt`',
    'Compute a rolling volatility over a window of recent returns',
    'Decide whether today\'s move is unusual by comparing it with recent volatility',
  ],
  sections: [
    {
      id: 'a-sliding-window',
      title: 'A sliding window',
      blocks: [
        {
          kind: 'prose',
          body:
            'A price series wobbles. Some of the wobble is news; most of it is noise. A [[moving-average]] is the oldest way to see through the noise: instead of looking at today\'s price, look at the **average of the last few days**.\n\n' +
            'The "last few days" is a **window** that slides along the list. On each day you take the slice that ends today, average it, and move on. Below, the window is three days wide, and the price list has one obvious jump in the middle of it.',
        },
        {
          kind: 'code',
          code:
            `prices = ${PRICES}\n` +
            'n = 3\n' +
            'for i in range(n - 1, len(prices)):\n' +
            '    window = prices[i - n + 1:i + 1]\n' +
            '    average = sum(window) / n\n' +
            '    print("day", i, " price", prices[i], " average", round(average, 2))\n',
          caption: 'Day, price, and the average of that day and the two before it. The loop starts at `n - 1` because earlier days do not have a full window behind them.',
        },
        {
          kind: 'predict',
          ask: 'The window slides one step each time round the loop. Predict what this prints, including the slice.',
          code:
            'prices = [10, 20, 30, 40]\n' +
            'n = 2\n' +
            'for i in range(n - 1, len(prices)):\n' +
            '    window = prices[i - n + 1:i + 1]\n' +
            '    print(i, window, sum(window) / n)\n',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'window-size',
            title: 'One price series, every window size',
            intro: 'Drag the **window**. Watch how much of the wobble survives in the average, and how long after the jump the average reaches its peak.',
            template:
              `prices = ${PRICES}\n` +
              'n = ⟦window⟧\n' +
              'averages = []\n' +
              'for i in range(n - 1, len(prices)):\n' +
              '    window = prices[i - n + 1:i + 1]\n' +
              '    averages.append(sum(window) / n)\n' +
              'peak = max(averages)\n' +
              'peak_day = averages.index(peak) + n - 1\n' +
              'print(n, "day window:", len(averages), "averages")\n' +
              'print("highest average", round(peak, 2), "on day", peak_day)\n' +
              'print("days after the jump on day 8:", peak_day - 8)\n',
            knobs: [
              { id: 'window', kind: 'range', label: 'window (days)', min: 2, max: 10, start: 3 },
            ],
            probes: {
              raw: '[[i, p] for i, p in enumerate(prices)]',
              smooth: '[[i + n - 1, round(a, 2)] for i, a in enumerate(averages)]',
              peak: '[[peak_day, round(peak, 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'day',
              yLabel: 'price',
              caption: 'The prices, and the moving average for the window you chose. The dot is the highest point of the average.',
              series: [
                { probe: 'raw', label: 'price' },
                { probe: 'smooth', label: 'moving average' },
              ],
              marker: 'peak',
            },
            notes: {
              '0': 'A window of two barely smooths anything: each average is only yesterday and today, so it follows every wobble and turns almost as soon as the price does.',
              '8': 'A window of ten is half the whole series. The jump is spread thin across ten averages, and the peak of the average lands long after the price itself peaked.',
            },
            takeaway:
              'A longer window is smoother *and* later, and you cannot have one without the other. Every extra day in the window is one more old price voting on what "now" looks like. Choosing the window is choosing how much you want to be told about what happened this week.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'You lengthen the window from 3 days to 9 days. What happens to the moving average?',
          options: [
            { text: 'It becomes smoother and turns later', why: 'Each average now includes six more old prices, so a wobble is diluted, and a real turn shows up only once enough new prices have entered the window.', correct: true },
            { text: 'It becomes smoother and turns sooner', why: 'Smoothing comes from including more of the past, and more of the past means a slower turn, not a faster one.' },
            { text: 'It follows the price more closely', why: 'That is what a shorter window does. A two-day average is close to the price itself.' },
            { text: 'It starts on the same day as before', why: 'The first average needs a full window behind it, so a longer window starts later in the series.' },
          ],
        },
      ],
    },
    {
      id: 'how-much-it-moves',
      title: 'How much it moves',
      blocks: [
        {
          kind: 'prose',
          body:
            'The moving average answers "where is the price heading?". A different question is "how much does it move?". That is [[volatility]], and it is the number that matters most for everything later in this track.\n\n' +
            'Volatility is the **standard deviation of the returns**: not of the prices, but of the day-to-day changes. The recipe is four steps, and each is a line of Python you already know:\n\n' +
            '1. Turn the prices into returns — here, each day\'s change as a percentage of the day before.\n' +
            '2. Find the mean return.\n' +
            '3. For each return, square its distance from the mean, and add those up.\n' +
            '4. Divide by the count and take the square root.\n\n' +
            'No library does it for us here. A loop and `math.sqrt` are enough, and doing it by hand once is how you come to trust the number.',
        },
        {
          kind: 'code',
          code:
            'import math\n' +
            '\n' +
            `prices = ${PRICES}\n` +
            'returns = []\n' +
            'for i in range(1, len(prices)):\n' +
            '    change = 100 * (prices[i] - prices[i - 1]) / prices[i - 1]\n' +
            '    returns.append(change)\n' +
            '\n' +
            'mean = sum(returns) / len(returns)\n' +
            'total = 0\n' +
            'for r in returns:\n' +
            '    total = total + (r - mean) ** 2\n' +
            'volatility = math.sqrt(total / len(returns))\n' +
            '\n' +
            'print("returns:", [round(r, 1) for r in returns])\n' +
            'print("mean return", round(mean, 2))\n' +
            'print("volatility", round(volatility, 2))\n',
          caption: 'The same price list as before. One return per day after the first, then the mean, the squared distances, and the square root. Volatility here is in the same units as the returns: percentage points per day.',
        },
        {
          kind: 'predict',
          ask: 'Four returns that go up and down by the same amount. Predict the mean and the volatility this prints.',
          code:
            'import math\n' +
            'returns = [2, -2, 2, -2]\n' +
            'mean = sum(returns) / len(returns)\n' +
            'total = 0\n' +
            'for r in returns:\n' +
            '    total = total + (r - mean) ** 2\n' +
            'print(mean, math.sqrt(total / len(returns)))\n',
        },
        {
          kind: 'prose',
          body:
            'Notice what volatility ignores: **direction**. A return of +2 and a return of −2 are the same distance from a mean of zero, so they count the same. High volatility does not mean "going down"; it means going somewhere fast. A price that climbs by exactly the same amount every day has returns that never stray from their mean at all.',
        },
        {
          kind: 'quiz',
          prompt: 'Series A rises by 1% every day for ten days. Series B alternates: up 5%, down 5%, up 5%, down 5%. Which has the higher volatility?',
          options: [
            { text: 'A, because it went up more', why: 'Volatility ignores where the price ends up. It asks how far each return sits from the mean return, and A\'s returns are all the same number.' },
            { text: 'B, because its returns sit far from their mean', why: 'B\'s mean return is close to zero and every one of its returns is a long way from it on one side or the other. That spread is what volatility measures.', correct: true },
            { text: 'They are the same, because both end up near where they started', why: 'Where a series ends is not what volatility measures. A did not end near where it started anyway; B roughly did, and B is the volatile one.' },
          ],
        },
      ],
    },
    {
      id: 'is-today-unusual',
      title: 'Is today unusual?',
      blocks: [
        {
          kind: 'prose',
          body:
            'Now put the two ideas together. Volatility over the whole series tells you what this price is like in general. But a trader wants to know about **today**: is this morning\'s move ordinary for this price, or is something happening?\n\n' +
            'The answer needs a **rolling volatility**: the same sliding window as the moving average, applied to returns instead of prices. Take the last few returns *before* today, work out their volatility, and compare today\'s move with it. A common rule of thumb calls a move unusual when it is more than twice the recent volatility.',
        },
        {
          kind: 'code',
          code:
            'import math\n' +
            '\n' +
            'def volatility(values):\n' +
            '    mean = sum(values) / len(values)\n' +
            '    total = 0\n' +
            '    for v in values:\n' +
            '        total = total + (v - mean) ** 2\n' +
            '    return math.sqrt(total / len(values))\n' +
            '\n' +
            `prices = ${PRICES}\n` +
            'returns = []\n' +
            'for i in range(1, len(prices)):\n' +
            '    returns.append(100 * (prices[i] - prices[i - 1]) / prices[i - 1])\n' +
            '\n' +
            'n = 5\n' +
            'for i in range(n, len(returns)):\n' +
            '    recent = volatility(returns[i - n:i])\n' +
            '    ratio = abs(returns[i]) / recent\n' +
            '    label = ""\n' +
            '    if ratio > 2:\n' +
            '        label = "unusual"\n' +
            '    print("day", i + 1, " move", round(returns[i], 2), " recent vol", round(recent, 2), " ratio", round(ratio, 1), label)\n',
          caption: 'The volatility recipe is now a function, called once per day on the five returns before that day. `returns[i - n:i]` stops just short of `i`, so today\'s move is never compared against itself. Look at what the jump does to the days after it.',
        },
        {
          kind: 'predict',
          ask: 'The recent volatility is 1.5. Predict what this prints for each of the three moves.',
          code:
            'recent_vol = 1.5\n' +
            'for move in [1.0, -4.5, 3.6]:\n' +
            '    ratio = abs(move) / recent_vol\n' +
            '    print(move, round(ratio, 1), ratio > 2)\n',
        },
        {
          kind: 'match',
          ask: 'Match each situation to what it means.',
          pairs: [
            { left: 'A moving average with a longer window', right: 'smoother, but later to turn' },
            { left: 'A volatility of zero', right: 'every return was the same number' },
            { left: 'A move three times the recent volatility', right: 'an unusual day, worth a look' },
            { left: 'A big jump entered the window a few days ago', right: 'the bar for "unusual" is higher this week' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A friend looks at the rolling volatility, sees it has gone up, and says "so the price is falling". What have they mixed up?',
          answer:
            'They have read a **size** as a **direction**. Volatility is the standard deviation of returns, and squaring the distance from the mean throws the sign away: a jump up raises it exactly as much as a fall of the same size. In the series above, the day that sent the rolling volatility up was a jump *upwards*. What a rise in volatility does tell you is that the bar for "unusual" is now higher: the same-sized move that looked dramatic last week is ordinary this week, until the big day slides out of the window again.',
        },
      ],
    },
  ],
};

export default lesson;
