// The charts a commodity desk actually has open, and what each one is for.
//
// Written for someone who has to sit in the room and follow the conversation. Every chart here is the
// real shape, drawn from numbers the verifier computed — but the point of the lesson is the vocabulary
// and the reading, not the arithmetic, so no program is ever shown.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'the-screens-traders-read',
  title: 'The screens traders read',
  summary: 'The five charts on a commodity desk, what each is called, and what someone means when they point at one',
  track: 'markets',
  order: 2,
  minutes: 12,
  outcomes: [
    'Read an OHLC bar and say what the two ticks mean',
    'Tell a price chart from a [[forward-curve]] and say why they are never the same picture',
    'Point at a curve and name its shape as [[contango]] or [[backwardation]]',
    'Say what a spread chart is for, and why a desk watches it more than outright price',
  ],
  sections: [
    {
      id: 'the-price-chart',
      title: 'The price chart, and the bar with two ticks',
      blocks: [
        {
          kind: 'prose',
          body:
            'The first screen is the one everybody recognises: price against time, one bar for each period — a day, an hour, five minutes. It is not a line, and the reason matters.\n\n' +
            'Each bar covers the whole period. The vertical line runs from the **low** to the **high**, so you see how far price travelled. The tick on the **left** is where the period **opened**; the tick on the **right** is where it **closed**. A line chart throws both away and keeps only the close.\n\n' +
            'You will hear this called an **OHLC bar** — open, high, low, close. Drawn as filled boxes instead of ticks, the same four numbers are a **candlestick**, and traders use the words almost interchangeably. When someone says "it closed on the low", they are reading the right-hand tick sitting at the bottom of the bar: sellers had it all day and nobody bought it back.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'ohlc-bars',
            title: 'Ten days of Brent',
            intro: 'Drag **how the week went** to move the market, and **how choppy** to change how far it swung inside each day. Watch the ticks, not just the tops.',
            hideProgram: true,
            outputLabel: 'The last three days, as a desk would quote them',
            template:
              'trend = ⟦trend⟧\n' +
              'swing = ⟦swing⟧ / 10\n' +
              'price = 82.0\n' +
              'for day in range(1, 11):\n' +
              '    step = trend / 10\n' +
              '    op = price\n' +
              '    price = round(op + step, 2)\n' +
              '    hi = round(max(op, price) + swing, 2)\n' +
              '    lo = round(min(op, price) - swing, 2)\n' +
              '    if day > 7:\n' +
              '        print("day", day, " open", op, " high", hi, " low", lo, " close", price)\n',
            knobs: [
              { id: 'trend', kind: 'range', label: 'how the week went, $ a day', min: -10, max: 10, start: 4 },
              { id: 'swing', kind: 'range', label: 'how choppy, $', min: 0, max: 14, start: 6 },
            ],
            probes: {
              bars:
                '[[round(82.0 + (⟦trend⟧ / 10) * (d - 1), 2), '
                + 'round(max(82.0 + (⟦trend⟧ / 10) * (d - 1), 82.0 + (⟦trend⟧ / 10) * d) + (⟦swing⟧ / 10), 2), '
                + 'round(min(82.0 + (⟦trend⟧ / 10) * (d - 1), 82.0 + (⟦trend⟧ / 10) * d) - (⟦swing⟧ / 10), 2), '
                + 'round(82.0 + (⟦trend⟧ / 10) * d, 2)] for d in range(1, 11)]',
              days: '[str(d) for d in range(1, 11)]',
            },
            visual: {
              kind: 'candles',
              bars: 'bars',
              labels: 'days',
              xLabel: 'trading day',
              yLabel: '$ a barrel',
              caption: 'Ten daily bars. Left tick is the open, right tick is the close; a red bar closed below where it opened.',
            },
            notes: {
              '14-6': 'A quiet drift up: every close sits above its own open, which is what a trending market looks like bar by bar.',
              '10-6': 'No trend at all. The bars still have range — the market moved plenty inside each day and finished where it started. A line chart would show a flat line and tell you none of that.',
              '14-0': 'Zero chop: the bar collapses to the distance between open and close. Real markets never look like this, which is the point of drawing the range at all.',
            },
            takeaway:
              'Two ticks and a line carry four numbers per period. That is why a desk uses them instead of a line: the line answers "where did it end", and the bar answers "where did it end, how far did it go, and who won the day".',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A daily bar has a long vertical line, with both ticks bunched near the top. What happened?',
          options: [
            { text: 'The market fell hard all day', why: 'Both ticks near the top means it opened high and closed high. The long line says it visited much lower ground at some point, then came back.' },
            { text: 'It sold off during the day and recovered by the close', why: 'Opened high, went a long way down — the low end of the range — and finished back near where it started. Traders call the lower part a long tail or a wick.', correct: true },
            { text: 'It barely traded', why: 'A long range is the opposite of quiet: the price covered a lot of ground inside the period.' },
          ],
        },
      ],
    },
    {
      id: 'the-curve',
      title: 'The curve is a different picture entirely',
      blocks: [
        {
          kind: 'prose',
          body:
            'The second screen looks similar and means something completely different. On a price chart the horizontal axis is **history** — days that have happened. On a **forward curve** the horizontal axis is **the future**: each point is the price agreed *today* for delivery in a different month.\n\n' +
            'So a price chart is one number moving through time, and a curve is many numbers standing still. Both change every day; only one of them is a history.\n\n' +
            'Traders name the shape without thinking. Sloping up is [[contango]] — later delivery costs more, which pays somebody to hold the stuff. Sloping down is [[backwardation]] — the market wants it now. On gas and LNG the curve is not a smooth slope at all: it has **seasonality**, a hump every northern winter, because January demand is not June demand and everybody knows it a year ahead.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'curve-shapes',
            title: 'The same commodity, three shapes',
            intro: 'Drag the **carry** to tilt the curve, and the **winter premium** to add the seasonal hump a gas curve has. Watch what the shape is saying.',
            hideProgram: true,
            outputLabel: 'The curve, month by month',
            template:
              'base = 12.0\n' +
              'slope = ⟦slope⟧ / 10\n' +
              'winter = ⟦winter⟧ / 10\n' +
              'for m in [0, 6, 12, 18]:\n' +
              '    season = winter if m % 12 in (0, 1, 11) else 0.0\n' +
              '    print("month", m, " ", round(base + slope * m + season, 2))\n',
            knobs: [
              { id: 'slope', kind: 'range', label: 'carry, $ a month', min: -6, max: 6, start: 2 },
              { id: 'winter', kind: 'range', label: 'winter premium, $', min: 0, max: 24, start: 15 },
            ],
            probes: {
              curve:
                '[[m, round(12.0 + (⟦slope⟧ / 10) * m + ((⟦winter⟧ / 10) if m % 12 in (0, 1, 11) else 0.0), 2)] '
                + 'for m in range(0, 25)]',
              flat: '[[m, 12.0] for m in range(0, 25)]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'months to delivery',
              yLabel: '$ per unit',
              caption: 'Each point is a price agreed today for delivery that many months out. The flat line is today\'s spot for comparison.',
              series: [
                { probe: 'curve', label: 'forward curve' },
                { probe: 'flat', label: 'spot today' },
              ],
            },
            notes: {
              '8-15': 'Contango with a winter hump: the shape of a gas or LNG curve in a normal year. The slope pays storage; the hump is January.',
              '6-0': 'Dead flat. Nobody is paid to store and nobody is short of it — rare, and usually brief.',
              '6-24': 'No carry at all but a big winter premium: the market is relaxed about the year and frightened about one season of it. Every seller with storage is aiming at those months.',
            },
            takeaway:
              'A curve is a sentence about the future written in prices. Upward means "hold it for me and I will pay you". Downward means "I need it now". A hump means "I need it in January", and on gas that hump is most of the trading year.',
          },
        },
        {
          kind: 'match',
          ask: 'Match each screen to the question it answers.',
          pairs: [
            { left: 'OHLC bar chart', right: 'what has price done, and how violently' },
            { left: 'Forward curve', right: 'what does the market charge for each delivery month' },
            { left: 'Spread chart', right: 'how far apart are two things that usually track' },
            { left: 'Position blotter', right: 'what do we actually own right now' },
          ],
        },
      ],
    },
    {
      id: 'spreads-and-vol',
      title: 'What a desk actually watches',
      blocks: [
        {
          kind: 'prose',
          body:
            'Here is the thing that surprises people: a commodity desk spends less time looking at outright price than at the **difference between two prices**. That difference is a spread, and it gets its own chart, drawn exactly like a price chart because that is what it is — one number moving through time.\n\n' +
            'A **[[time-spread]]** is the same thing two months apart: it is the storage trade, expressed as a single line. A **[[location-spread]]** is the same thing in two places: it is the shipping trade. A **[[crack-spread]]** is crude against the fuels made from it: it is the refinery. For LNG you will hear **JKM minus TTF** — Asia against Europe — which is the question of which continent the next cargo sails to.\n\n' +
            'Spreads are watched because they are where the business actually is, and because they behave: an outright price can go anywhere, while a spread is anchored by a physical cost — freight, storage, refining. When a spread goes further than that cost, somebody with an asset does something about it.',
        },
        {
          kind: 'prose',
          body:
            'The last screen is **volatility**, and it is the one that sounds most like jargon. Implied volatility is the number the options market is quoting: how much the price is expected to move, annualised, as a percentage. Plot it against strike and it is rarely flat — usually a **smile** or a **skew**, because the market charges more for protection against the direction that frightens it. On oil, the fear is usually upside. On equities, downside.\n\n' +
            'You do not need to price an option to use this. Vol going up means the market is paying more for protection; a skew steepening on one side tells you which way the fear is pointing.',
        },
        {
          kind: 'quiz',
          prompt: 'A colleague says "the Jan–Feb spread blew out to 90 cents". What are they describing?',
          options: [
            { text: 'The price of gas rose by 90 cents', why: 'A spread is a difference, not a level. Both months could have fallen while the gap between them widened.' },
            { text: 'January is now 90 cents more expensive than February', why: 'A time spread quoted between two months is the difference between them, and "blew out" means that gap got wider than it had been.', correct: true },
            { text: 'Volatility rose to 90%', why: 'That would be an implied vol number, quoted as a percentage against a strike, not a spread between two delivery months.' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You join a morning meeting. Someone puts up a chart with months along the bottom and says "the front is backwardated but the back half is in contango, and the Jan hump is 80 cents fatter than last week". Translate that into plain English, and say what kind of business each half of the sentence points at.',
          answer:
            'They are showing a forward curve, not a price history: months to delivery along the bottom, price up the side. "The front is backwardated" means near months cost more than the ones just after them — the market wants the product now, which drains storage and rewards anyone holding inventory today. "The back half is in contango" means that further out, later delivery costs more again, so storage over that period is being paid for; a trader with a tank sells those far months and buys the nearer ones. "The Jan hump is 80 cents fatter than last week" means the winter seasonal premium widened: the market has grown more worried about January specifically, which is a signal to anyone who can deliver into that month — and it is a spread observation, not a view on whether prices are high or low.',
        },
      ],
    },
  ],
};

export default lesson;
