// The storage trade: why a tank is a position.
//
// The exemplar for the rebuilt Markets track. Finance first: the reader is a trader with barrels and a
// tank, and every number on the page was still computed by the verifier — the model is the engine, not
// the subject, so `hideProgram` keeps the Python out of the reader's way.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'the-storage-trade',
  title: 'The storage trade',
  summary: 'Buy now, store, sell forward — the trade a tank exists to make, and the day it stops working',
  track: 'markets',
  order: 3,
  minutes: 11,
  outcomes: [
    'Work out whether a [[contango]] pays for the cost of carrying a barrel',
    'Say what a tank is worth without owning a single barrel',
    'Explain why a storage trade is locked in on day one, not hoped for',
    'Recognise the market shape that empties tanks instead of filling them',
  ],
  sections: [
    {
      id: 'the-trade',
      title: 'The oldest trade in the business',
      blocks: [
        {
          kind: 'prose',
          body:
            'You lease a tank at Rotterdam. Crude for delivery now costs **$80 a barrel**. On the screen beside it, the contract for delivery in six months is quoted at **$84**.\n\n' +
            'So: buy a barrel today at 80, put it in your tank, and *at the same moment* sell the six-month contract at 84. Six months later you deliver the barrel you have been sitting on and collect 84. The $4 is yours the day you put the trade on — not a forecast, a spread you locked.\n\n' +
            'Except the barrel does not sit there for free. Somebody wants rent for the tank, the insurer wants a premium, and the $80 you spent is money you borrowed or money you are not earning interest on. Those three together are the **[[carry]]**. The trade works only when the contango is wider than the carry.',
        },
        {
          kind: 'table',
          caption: 'The same trade, six months, one barrel.',
          head: ['', 'Per barrel'],
          rows: [
            ['Sell the six-month contract', '+$84.00'],
            ['Buy the barrel today', '−$80.00'],
            ['Tank rent, six months', '−$1.80'],
            ['Interest on $80 at 5%', '−$2.00'],
            ['Insurance and losses', '−$0.30'],
            ['**Locked-in margin**', '**−$0.10**'],
          ],
        },
        {
          kind: 'prose',
          body:
            'A $4 contango and the trade still loses a dime. That is the whole discipline of storage: the spread is not the profit, the spread *minus* the carry is the profit, and at 5% interest a six-month carry on an $80 barrel is most of $4 before the tank charges you anything.',
        },
        {
          kind: 'quiz',
          prompt: 'Rates fall and financing that barrel now costs $0.80 instead of $2.00. Nothing else changes. What happens to the storage trade?',
          options: [
            { text: 'Nothing — the oil price has not moved', why: 'The oil price is not what makes this trade. The gap between the two dates, against the cost of holding, is.' },
            { text: 'It now makes about $1.10 a barrel', why: 'Carry drops by $1.20, so a trade losing $0.10 makes about $1.10. Cheap money fills tanks.', correct: true },
            { text: 'It loses more, because low rates mean a weak economy', why: 'Whatever rates say about the economy, the arithmetic here is direct: financing is a cost of the trade, and a smaller cost means a bigger margin.' },
          ],
        },
      ],
    },
    {
      id: 'when-it-pays',
      title: 'Where the trade lives and dies',
      blocks: [
        {
          kind: 'prose',
          body:
            'Two numbers decide everything: how steep the [[forward-curve]] is, and what it costs you to carry. Move them and watch the margin cross zero.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'storage-margin',
            title: 'Does the barrel go in the tank?',
            intro: 'Drag the **six-month contango** and the **all-in carry**. The line is your margin per barrel across the six months; above zero the tank fills, below it the tank empties.',
            hideProgram: true,
            outputLabel: 'The trade, month by month',
            template:
              'spot = 80.0\n' +
              'contango = ⟦contango⟧\n' +
              'carry_pa = ⟦carry⟧\n' +
              'forward = spot + contango\n' +
              'cost = spot * (carry_pa / 100) * 0.5\n' +
              'print("Buy now           ", round(spot, 2))\n' +
              'print("Sell in 6 months  ", round(forward, 2))\n' +
              'print("Cost to carry     ", round(cost, 2))\n' +
              'print("Margin per barrel ", round(contango - cost, 2))\n' +
              'print("On 500,000 barrels", round((contango - cost) * 500000))\n',
            knobs: [
              { id: 'contango', kind: 'range', label: 'six-month contango, $', min: 0, max: 12, start: 6 },
              { id: 'carry', kind: 'range', label: 'all-in carry, % a year', min: 2, max: 13, start: 10 },
            ],
            probes: {
              margin:
                '[[m, round(⟦contango⟧ * (m / 6) - 80.0 * (⟦carry⟧ / 100) * (m / 12), 2)] for m in range(0, 7)]',
              flat: '[[m, 0] for m in range(0, 7)]',
              end: '[[6, round(⟦contango⟧ - 80.0 * (⟦carry⟧ / 100) * 0.5, 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'months in the tank',
              yLabel: 'margin per barrel, $',
              caption: 'What the barrel has earned you at each month, after paying to hold it. The dot is where you deliver.',
              series: [
                { probe: 'margin', label: 'margin after carry' },
                { probe: 'flat', label: 'break-even' },
              ],
              marker: 'end',
            },
            notes: {
              '6-8': 'A $6 contango against a 10% all-in carry: $2 a barrel, a million dollars on a 500,000-barrel tank, and every cent of it locked on day one. Pull the contango down to $4 and watch it go.',
              '4-8': 'A $4 contango against a 10% all-in carry — rent, insurance and interest together, which is the trade in the table above. The line finishes on zero. This is the market most of the time — the curve pays almost exactly what holding costs, and it is nobody\'s free money.',
              '8-0': 'An $8 contango with cheap money: this is 2020, when the curve went so steep that traders chartered tankers as floating tanks because the shore tanks were full.',
              '0-11': 'A flat curve and expensive money: every month in the tank costs you. Stock gets sold down, and the people who must hold it — refineries, governments — are the only ones holding.',
            },
            takeaway:
              'The curve pays you for time; the carry charges you for it. Storage is the business of being right about the gap between those two, and the gap is usually thin — which is why the traders who make money at it own the cheapest tank, not the best forecast.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'The curve is in steep [[backwardation]]: six-month oil is $6 *below* spot. What does a storage trader do?',
          options: [
            { text: 'Fill the tank — cheap forward oil is a bargain', why: 'Backwardation means the forward price is lower, so storing means buying dear today to sell cheap later, and paying carry for the privilege.' },
            { text: 'Empty the tank and sell the barrels now', why: 'The market is paying a premium for oil today and charging you to hold it. Backwardation is the shape that drains storage.', correct: true },
            { text: 'Hold and wait for the curve to flip', why: 'That is a forecast, not a trade. It also bleeds carry every month you wait, which is exactly what the shape is telling you not to do.' },
          ],
        },
      ],
    },
    {
      id: 'the-asset',
      title: 'Why the tank is the position',
      blocks: [
        {
          kind: 'prose',
          body:
            'Notice what you never had to predict. You did not need a view on the oil price. You bought and sold at the same instant and locked a spread; whether crude goes to $40 or $140, your $4 minus carry is unchanged. The risk you carry is not price — it is that your tank sits empty because the curve never pays enough to fill it.\n\n' +
            'That is what people mean by **asset-backed** trading. The tank is not overhead, it is the position. A trader with a tank holds something a trader with only a screen does not: the *right, but not the obligation,* to convert a contango into cash. When the curve is flat the right is worth little. When the curve goes to $8 the same tank is worth a fortune, and nothing about the tank changed.',
        },
        {
          kind: 'prose',
          body:
            'It is why storage is leased on multi-year contracts by people who cannot know what the curve will do, and why a tank in the wrong place is worth so much less than the same steel in the right one. Rotterdam, Cushing and Singapore are not merely locations; they are the points where a curve can actually be delivered into.',
        },
        {
          kind: 'match',
          ask: 'Match each market to what it does to storage.',
          pairs: [
            { left: 'Steep contango, cheap financing', right: 'tanks fill, and ships get hired as tanks too' },
            { left: 'Flat curve, expensive financing', right: 'stock is sold down to the minimum' },
            { left: 'Steep backwardation', right: 'the market pays you to hold nothing' },
            { left: 'Contango exactly equal to carry', right: 'the tank earns its rent and not a cent more' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Your tank is full at a locked margin of $1.20 a barrel. Two months in, crude collapses from $80 to $45. Your boss asks what the position lost. What do you tell her, and what has actually changed?',
          answer:
            'The storage trade lost nothing: the barrel was bought and the forward sold on the same day, so a $35 fall shows up as a loss on the barrels and an identical gain on the short forward. The $1.20 is still $1.20. Two real things did change. First, cash — the exchange marks the short forward daily and pays you, while the barrels in the tank pay nothing until delivery, so the hedge that protects your margin also produces cash swings you must fund. Second, the *next* trade: at $45 a barrel the financing cost of storage is nearly halved, so the same contango in dollars is now a far better trade than the one you have on. The position is fine. The opportunity got better, and you have no empty tank to put it in.',
        },
      ],
    },
  ],
};

export default lesson;
