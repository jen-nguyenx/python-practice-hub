// An option before expiry: why "out of the money" is not "worthless", and what a quiet week costs.
//
// Every value here is a call priced by Python at verify time, never a number typed in. The formula is
// Black-Scholes, written in a few lines of `math` and explained in one paragraph rather than derived.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'an-option-before-expiry',
  title: 'An option before expiry',
  summary: 'Why an option is worth something before its last day, the three dials that set its value, and what a quiet week costs',
  track: 'markets',
  order: 6,
  minutes: 12,
  prereqs: ['optionality-at-expiry', 'smoothing-and-volatility'],
  outcomes: [
    'Say whether a call is in, at or out of the money from the [[spot]] and the [[strike]]',
    'Explain why an out-of-the-money option is still worth something before expiry',
    'Name the three things that set an option\'s value before expiry and say which way each one pushes',
    'Price a European call with the math module and watch [[time-decay]] happen in the numbers',
  ],
  sections: [
    {
      id: 'still-worth-something',
      title: 'Still worth something',
      blocks: [
        {
          kind: 'prose',
          body:
            'The last lesson stopped on expiry day, when a call is worth `max(spot - strike, 0)` and nothing else. Traders have a word for where the [[spot]] sits against the [[strike]]: [[moneyness]]. A call is **in the money** when the spot is above the strike (it would pay if it expired right now), **out of the money** when the spot is below it, and **at the money** when the two are level.\n\n' +
            'Before expiry, "out of the money" does not mean worthless. The spot still has time to climb past the strike, and the right to buy at the strike is worth whatever that chance is worth. Three things set the size of that chance: **where the spot is** now, **how long is left**, and **how much the price moves** — its [[volatility]].',
        },
        {
          kind: 'code',
          code:
            'import math\n' +
            '\n' +
            'def norm_cdf(x):\n' +
            '    """The chance a bell-curve outcome lands below x."""\n' +
            '    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n' +
            '\n' +
            'def call_value(spot, strike, years, rate, vol):\n' +
            '    """What a European call is worth before expiry (Black-Scholes)."""\n' +
            '    d1 = (math.log(spot / strike) + (rate + vol ** 2 / 2) * years) / (vol * math.sqrt(years))\n' +
            '    d2 = d1 - vol * math.sqrt(years)\n' +
            '    return spot * norm_cdf(d1) - strike * math.exp(-rate * years) * norm_cdf(d2)\n' +
            '\n' +
            'for spot in [90, 100, 110]:\n' +
            '    before = call_value(spot, 100, 30 / 365, 0.05, 0.25)\n' +
            '    print(spot, "with 30 days left:", round(before, 2), " at expiry:", max(spot - 100, 0))\n',
          caption: 'A strike of 100, 30 days to go, and a price that moves about 25% a year. Compare each line with what the same call would be worth if today were expiry day.',
        },
        {
          kind: 'prose',
          body:
            '`call_value` is the Black–Scholes formula, and you do not need to derive it to use it. Read it as: *the payoff, averaged over everywhere the price could end up, discounted back to today.* `norm_cdf` does the averaging — it is the chance that a bell-curve outcome lands below a point, and `d1` and `d2` are that point worked out in the option\'s own units. `math.exp(-rate * years)` is the discount: a dollar at expiry is worth a little less than a dollar now, at the interest rate `rate`, which this lesson holds at 5% throughout. Volatility goes in as a yearly figure, so `0.25` means a price that typically moves about a quarter of its level over a year.',
        },
        {
          kind: 'quiz',
          prompt: 'The spot is 90 and you hold a call with a strike of 100. There are 30 days left. What is the call worth?',
          options: [
            { text: 'Nothing: it is out of the money', why: 'Out of the money means it would pay nothing if it expired *now*. It does not expire now, and 30 days is time enough for the spot to climb past 100. Look at the 90 line in the output above.' },
            { text: 'Something, but less than an at-the-money call', why: 'Yes. It is worth the chance of finishing above 100. That chance is real, and smaller than it would be with the spot already sitting at 100.', correct: true },
            { text: '10: the strike minus the spot', why: 'That is what a *put* with a strike of 100 pays at expiry. A call is the right to buy, and buying at 100 when the market is 90 pays nothing.' },
          ],
        },
      ],
    },
    {
      id: 'three-dials',
      title: 'Three dials',
      blocks: [
        {
          kind: 'prose',
          body:
            'Fix the strike at 100 and plot the call\'s value against every spot. At expiry it is the hockey stick from the last lesson. Before expiry it is a smooth curve that floats above the stick, and the gap between the curve and the stick is the value of *still having time*. Drag the volatility and pick how many days are left, and watch how far the curve lifts and where.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'call-before-expiry',
            title: 'A call before expiry, across every spot',
            intro: 'Drag the **volatility** and pick the **days left**. The dot is the value at the money, spot 100, where the stick is worth nothing and the curve sits furthest above it.',
            template:
              'import math\n' +
              '\n' +
              'def norm_cdf(x):\n' +
              '    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n' +
              '\n' +
              'def call_value(spot, strike, years, rate, vol):\n' +
              '    d1 = (math.log(spot / strike) + (rate + vol ** 2 / 2) * years) / (vol * math.sqrt(years))\n' +
              '    d2 = d1 - vol * math.sqrt(years)\n' +
              '    return spot * norm_cdf(d1) - strike * math.exp(-rate * years) * norm_cdf(d2)\n' +
              '\n' +
              'vol = ⟦vol⟧ / 100\n' +
              'days = ⟦days⟧\n' +
              'for spot in [80, 90, 100, 110, 120]:\n' +
              '    today = call_value(spot, 100, days / 365, 0.05, vol)\n' +
              '    print(spot, "today", round(today, 2), " at expiry", max(spot - 100, 0))\n',
            knobs: [
              { id: 'vol', kind: 'range', label: 'volatility, % a year', min: 10, max: 60, start: 25 },
              {
                id: 'days',
                kind: 'choices',
                label: 'days left',
                choices: [
                  { value: '7', caption: '7 days' },
                  { value: '30', caption: '30 days' },
                  { value: '90', caption: '90 days' },
                  { value: '180', caption: '180 days' },
                ],
              },
            ],
            probes: {
              today: '[[s, round(call_value(s, 100, days / 365, 0.05, vol), 2)] for s in range(60, 141, 5)]',
              halfway: '[[s, round(call_value(s, 100, days / 730, 0.05, vol), 2)] for s in range(60, 141, 5)]',
              expiry: '[[s, max(s - 100, 0)] for s in range(60, 141, 5)]',
              'at-the-money': '[[100, round(call_value(100, 100, days / 365, 0.05, vol), 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'spot price',
              yLabel: 'value of the call',
              caption: 'The same call today, when half the time has gone, and on expiry day. The dot is today\'s value at the money.',
              series: [
                { probe: 'today', label: 'today' },
                { probe: 'halfway', label: 'halfway to expiry' },
                { probe: 'expiry', label: 'at expiry' },
              ],
              marker: 'at-the-money',
            },
            notes: {
              '0-0': 'Calm and nearly over: the curve lies almost on top of the stick. With hardly any movement left in the time that remains, there is almost no chance of a different finish.',
              '50-3': 'Wild and far off: even a call well out of the money is worth real money, because a price that moves this much has every chance of reaching 100 in six months.',
            },
            takeaway:
              'The curve is always above the stick, and it lifts most at the money, where the finish is least decided. More volatility or more time lifts it further, because both mean a bigger chance of a big finish. Turn the days down and the curve sinks onto the stick — that sinking is the whole of the next section.',
          },
        },
        {
          kind: 'predict',
          ask: 'Start from an at-the-money call with 30 days left and volatility of 20%. Double the volatility, or triple the days. Which way does each push the value?',
          code:
            'import math\n' +
            '\n' +
            'def norm_cdf(x):\n' +
            '    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n' +
            '\n' +
            'def call_value(spot, strike, years, rate, vol):\n' +
            '    d1 = (math.log(spot / strike) + (rate + vol ** 2 / 2) * years) / (vol * math.sqrt(years))\n' +
            '    d2 = d1 - vol * math.sqrt(years)\n' +
            '    return spot * norm_cdf(d1) - strike * math.exp(-rate * years) * norm_cdf(d2)\n' +
            '\n' +
            'base = call_value(100, 100, 30 / 365, 0.05, 0.20)\n' +
            'jumpier = call_value(100, 100, 30 / 365, 0.05, 0.40)\n' +
            'longer = call_value(100, 100, 90 / 365, 0.05, 0.20)\n' +
            'print("double the volatility:", "worth more" if jumpier > base else "worth less")\n' +
            'print("triple the days:", "worth more" if longer > base else "worth less")\n',
          choices: [
            'double the volatility: worth more\ntriple the days: worth more',
            'double the volatility: worth more\ntriple the days: worth less',
            'double the volatility: worth less\ntriple the days: worth more',
            'double the volatility: worth less\ntriple the days: worth less',
          ],
        },
        {
          kind: 'prose',
          body:
            'Of the three dials, two are facts you can look up: the spot is on the screen and the days are on the calendar. The third is a guess about the future — how much *will* the price move between now and expiry? Nobody knows, which is why the formula is mostly run backwards. The market price of the option is known, so you search for the volatility that makes `call_value` return it. That number is the [[implied-volatility]]: the market\'s opinion of how jumpy the price will be, read off what people are paying.',
        },
        {
          kind: 'match',
          ask: 'Match each change to what it does to a call you hold, everything else held still.',
          pairs: [
            { left: 'The spot rises', right: 'worth more: closer to paying, and by more' },
            { left: 'The price gets jumpier', right: 'worth more: a bigger chance of a big finish' },
            { left: 'A week passes and nothing happens', right: 'worth less: fewer chances left to change the finish' },
            { left: 'Expiry arrives', right: 'worth exactly the payoff: chance no longer counts' },
          ],
        },
      ],
    },
    {
      id: 'a-week-of-nothing',
      title: 'A week of nothing',
      blocks: [
        {
          kind: 'prose',
          body:
            'Here is the case that surprises people. You buy a call at the money with three months to go. A week passes. The spot ends exactly where it began, the volatility has not changed, nothing happened. Your option is worth less. That is [[time-decay]]: the value of *time left* leaks out day by day, whatever the spot does.\n\n' +
            'And it does not leak evenly. Early on, losing a week barely dents the odds of a good finish. Near the end, a week is most of the time there is.',
        },
        {
          kind: 'code',
          code:
            'import math\n' +
            '\n' +
            'def norm_cdf(x):\n' +
            '    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n' +
            '\n' +
            'def call_value(spot, strike, years, rate, vol):\n' +
            '    d1 = (math.log(spot / strike) + (rate + vol ** 2 / 2) * years) / (vol * math.sqrt(years))\n' +
            '    d2 = d1 - vol * math.sqrt(years)\n' +
            '    return spot * norm_cdf(d1) - strike * math.exp(-rate * years) * norm_cdf(d2)\n' +
            '\n' +
            'def value(days_left):\n' +
            '    """The same at-the-money call, with this many days to go."""\n' +
            '    return call_value(100, 100, days_left / 365, 0.05, 0.25)\n' +
            '\n' +
            'for days in [90, 60, 30, 14, 8]:\n' +
            '    lost = value(days) - value(days - 7)\n' +
            '    print(days, "days left:", round(value(days), 2), " the next week costs", round(lost, 2))\n',
          caption: 'Spot 100, strike 100, volatility 25%, nothing moving. Each line is what the call is worth now and how much of that a quiet week takes away.',
        },
        {
          kind: 'predict',
          ask: 'Two quiet weeks: one from 90 days left down to 83, and one from 8 days left down to 1. Which takes more of the value, and is it more than twice as much?',
          code:
            'import math\n' +
            '\n' +
            'def norm_cdf(x):\n' +
            '    return 0.5 * (1 + math.erf(x / math.sqrt(2)))\n' +
            '\n' +
            'def call_value(spot, strike, years, rate, vol):\n' +
            '    d1 = (math.log(spot / strike) + (rate + vol ** 2 / 2) * years) / (vol * math.sqrt(years))\n' +
            '    d2 = d1 - vol * math.sqrt(years)\n' +
            '    return spot * norm_cdf(d1) - strike * math.exp(-rate * years) * norm_cdf(d2)\n' +
            '\n' +
            'def value(days_left):\n' +
            '    return call_value(100, 100, days_left / 365, 0.05, 0.25)\n' +
            '\n' +
            'early = value(90) - value(83)\n' +
            'late = value(8) - value(1)\n' +
            'print("the costlier week:", "the last one" if late > early else "the first one")\n' +
            'print("more than twice as costly:", late > 2 * early)\n',
          choices: [
            'the costlier week: the last one\nmore than twice as costly: True',
            'the costlier week: the last one\nmore than twice as costly: False',
            'the costlier week: the first one\nmore than twice as costly: True',
            'the costlier week: the first one\nmore than twice as costly: False',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'The other side of the trade',
          body: 'Whoever sold the option is on the other side of time decay. Every quiet day is a small gain for them, and the quietest days of all are the last few. That is why some traders sell options and hope for nothing to happen — and why, when something does, the losses arrive fast.',
        },
        {
          kind: 'checkpoint',
          prompt: 'A friend bought a call a month ago. The spot is exactly where it was and the news has been dull, yet the option is worth noticeably less. They say "the pricing must be wrong — nothing happened". What has happened?',
          answer:
            'Time happened. A month of the option\'s life is gone, and with it a month of chances for the spot to finish above the strike. That chance was most of what they paid for, since the spot was not above the strike to begin with. This is time decay, and it gets faster from here: the last week before expiry can take more than the first month did. The only ways to get that value back are for the spot to rise or for the market to start expecting bigger moves — a higher implied volatility — and neither of those is "nothing happening".',
        },
      ],
    },
  ],
};

export default lesson;
