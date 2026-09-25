// Optionality at expiry: what an option is worth on its last day, drawn from the numbers.
//
// The exemplar for the Markets track. Every claim about a payoff is a line of Python that prints it, and
// every picture is a plot of pairs Python produced. Nothing here is typed in as fact.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'optionality-at-expiry',
  title: 'Optionality at expiry',
  summary: 'What a call and a put are worth on the day they expire, and why the shape is a hockey stick',
  track: 'markets',
  order: 5,
  minutes: 10,
  outcomes: [
    'Work out what a call or a put pays at expiry from the spot price and the [[strike]]',
    'Say why a bought option can never lose more than its [[premium]]',
    'Read a payoff diagram and find the break-even on it',
    'Tell insurance from leverage by which option you would buy',
  ],
  sections: [
    {
      id: 'the-right-not-the-duty',
      title: 'A right, not a duty',
      blocks: [
        {
          kind: 'prose',
          body:
            'An option is a contract that gives you the **right** to buy or sell something at a fixed price, the [[strike]], on or before a date. A **call** is the right to buy; a **put** is the right to sell. The person who sold you that right took a fee for it up front, the [[premium]].\n\n' +
            'The word that matters is *right*. You are never made to use it. On the last day, you look at the market price — the **spot** — and decide: is my right worth anything?',
        },
        {
          kind: 'code',
          code:
            'def call_at_expiry(spot, strike):\n' +
            '    """What the right to BUY at strike is worth when the market is at spot."""\n' +
            '    return max(spot - strike, 0)\n' +
            '\n' +
            'def put_at_expiry(spot, strike):\n' +
            '    """What the right to SELL at strike is worth when the market is at spot."""\n' +
            '    return max(strike - spot, 0)\n' +
            '\n' +
            'for spot in [80, 100, 120]:\n' +
            '    print(spot, "call:", call_at_expiry(spot, 100), " put:", put_at_expiry(spot, 100))\n',
        },
        {
          kind: 'prose',
          body:
            'That `max(..., 0)` is the whole idea of optionality in one call. When the market is above the strike, the right to buy below it is worth the gap. When the market is below the strike, that right is worth nothing — so you let it lapse, and the most you have lost is the premium you paid.',
        },
        {
          kind: 'quiz',
          prompt: 'The market closes at 90 on expiry day. You hold a call with a strike of 100. What is it worth?',
          options: [
            { text: '10', why: 'That would be a put — the right to sell at 100 when the market is 90 — not a call.' },
            { text: '0', why: 'The right to buy at 100 is worth nothing when you could buy at 90 instead. You let it lapse.', correct: true },
            { text: '−10', why: 'An option you bought can never be worth less than zero: it is a right, and you simply do not use it.' },
          ],
        },
      ],
    },
    {
      id: 'the-hockey-stick',
      title: 'The hockey stick',
      blocks: [
        {
          kind: 'prose',
          body:
            'Plot the value against every possible spot price and you get the shape every trader recognises: flat, then a straight line up. Drag the strike and the premium and watch where the shape bends, and where it crosses zero once the premium is counted.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'call-payoff',
            title: 'A bought call, across every spot price',
            intro: 'Drag the **strike** and the **premium**. The lower line is what you actually made after paying for the option; where it crosses zero is your break-even.',
            template:
              'strike = ⟦strike⟧\n' +
              'premium = ⟦premium⟧\n' +
              'for spot in [60, 80, 100, 120, 140]:\n' +
              '    payoff = max(spot - strike, 0)\n' +
              '    print(spot, "payoff", payoff, " net", payoff - premium)\n' +
              'print("break-even at", strike + premium)\n',
            knobs: [
              { id: 'strike', kind: 'range', label: 'strike', min: 85, max: 115, start: 100 },
              { id: 'premium', kind: 'range', label: 'premium', min: 0, max: 11, start: 5 },
            ],
            probes: {
              payoff: '[[s, max(s - ⟦strike⟧, 0)] for s in range(50, 151, 5)]',
              net: '[[s, max(s - ⟦strike⟧, 0) - ⟦premium⟧] for s in range(50, 151, 5)]',
              breakeven: '[[⟦strike⟧ + ⟦premium⟧, 0]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'spot price at expiry',
              yLabel: 'value',
              caption: 'The call\'s payoff, and the same payoff after the premium is paid. The dot is the break-even.',
              series: [
                { probe: 'payoff', label: 'payoff at expiry' },
                { probe: 'net', label: 'net of premium' },
              ],
              marker: 'breakeven',
            },
            notes: {
              '15-0': 'With no premium the two lines sit on top of each other: a free option is pure upside. Nobody sells one of those.',
              '0-11': 'A low strike with a high premium: the option is already worth something, and you paid for that. The break-even moves right by exactly the premium.',
            },
            takeaway:
              'The bend is always at the strike, and the break-even is always the strike plus the premium. Below the strike you lose the premium and no more — the flat part is the *insurance* in the contract. Above it, every dollar the market moves is a dollar to you — the sloped part is the *leverage*.',
          },
        },
        {
          kind: 'predict',
          ask: 'A put with a strike of 100 was bought for a premium of 8. Predict what this prints.',
          code:
            'strike = 100\n' +
            'premium = 8\n' +
            'for spot in [70, 100, 130]:\n' +
            '    payoff = max(strike - spot, 0)\n' +
            '    print(spot, payoff - premium)\n',
        },
        {
          kind: 'prose',
          body:
            'The put is the mirror image: it pays when the market falls. Its hockey stick slopes up to the *left*. That is why a put is the natural insurance for something you already own — if the price collapses, the put pays out the collapse.',
        },
      ],
    },
    {
      id: 'insurance-or-leverage',
      title: 'Insurance or leverage',
      blocks: [
        {
          kind: 'prose',
          body:
            'Two people buy the same call for the same premium, and mean completely different things by it.\n\n' +
            '- **Insurance.** A bakery must buy flour in three months and cannot afford a price spike. A call on flour caps the price they will pay: if flour soars, the call pays the difference; if it falls, they let the call lapse and buy cheap. The premium is the cost of sleeping at night.\n' +
            '- **Leverage.** A trader thinks the price will rise. Buying the flour itself would cost the full price; buying a call costs only the premium and wins almost as much if they are right. If they are wrong, they lose the premium — all of it.\n\n' +
            'Same contract, same payoff curve. The difference is what else the buyer holds.',
        },
        {
          kind: 'match',
          ask: 'Match each situation to the option that fits it.',
          pairs: [
            { left: 'You own shares and are worried about a fall', right: 'buy a put: it pays out the fall' },
            { left: 'You must buy fuel next quarter and fear a spike', right: 'buy a call: it caps the price you pay' },
            { left: 'You bought a call and the market fell', right: 'you lose the premium, and nothing more' },
            { left: 'You sold a call and the market soared', right: 'you owe every dollar above the strike' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A call costs 5 with a strike of 100. Someone says "the most I can make is 5 and the most I can lose is unlimited". What have they mixed up?',
          answer:
            'They have described the *seller* of the call, not the buyer. The buyer paid 5 and can lose at most 5 — the flat part of the hockey stick — while their upside is unlimited as the market rises. The seller received 5, keeps it if the option lapses, and is on the hook for every dollar above the strike. Optionality is always one-sided: the buyer holds the right, the seller holds the obligation, and the premium is what the buyer pays for that asymmetry.',
        },
      ],
    },
  ],
};

export default lesson;
