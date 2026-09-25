// The forward curve: a futures price as spot plus the cost of carry, drawn across every delivery date.
//
// Every price in this lesson is worked out by Python from a spot price and a carry, and every curve is a
// plot of pairs Python produced. Nothing here is typed in as fact.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'the-forward-curve',
  title: 'The forward curve',
  summary: 'A futures price is spot plus the cost of carry; drawn across delivery dates it becomes a curve whose slope says whether the market wants the thing now',
  track: 'markets',
  order: 3,
  minutes: 10,
  prereqs: ['a-price-series'],
  outcomes: [
    'Work out a fair futures price from the [[spot]] price and the [[carry]], compounded to the delivery date',
    'Draw the [[forward-curve]] across delivery dates and say whether it is in [[contango]] or [[backwardation]]',
    'Read the sign of the carry off the shape of the curve',
    'Say what a falling curve tells you about how badly the market wants the thing now',
  ],
  sections: [
    {
      id: 'spot-plus-carry',
      title: 'Spot plus carry',
      blocks: [
        {
          kind: 'prose',
          body:
            'The [[spot]] price is what a tonne of wheat costs today, for delivery today. A **futures** price is what you agree today to pay for that tonne on a later date. Why would the two differ? Because somebody has to hold the wheat until then, and holding it is not free.\n\n' +
            'Three things go into the bill. **Interest**: the money spent on the wheat could have been earning interest instead. **Storage**: the silo, the insurance, the wastage. And, against those two, anything the thing *pays you* while you hold it — a share pays dividends, and a commodity that is short on the ground pays a kind of income too, by being there the day a mill needs it. Interest plus storage minus that income is the [[carry]], and a fair futures price is spot plus the carry to the delivery date.',
        },
        {
          kind: 'code',
          code:
            'spot = 300.0      # wheat, per tonne, for delivery today\n' +
            'rate = 0.04       # interest on the money tied up, per year\n' +
            'storage = 0.03    # the silo and the insurance, per year\n' +
            'income = 0.0      # what holding wheat pays you: nothing\n' +
            'carry = rate + storage - income\n' +
            '\n' +
            'for months in [0, 6, 12, 24]:\n' +
            '    years = months / 12\n' +
            '    fair = spot * (1 + carry) ** years\n' +
            '    print(months, "months:", round(fair, 2))\n',
        },
        {
          kind: 'prose',
          body:
            'The carry is a rate, not a lump sum, so it is charged for every year the wheat is held — and the second year\'s carry is charged on the first year\'s price, not on the original spot. That is what the `** years` is doing. Two years of carry is *not* simply twice one year of it:',
        },
        {
          kind: 'shell',
          lines: [
            'carry = 0.07',
            'round(300 * (1 + carry) ** 2, 2)',
            'round(300 * (1 + 2 * carry), 2)',
          ],
          caption: 'The first line compounds the carry over two years; the second just doubles it. Every curve in this lesson uses the first.',
        },
        {
          kind: 'quiz',
          prompt: 'Interest is 4% a year and storage is 3% a year. Holding the thing pays you 2% a year. What is the carry?',
          options: [
            { text: '9%', why: 'That adds the income on. Income is money coming *back* to you, so it comes off the bill, not onto it.' },
            { text: '5%', why: 'Interest plus storage minus income: 4 + 3 − 2. Positive, so later delivery costs more than spot.', correct: true },
            { text: '−1%', why: 'Interest and storage both cost you; only the income is taken off. Carry goes negative only when the income beats the two costs put together.' },
          ],
        },
      ],
    },
    {
      id: 'reading-the-curve',
      title: 'Reading the curve',
      blocks: [
        {
          kind: 'prose',
          body:
            'Work out the fair price for every delivery date and draw them as a line, and you have the [[forward-curve]]. Its shape is the whole story. A curve that rises — later is dearer — is in [[contango]]. A curve that falls — later is cheaper — is in [[backwardation]].\n\n' +
            'Drag the two sliders. The interest rate can only add to the carry. The storage slider goes below zero, which means the thing pays you more to hold it than the silo costs. Watch which way the curve tilts, and find the setting where it goes flat.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'forward-curve-carry',
            title: 'One spot price, every delivery date',
            intro: 'Drag the **interest rate** and the **storage** slider. Storage below zero means the thing pays you more to hold it than storing it costs. The flat line is spot; the dot is the one-year price.',
            template:
              'spot = 100\n' +
              'rate = ⟦rate⟧ / 100      # interest on the money tied up, per year\n' +
              'storage = ⟦storage⟧ / 100   # storage, minus anything it pays you\n' +
              'carry = rate + storage\n' +
              'for months in [0, 6, 12, 18, 24]:\n' +
              '    price = spot * (1 + carry) ** (months / 12)\n' +
              '    print(months, "months:", round(price, 2))\n' +
              'if carry > 0:\n' +
              '    print("contango: later is dearer")\n' +
              'elif carry < 0:\n' +
              '    print("backwardation: later is cheaper")\n' +
              'else:\n' +
              '    print("flat: the carry is zero")\n',
            knobs: [
              { id: 'rate', kind: 'range', label: 'interest rate, % a year', min: 0, max: 10, start: 5 },
              { id: 'storage', kind: 'range', label: 'storage minus income, % a year', min: -5, max: 8, start: 2 },
            ],
            probes: {
              curve: '[[m, round(spot * (1 + carry) ** (m / 12), 2)] for m in range(0, 25)]',
              today: '[[m, spot] for m in range(0, 25)]',
              year: '[[12, round(spot * (1 + carry), 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'months to delivery',
              yLabel: 'price',
              caption: 'The fair price for every delivery date, against spot. The dot is the one-year price.',
              series: [
                { probe: 'curve', label: 'futures price' },
                { probe: 'today', label: 'spot today' },
              ],
              marker: 'year',
            },
            notes: {
              '5-0': 'Interest of 5%, and a thing that pays you 5% more than it costs to store: the two cancel, the carry is zero, and every delivery date costs exactly what spot does.',
              '0-0': 'No interest to pay, and the thing pays you to hold it: the carry is all income, so the curve falls from the very first month. Backwardation with nothing pushing back.',
              '10-13': 'Dear money and a dear silo, with nothing paid back: the carry is as big as the sliders allow, and delivery two years out is priced well above today.',
            },
            takeaway:
              'The shape of the curve is the sign of the carry. Interest and storage are costs, so on their own they push every later price above spot: contango. Income is money coming back, and once it outweighs interest plus storage the carry turns negative and the curve falls: backwardation. Same spot, same formula — only the sign changed. When the two sliders cancel exactly, the curve goes flat.',
          },
        },
        {
          kind: 'predict',
          ask: 'Oil prices for delivery in 0, 6, 12 and 18 months. Predict what this prints.',
          code:
            'curve = [80.0, 78.5, 77.2, 76.0]\n' +
            'for near, far in zip(curve, curve[1:]):\n' +
            '    print(round(far - near, 1))\n' +
            'print("backwardation" if curve[-1] < curve[0] else "contango")\n',
        },
        {
          kind: 'prose',
          body:
            'The sign of every step is the sign of the carry. A curve you are handed does not come with its carry printed on it, but it does not need to: if the price keeps falling as delivery moves further out, the market is charging *less* to wait, and only a negative carry does that.',
        },
      ],
    },
    {
      id: 'does-it-want-the-thing-now',
      title: 'Does it want the thing now?',
      blocks: [
        {
          kind: 'prose',
          body:
            'Turn the formula round. Given spot and one futures price, you can back out the carry the market is charging — and that number says how the market feels about holding the thing.\n\n' +
            '- **Contango.** Carry is positive: interest and storage are the whole story. There is plenty of wheat about, nobody is paying extra to have it today, and the curve simply pays whoever stores it.\n' +
            '- **Backwardation.** Carry is negative: having oil in the tank *now* is worth more than interest and storage cost. Refineries are paying a premium for delivery today over delivery next year. That is scarcity, and the curve is how the market says so.',
        },
        {
          kind: 'code',
          code:
            'def implied_carry(spot, futures, months):\n' +
            '    """The yearly carry that turns spot into this futures price."""\n' +
            '    return (futures / spot) ** (12 / months) - 1\n' +
            '\n' +
            'for name, spot, one_year in [("wheat", 300.0, 321.0), ("oil", 80.0, 74.0)]:\n' +
            '    carry = implied_carry(spot, one_year, 12)\n' +
            '    shape = "contango" if carry > 0 else "backwardation"\n' +
            '    print(name, shape, round(carry * 100, 1), "% a year")\n',
          caption: 'Two one-year prices, and the carry each one implies. The sign is the shape; the size is how strongly the market feels.',
        },
        {
          kind: 'quiz',
          prompt: 'Oil for delivery next month trades at 90; oil for delivery in a year trades at 78. What is the curve telling you?',
          options: [
            { text: 'The market expects oil to be 78 in a year', why: 'A futures price is spot plus carry, not a forecast. Oil may well fall, but the curve is a statement about what it costs to wait, today.' },
            { text: 'Backwardation: oil in hand today is worth more than the interest and storage it costs, so oil is scarce now', why: 'Later is cheaper, so the carry is negative, and only a scarce thing pays you enough to hold it to beat interest and storage.', correct: true },
            { text: 'Contango: it costs 12 to store a barrel for a year', why: 'Contango is a *rising* curve. This one falls, and a storage cost can only push a curve up.' },
          ],
        },
        {
          kind: 'match',
          ask: 'Match each description to the word for it.',
          pairs: [
            { left: 'The price for delivery right now', right: 'spot' },
            { left: 'Interest plus storage, minus anything it pays you', right: 'carry' },
            { left: 'A curve that rises: later is dearer', right: 'contango, nothing is scarce today' },
            { left: 'A curve that falls: later is cheaper', right: 'backwardation, the market wants it now' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A trader says: "oil is in backwardation, so the market is expecting the price to fall." What has the trader mixed up?',
          answer:
            'They have read the curve as a forecast. It is not one: each point on it is the spot price plus the carry to that date. Backwardation says the carry is *negative today* — having oil in hand is worth more than the interest and storage it costs, because the thing is scarce right now. The price may fall as the shortage eases, and it may not; what the curve states for certain is that people will pay more for delivery now than for delivery later. Contango says the opposite: nobody is short, and the curve is just paying the storer.',
        },
      ],
    },
  ],
};

export default lesson;
