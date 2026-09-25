// A price series: a list of closes, the returns between them, and how far a price has fallen from its peak.
//
// First lesson of the Markets track. Every number a reader sees was printed by Python at verify time, and
// the picture is drawn from pairs Python produced. Nothing here is typed in as fact.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'a-price-series',
  title: 'A price series',
  summary: 'What a list of prices is, why returns beat prices for comparing things, and how far a price has fallen from its peak',
  track: 'markets',
  order: 1,
  minutes: 10,
  outcomes: [
    'Read a price series as a list, one close a day, and pick out the [[spot]] price',
    'Turn prices into simple returns so two things on different scales can be compared',
    'Work out a [[log-return]] and say why log returns add up across days when simple returns do not',
    'Track a running peak and measure the [[drawdown]] from it',
  ],
  sections: [
    {
      id: 'a-list-of-prices',
      title: 'A list of prices',
      blocks: [
        {
          kind: 'prose',
          body:
            'A price series is the simplest thing in markets: one number per day, in order. Say iron ore, in dollars a tonne, one close a day for a week. In Python that is a list, and the index is the day.\n\n' +
            'The last item is the price right now, for delivery now: the **[[spot]]** price. Everything else in this track is measured against it. The rest of the list is history, and history is where the questions are: how much did it move, and how far is it below its best?',
        },
        {
          kind: 'code',
          code:
            'prices = [100, 104, 101, 108, 112]\n' +
            '\n' +
            'for day in range(1, len(prices)):\n' +
            '    change = prices[day] - prices[day - 1]\n' +
            '    print("day", day, "close", prices[day], "change", change)\n' +
            '\n' +
            'print("spot today:", prices[-1])\n' +
            'print("highest close so far:", max(prices))\n' +
            'print("over the week:", prices[-1] - prices[0])\n',
          caption: 'Each day compared with the day before, then three questions the list can answer directly.',
        },
        {
          kind: 'quiz',
          prompt: 'Today\'s spot price is the most recent close. Which expression picks it out of `prices`, however long the list grows?',
          options: [
            { text: 'prices[-1]', why: 'A negative index counts from the end, so −1 is always the last item, however many days the list has.', correct: true },
            { text: 'prices[len(prices)]', why: 'Indexes start at 0, so the last item sits at len(prices) − 1. This asks for the item after the last one, and there is no such item.' },
            { text: 'prices[0]', why: 'That is the first day in the list: the oldest close, not today\'s.' },
            { text: 'max(prices)', why: 'That is the highest close so far, which is the running peak. You will want it soon, for drawdown, but it is not the price right now.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'The `change` column has a problem. A move of 4 on a price of 100 is a real day. The same 4 on something priced at 2000 is noise. A dollar change only means something next to the price it came from, so it cannot be compared across two things on different scales, or even across the same thing in a different year. To compare, you need the change *as a fraction of where it started*.',
        },
      ],
    },
    {
      id: 'returns-not-prices',
      title: 'Returns, not prices',
      blocks: [
        {
          kind: 'prose',
          body:
            'The **simple return** is the change divided by the old price: `(new - old) / old`. Up from 100 to 104 is a return of 0.04, or 4%. It is a fraction, so it no longer cares what the price was.\n\n' +
            'That is what lets you put two very different things side by side. A big miner trades at tens of dollars a share; a small explorer at a couple of dollars. In dollars their daily moves are on two different rulers. As returns they are on one.',
        },
        {
          kind: 'code',
          code:
            'def dollar_moves(prices):\n' +
            '    out = []\n' +
            '    for i in range(1, len(prices)):\n' +
            '        out.append(round(prices[i] - prices[i - 1], 2))\n' +
            '    return out\n' +
            '\n' +
            'def simple_returns(prices):\n' +
            '    out = []\n' +
            '    for i in range(1, len(prices)):\n' +
            '        out.append(round((prices[i] - prices[i - 1]) / prices[i - 1], 3))\n' +
            '    return out\n' +
            '\n' +
            'big = [40.0, 41.0, 39.5, 42.0]      # a big miner, dollars a share\n' +
            'small = [2.0, 2.1, 2.0, 2.2]        # a small explorer\n' +
            'print("big   in dollars:", dollar_moves(big), " as returns:", simple_returns(big))\n' +
            'print("small in dollars:", dollar_moves(small), " as returns:", simple_returns(small))\n',
          caption: 'Which share had the wilder three days? Decide from the dollar lists first, then from the return lists, and see whether your answer changes.',
        },
        {
          kind: 'predict',
          ask: 'A price goes from 80 up to 100, then straight back down to 80. Predict the two simple returns.',
          code:
            'old, new = 80, 100\n' +
            'print(round((new - old) / old, 2))\n' +
            'print(round((old - new) / new, 2))\n',
          choices: ['0.25\n-0.2', '0.25\n-0.25', '0.2\n-0.2'],
        },
        {
          kind: 'prose',
          body:
            'The price ended exactly where it began, yet the two returns are not mirror images and do not cancel. That is the flaw in simple returns: each one is measured against a different starting point, so adding them across days gives you a number that is not the return of the whole trip.\n\n' +
            'The **[[log-return]]** fixes this. Instead of `(new - old) / old`, take `math.log(new / old)`, the natural log of the price ratio. Two things make it worth the strangeness. For small moves it comes out close to the simple return, so nothing is lost. And because the log of a product is the sum of the logs, and the ratio over a whole trip is the product of the daily ratios, the log return of the trip is *exactly* the sum of the daily log returns. Up one day and back the next really do add to zero.',
        },
        {
          kind: 'code',
          code:
            'import math\n' +
            '\n' +
            'prices = [100, 110, 99]\n' +
            'simple = []\n' +
            'logs = []\n' +
            'for i in range(1, len(prices)):\n' +
            '    simple.append((prices[i] - prices[i - 1]) / prices[i - 1])\n' +
            '    logs.append(math.log(prices[i] / prices[i - 1]))\n' +
            '\n' +
            'print("simple returns:", [round(r, 4) for r in simple])\n' +
            'print("log returns:   ", [round(r, 4) for r in logs])\n' +
            'print("sum of simple:", round(sum(simple), 4), " whole trip:", round((prices[-1] - prices[0]) / prices[0], 4))\n' +
            'print("sum of log:   ", round(sum(logs), 4), " whole trip:", round(math.log(prices[-1] / prices[0]), 4))\n',
          caption: 'Up a tenth, then down a tenth. For each kind of return, compare the sum with the whole-trip figure printed beside it: one pair agrees and one does not.',
        },
      ],
    },
    {
      id: 'the-fall-from-the-peak',
      title: 'The fall from the peak',
      blocks: [
        {
          kind: 'prose',
          body:
            'Ask anyone who holds something what hurts, and it is not the daily return. It is how far below the best price they are. That is the **[[drawdown]]**: the fall from the highest close so far, as a fraction of that high.\n\n' +
            'To compute it you keep a **running peak**, the highest close seen up to each day, and measure the gap from it. On a day that sets a new high the drawdown is zero. The deepest it gets over a stretch is the *maximum drawdown*, the number a fund is asked for when someone wants to know how bad it got.',
        },
        {
          kind: 'code',
          code:
            'prices = [100, 120, 90, 110, 80, 96]\n' +
            '\n' +
            'peak = prices[0]\n' +
            'for day, price in enumerate(prices):\n' +
            '    peak = max(peak, price)\n' +
            '    drawdown = (peak - price) / peak\n' +
            '    print("day", day, "close", price, "peak", peak, "drawdown", round(drawdown, 2))\n',
          caption: 'The peak only ever rises or stays put. The drawdown is measured from it, not from the day before and not from what anyone paid.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'one-bad-day',
            title: 'One bad day, and the climb back',
            intro: 'The price climbs a steady 2% a day, except on the **shock day**, when it falls by **drop** percent. Drag both. The upper line is the running peak; the dot is the bottom of the drawdown.',
            template:
              'shock_day = ⟦shock-day⟧\n' +
              'drop = ⟦drop⟧\n' +
              'price = 100.0\n' +
              'prices = []\n' +
              'for day in range(12):\n' +
              '    if day == shock_day:\n' +
              '        price = price * (1 - drop / 100)\n' +
              '    elif day > 0:\n' +
              '        price = price * 1.02\n' +
              '    prices.append(round(price, 2))\n' +
              '\n' +
              'peaks = []\n' +
              'peak = prices[0]\n' +
              'for p in prices:\n' +
              '    peak = max(peak, p)\n' +
              '    peaks.append(peak)\n' +
              'drawdowns = [(pk - p) / pk for p, pk in zip(prices, peaks)]\n' +
              'worst = max(drawdowns)\n' +
              'print("worst drawdown:", round(worst * 100, 1), "%")\n' +
              'print("days spent below the old peak:", sum(1 for d in drawdowns if d > 0))\n',
            knobs: [
              { id: 'shock-day', kind: 'range', label: 'shock day', min: 1, max: 10, start: 3 },
              { id: 'drop', kind: 'range', label: 'drop, in percent', min: 0, max: 30, start: 15 },
            ],
            probes: {
              price: '[[day, p] for day, p in enumerate(prices)]',
              peak: '[[day, pk] for day, pk in enumerate(peaks)]',
              trough: '[[drawdowns.index(worst), prices[drawdowns.index(worst)]]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'day',
              yLabel: 'price',
              caption: 'The price and its running peak. The dot marks the deepest point of the drawdown; the drawdown lasts until the price line climbs back up to the peak line.',
              series: [
                { probe: 'price', label: 'price' },
                { probe: 'peak', label: 'running peak' },
              ],
              marker: 'trough',
            },
            notes: {
              '2-0': 'No drop at all: the price never leaves its peak, the two lines sit on top of each other, and the drawdown is zero every day.',
              '0-30': 'A hard fall on day 1, then ten days of steady climbing, and the price is still below its old high at the end. The fall was a share of the peak; the climb back is a share of the trough, a smaller number.',
              '9-10': 'A modest fall, but late: only one climbing day is left after it. Where a fall lands matters as much as its size when you are counting days under water.',
            },
            takeaway:
              'The peak line only ever goes up or sideways, and the drawdown is over only when the price climbs all the way back to it. A fall is a percentage of the peak; the climb back is a percentage of the trough, which is smaller, so it has to be a bigger percentage than the fall was. That is why the size of a fall matters more than it looks: halve, and you must double.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A share falls 50% from its peak. Measured from where it now sits, how much does it have to rise to get back to that peak?',
          options: [
            { text: '50%', why: 'Half of the fallen price is only a quarter of the old peak. A rise is measured from where you are, not from where you were.' },
            { text: '100%', why: 'From half the peak, doubling is the only way back. The way down was a share of the peak; the way up is a share of the trough, so it must be a bigger percentage.', correct: true },
            { text: '200%', why: 'That would take it to three times the trough, well past the old peak.' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A friend says: "My share went up 10% one day and down 10% the next, so I am back where I started. And it never fell below what I paid, so there is no drawdown." What is wrong with each half?',
          answer:
            'Up a tenth then down a tenth is not a round trip: the fall is a tenth of a bigger number than the rise was, so the price ends a little below where it began. Adding the two simple returns hides that; adding the two log returns shows it, because log returns add to the log return of the whole trip.\n\n' +
            'And drawdown is measured from the running peak, not from the purchase price. The day of the 10% rise set a new peak, and the 10% fall is a drawdown from that peak, whatever was paid. Being above your entry price and being at your peak are different things.',
        },
      ],
    },
  ],
};

export default lesson;
