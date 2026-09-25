// Futures in practice: what holding a future asks of you between the day you agree and the day you deliver.
//
// A farmer sells wheat futures in April for a September harvest. Every number a reader sees about her
// margin account comes from Python running a fixed list of daily prices; the prose only says why.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'futures-in-practice',
  title: 'Futures in practice',
  summary: 'What a future asks of you day by day: a deposit, cash settled every evening, a call when it runs low, and a gap that closes at delivery',
  track: 'markets',
  order: 4,
  minutes: 10,
  prereqs: ['the-forward-curve'],
  outcomes: [
    'Say why selling a future costs [[margin]], not the price of what you agreed to sell',
    'Work out what [[mark-to-market]] moves into or out of a margin account each day',
    'Find the day a margin call lands on a price path, and say what it does and does not mean',
    'Explain why the [[basis]] shrinks to zero at delivery, and what rolling a contract is',
  ],
  sections: [
    {
      id: 'an-agreement-not-a-purchase',
      title: 'An agreement, not a purchase',
      blocks: [
        {
          kind: 'prose',
          body:
            'In April a farmer has wheat in the ground that she will harvest in September. The September wheat future is trading at 300 a tonne, and she would be happy to get 300. So she **sells** September futures: an agreement to deliver wheat in September at 300.\n\n' +
            'Nothing is bought or sold today. No wheat moves and no 300 changes hands — all of that happens at delivery. What she hands over today is [[margin]]: a deposit held by the exchange, sized so that if the price moves against her, the loss can be taken out of it. Each contract covers 50 tonnes, and the exchange asks for a deposit of 1500 per contract.',
        },
        {
          kind: 'code',
          code:
            'price = 300                 # September futures price, per tonne\n' +
            'tonnes = 50                 # one contract\n' +
            'contracts = 4\n' +
            'deposit_per_contract = 1500\n' +
            '\n' +
            'agreed_value = price * tonnes * contracts\n' +
            'deposit = deposit_per_contract * contracts\n' +
            'print("value of the wheat she agreed to deliver:", agreed_value)\n' +
            'print("deposit she actually posts:", deposit)\n' +
            'print("deposit as a share of that value:", round(deposit / agreed_value * 100, 1), "%")\n',
        },
        {
          kind: 'prose',
          body:
            'The gap between those two numbers is the whole character of a future. She has fixed the price on a large amount of wheat with a small deposit, and the deposit is all the exchange can reach. Every one-unit move in the price is worth 50 per contract to her, up or down — and, as the next section shows, the exchange does not wait until September to collect.',
        },
        {
          kind: 'quiz',
          prompt: 'The farmer sells four September futures at 300. What leaves her bank account today?',
          options: [
            { text: 'The full value of the wheat she has agreed to deliver', why: 'Nothing is bought today. The wheat and the money for it change hands at delivery in September; a future is the agreement, not the sale.' },
            { text: 'The margin deposit, a fraction of that value', why: 'The exchange holds a deposit per contract so that a loss can be taken from it. That is all she pays to enter the agreement.', correct: true },
            { text: 'Nothing: agreeing a price costs nothing', why: 'The agreement itself is free, but the exchange will not hold it without something to draw losses from. That deposit is the margin.' },
          ],
        },
      ],
    },
    {
      id: 'marked-every-day',
      title: 'Marked every day',
      blocks: [
        {
          kind: 'prose',
          body:
            'A bet on the wheat price would be settled once, in September. A future is settled every single day: that is [[mark-to-market]]. At the close, the exchange looks at where the September price finished, works out what the day\'s move is worth on her position, and moves that much cash into or out of her margin account.\n\n' +
            'The sign matters. She *sold* at 300. If the price rises, she has agreed to sell for less than wheat is now worth, so the rise is taken **out** of her account. If the price falls, it is paid **in**.',
        },
        {
          kind: 'predict',
          ask: 'Four contracts of 50 tonnes, so every one-unit move is worth 200. She sold, so a rise costs her. Predict what this prints.',
          code:
            'account = 6000\n' +
            'per_point = 200\n' +
            'prices = [300, 302, 299, 305]\n' +
            'for day in range(1, len(prices)):\n' +
            '    move = prices[day] - prices[day - 1]\n' +
            '    account -= move * per_point\n' +
            '    print("day", day, "price", prices[day], "account", account)\n',
        },
        {
          kind: 'prose',
          body:
            'The exchange also sets a **maintenance level** below the initial deposit. If a day\'s settlement takes the account under it, she gets a **margin call**: top the account back up to the initial deposit by the next morning, or the exchange closes the position for her.\n\n' +
            'Below, the price climbs through the summer and then falls back before harvest. Slide the maintenance level and watch which day the call lands on; slide the number of contracts and watch what changes and what does not.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'margin-account',
            title: 'A margin account through the summer',
            intro: 'Each close moves cash in or out. A dot marks a day the account finished under the maintenance line: that is a margin call, and the account is topped back up to the initial deposit before the next day starts.',
            template:
              'contracts = ⟦contracts⟧\n' +
              'per_point = 50 * contracts               # 50 tonnes a contract\n' +
              'initial = 1500 * contracts               # the deposit the exchange asks for\n' +
              'maintenance = initial * ⟦maintenance⟧ // 100\n' +
              'prices = [300, 303, 306, 304, 310, 313, 309, 305, 300, 296]\n' +
              'account = initial\n' +
              'closes = [account]\n' +
              'calls = []\n' +
              'for day in range(1, len(prices)):\n' +
              '    account -= (prices[day] - prices[day - 1]) * per_point   # she sold: a rise costs her\n' +
              '    closes.append(account)\n' +
              '    if account < maintenance:\n' +
              '        calls.append(day)\n' +
              '        print("day", day, "price", prices[day], "account", account, "MARGIN CALL: top up", initial - account)\n' +
              '        account = initial\n' +
              '    else:\n' +
              '        print("day", day, "price", prices[day], "account", account)\n' +
              'print("margin calls on days:", calls)\n',
            knobs: [
              { id: 'contracts', kind: 'range', label: 'contracts sold', min: 1, max: 10, start: 4 },
              { id: 'maintenance', kind: 'range', label: 'maintenance level, as % of the deposit', min: 55, max: 90, start: 75 },
            ],
            probes: {
              closes: '[[d, c] for d, c in enumerate(closes)]',
              floor: '[[d, maintenance] for d in range(len(closes))]',
              calls: '[[d, closes[d]] for d in calls]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'day',
              yLabel: 'margin account',
              caption: 'The account at each close, before any top-up, against the maintenance line. A dot is a margin call.',
              series: [
                { probe: 'closes', label: 'account at the close' },
                { probe: 'floor', label: 'maintenance level' },
              ],
              marker: 'calls',
            },
            notes: {
              '0-0': 'At the lowest maintenance level the line sits far under the deposit, and even the deepest dip of this summer stays above it: the account is never topped up.',
              '9-35': 'Ten contracts at the highest maintenance level. The calls land on the same days as with one contract, because the deposit, the daily moves and the line all scale together — only the money in each top-up is ten times larger.',
            },
            takeaway:
              'When a call comes is decided by the price path and the maintenance level; the number of contracts only scales the money. And notice what the account is *not* telling you: every unit that leaves it is a unit more her wheat in the ground is worth. The hedge is doing exactly what it was for — the danger is that the top-ups have to be found in cash, months before the wheat is sold.',
          },
        },
      ],
    },
    {
      id: 'delivery-and-the-roll',
      title: 'Delivery and the roll',
      blocks: [
        {
          kind: 'prose',
          body:
            'Why does the hedge work at all, when the September price and the price of wheat in a barn today are different numbers? The gap between them is the [[basis]]: the spot price minus the futures price. In spring it is the carry from the last lesson — storing wheat until September costs something, so the future sits above spot. But on delivery day a September future *is* wheat in September, so the two prices have to meet.\n\n' +
            'Watch the basis close as the months go by, and what that does to the price she ends up with.',
        },
        {
          kind: 'code',
          code:
            'locked = 300                    # the September price she sold at in April\n' +
            'months  = ["May", "Jun", "Jul", "Aug", "Sep"]\n' +
            'spot    = [280, 286, 297, 291, 284]\n' +
            'futures = [301, 304, 306, 294, 284]\n' +
            'for month, s, f in zip(months, spot, futures):\n' +
            '    print(month, "spot", s, "futures", f, "basis", s - f)\n' +
            '\n' +
            '# September: she sells the wheat at spot and buys back the future to close it\n' +
            'wheat_sale = spot[-1]\n' +
            'futures_gain = locked - futures[-1]\n' +
            'print("wheat sold at", wheat_sale, "plus futures gain", futures_gain, "gives", wheat_sale + futures_gain)\n',
          caption: 'Spot and the September future month by month, and what the wheat sale and the closed future add up to at harvest.',
        },
        {
          kind: 'predict',
          ask: 'Now suppose she wants to hold her grain until December instead. September is about to expire, so she **rolls**: buys back the September future to close it, and sells a December one. The gap between the two contracts is the carry from September to December. Predict what this prints.',
          code:
            'sold_sep_at = 300\n' +
            'sep_now = 284\n' +
            'dec_now = 290\n' +
            'gain_on_sep = sold_sep_at - sep_now\n' +
            'print("September closed for a gain of", gain_on_sep)\n' +
            'print("December sold at", dec_now)\n' +
            'print("price locked for December wheat:", dec_now + gain_on_sep)\n',
        },
        {
          kind: 'match',
          ask: 'Match each word to what it means for the farmer.',
          pairs: [
            { left: 'Margin', right: 'a deposit the exchange can take losses from' },
            { left: 'Mark to market', right: 'each day\'s move settled in cash that evening' },
            { left: 'Margin call', right: 'top the account back up, or be closed out' },
            { left: 'Basis', right: 'spot minus futures, and zero on delivery day' },
            { left: 'Rolling', right: 'close the expiring contract and open the next one' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Between April and harvest the wheat price climbs steadily. The farmer\'s neighbour says: "Those futures were a disaster — your margin account has been bleeding cash all summer." What has the neighbour missed, and what has he got right?',
          answer:
            'He has missed the other half of the position. Every unit the price rose took cash out of the margin account, but it also made the wheat in the ground worth one unit more, and at delivery the basis is gone, so the wheat sale plus the futures loss comes to the price she locked in. She gave up the summer\'s rise to be sure of that price; that was the deal.\n\n' +
            'What he has right is the cash. The margin calls had to be met in money, month after month, long before the wheat was sold. A hedge that is right on paper can still fail if the account cannot be topped up, which is why a hedger keeps a cash buffer beside the margin.',
        },
      ],
    },
  ],
};

export default lesson;
