// Futures and swaps: the two ways a producer sells forward, and why a cargo programme wants the second.
//
// Written for someone joining a pricing project who has to follow the conversation and sound credible,
// not write the code. The only Python is the engine behind one interactive card, kept out of sight by
// `hideProgram` — every number on it was still produced by the verifier running that program.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'futures-and-swaps',
  title: 'Futures, swaps and who uses which',
  summary: 'Why a producer selling cargoes across a month hedges with a swap, and what selling forward still leaves on the table',
  track: 'markets',
  order: 3,
  minutes: 12,
  prereqs: ['the-screens-traders-read'],
  outcomes: [
    'Say what a future is: standardised, cleared, [[mark-to-market]] daily, and rarely delivered',
    'Explain why a month of cargoes is hedged with a monthly-average swap and not a single future',
    'Use "tenor" and "the strip" correctly, and say why selling into [[contango]] beats selling into [[backwardation]]',
    'Name the three things a hedge does not fix: volume, [[basis-risk]] and cash',
  ],
  sections: [
    {
      id: 'a-future',
      title: 'A future: one size, one date, one clearing house',
      blocks: [
        {
          kind: 'prose',
          body:
            'It is January. Your team wants to protect the price of the condensate the company will produce in June, and somebody says "just sell the June future". Here is exactly what that sentence buys.\n\n' +
            'An **ICE Brent future** is a promise, made on an exchange, to settle **1,000 barrels** of Brent at an agreed price on a date the exchange has already chosen. You do not negotiate the size, the date, the quality or the wording. That is the whole design: every lot is identical to every other lot, so anyone can trade with anyone without reading a contract first. Standardisation is what buys the liquidity — thousands of lots trade in seconds, at a price on a screen, with no relationship required.\n\n' +
            'Standardisation is also what makes it a blunt instrument, and the rest of this lesson is about that.',
        },
        {
          kind: 'prose',
          body:
            'You never actually face the person on the other side. The moment the trade is done the **clearing house** steps between you: you are short to the clearing house, they are long to the clearing house. That is what makes an anonymous market safe, and it has a price.\n\n' +
            'The clearing house holds **initial margin** against every lot, and then it settles your position in cash **every evening**. That daily settlement is [[mark-to-market]]. Sell 500 lots at $84.00, and if the exchange settles at $87.00 tomorrow, then 500 lots × 1,000 barrels × $3.00 = **$1.5 million** leaves your account tomorrow morning. Not in June. Tomorrow. The demand is a [[margin-call]], and there is nobody to argue with: the clearing house does not care that you own 500,000 barrels of condensate that have gone up by exactly the same amount, because those barrels will not pay you until they are lifted and invoiced.\n\n' +
            'A futures position is therefore two things at once — a price you have fixed, and a cash obligation that arrives daily on somebody else\'s timetable.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Almost nobody delivers',
          body:
            'ICE Brent settles in cash against an index. NYMEX WTI really is deliverable, at Cushing, Oklahoma — and the overwhelming majority of open lots are bought back long before they get near it. A future is a price instrument with a delivery mechanism bolted on the end, not a way of moving oil. The oil moves under a separate physical contract, with a ship, a terminal and a [[cargo]] that is nothing like a standard lot.',
        },
        {
          kind: 'quiz',
          prompt: 'You are short 500 lots of Brent against production you will not sell for five months. Overnight the market settles $3.00 higher. What happens next?',
          options: [
            { text: 'Nothing until the contract expires; the loss is only on paper', why: 'That is how a forward agreement between two companies might work, but not an exchange. The exchange settles the position in cash every evening, so there is no such thing as an unrealised loss on a futures leg.' },
            { text: '$1.5 million of variation margin is called tomorrow morning, while the production it hedges pays nothing for five months', why: '500 lots is 500,000 barrels, and $3.00 on 500,000 barrels is $1.5 million, due the next business day. The barrels have risen by the same $1.5 million and will not pay a cent until they are lifted and invoiced.', correct: true },
            { text: 'You are now obliged to deliver 500,000 barrels of Brent-quality crude', why: 'Being short a future obliges you to settle, not to load a ship. ICE Brent is cash settled against an index, and in any case a position is closed out before expiry unless you intended delivery from the start.' },
          ],
        },
      ],
    },
    {
      id: 'a-swap',
      title: 'A swap: the same exposure, against an average',
      blocks: [
        {
          kind: 'prose',
          body:
            'Now the awkward part, and it is the reason a producer\'s hedge book is not made of futures.\n\n' +
            'You do not sell one cargo on one day in March. Say the March programme is four condensate cargoes, and each one prices off **Dated Brent over a five-day window** around the day it actually loads. In January nobody can name those days: loading slips with weather, with a berth, with a compressor that comes back late from maintenance. What you can say with real confidence is that four windows scattered across March will land somewhere very close to **the March average**.\n\n' +
            'So your revenue is an average. It always was. A **swap** is the instrument shaped like that: a bilateral agreement — with a bank or through a broker, and increasingly cleared — where you receive a fixed number and pay the floating average of every daily assessment in the month. No lots, no delivery, no expiry date to hit. One cash settlement after the month is over, for whatever volume you agreed, against whatever index prices your barrels.',
        },
        {
          kind: 'prose',
          body:
            'Put numbers on it. In January you hedge 1,000,000 barrels of March production, and both instruments happen to be quoted at **$84.00**. March starts soft and rallies hard into month-end: the month **averages $88.00**, and the last trading day settles at **$93.00**.\n\n' +
            '**The future route.** You sold the contract that expires on the last business day of March, at $84.00. It settles that day at $93.00, so the short leg loses $9.00 a barrel — **$9 million**. Your cargoes priced across the month at $88.00, so the physical brings in $88.00. Realised: **$79.00 a barrel**.\n\n' +
            '**The swap route.** You sold a March Dated Brent monthly-average swap at $84.00. It settles against the arithmetic average of every daily Dated Brent assessment in March, which is $88.00, so you pay $4.00 a barrel — $4 million. The cargoes still fetch $88.00. Realised: **$84.00 a barrel**, exactly the number you sold.\n\n' +
            'Same market, same day of trade, same hedge price, five dollars a barrel apart. Nothing about that gap is a view on oil: it is entirely the difference between an instrument that settles on **one day** and revenue that is earned across **thirty-one of them**. That is the argument for swaps in one line — your physical revenue is an average, so the hedge has to be an average too.',
        },
        {
          kind: 'table',
          caption: 'The same economic exposure, built two ways.',
          head: ['', 'Brent future', 'Brent monthly-average swap'],
          rows: [
            ['Where it trades', 'on an exchange, anonymously', 'bilaterally with a bank or broker, often cleared'],
            ['Size', 'standard lots of 1,000 barrels', 'any volume you agree'],
            ['What settles it', 'one price on one expiry date', 'the average of every daily assessment in the month'],
            ['When cash moves', 'every evening, [[mark-to-market]]', 'once, after the month ends (margin if cleared)'],
            ['Delivery', 'possible, almost never taken', 'never — cash only'],
            ['**What it matches**', '**a single-date exposure**', '**a month of cargoes priced across the month**'],
          ],
        },
        {
          kind: 'match',
          ask: 'Match each thing to what it actually is.',
          pairs: [
            { left: 'One ICE Brent future', right: 'one price, on one date, in 1,000-barrel lots' },
            { left: 'A March monthly-average swap', right: 'the average of every daily assessment in March' },
            { left: 'Four cargoes lifted across March', right: 'four five-day windows nobody can name in January' },
            { left: 'A calendar-2027 strip', right: 'twelve monthly contracts quoted as a single line' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A colleague argues the desk should hedge the March programme with futures because they are cheaper to trade and far more liquid. What is the strongest answer?',
          options: [
            { text: 'They are wrong about the liquidity; swaps trade in far greater size', why: 'They are not wrong. Exchange futures are the most liquid instrument in the complex, and the swap market prices off them. Liquidity is simply not the question being decided here.' },
            { text: 'Both are true and both are beside the point: a future settles on one day and the cargoes price across the whole month, so it does not hedge what we are actually exposed to', why: 'The comparison is not cost against cost, it is fit against fit. Whatever you save on execution you can lose several dollars a barrel on the timing mismatch, and that mismatch is not a risk anyone chose to take.', correct: true },
            { text: 'Futures cannot be used by a producer at all, only by banks and funds', why: 'Producers use futures constantly — for a single dated exposure, for a quick delta hedge before a swap is papered, or as the liquid leg behind a swap the bank then offsets. The point is which exposure you are covering, not who is allowed to trade what.' },
          ],
        },
      ],
    },
    {
      id: 'the-strip',
      title: 'Tenor, the strip, and what is left over',
      blocks: [
        {
          kind: 'prose',
          body:
            '**Tenor** is just how far out you are hedging, and hedging a year does not mean one trade. It means the **strip**: twelve monthly contracts, January through December, each with its own price and its own settlement. A broker will quote the whole calendar year as a single number, but that number is only the average of the twelve, and it is the twelve that settle.\n\n' +
            'Which twelve prices you get is not up to you. You sell into the [[forward-curve]] as it stands on the morning you deal. Say [[spot]] is **$82.00**.\n\n' +
            '- In [[contango]], with each month 40 cents above the one before, the twelve run from $82.40 to $86.80 and average **$84.60**. Sell 12 million barrels across that strip and you lock $2.60 a barrel above spot: **$31 million**.\n' +
            '- In [[backwardation]], the same slope downwards, the strip averages **$79.40** — $2.60 a barrel *below* spot, $31 million the other way.\n\n' +
            'Same production, same decision, the same act of prudence: **$62 million apart**, and the only thing that changed was the shape of the curve on the day. That is why "when do we hedge" is a real commercial question and not a procedural one.\n\n' +
            'Be honest about why the curve has that shape, though. Contango is usually the market paying somebody to hold inventory — the [[carry]] — and it tends to appear precisely when the market is oversupplied and spot is weak. Selling into it locks a better price than today\'s spot. It is not free money, and it is not a forecast.',
        },
        {
          kind: 'quiz',
          prompt: 'You are asked to hedge next calendar year. The curve is backwardated by roughly 40 cents a month. What does that mean for the decision?',
          options: [
            { text: 'Nothing — the hedge policy is about volume, so the curve is irrelevant', why: 'The policy decides how much you sell. The curve decides what you get for it, and here every month you sell is below the price in front of it. Treating that as a detail is how a desk locks in a discount without anyone signing off on it.' },
            { text: 'Every month of the strip prices below today\'s spot, and the further out you sell the worse it gets, so hedging the back of the year has a visible cost', why: 'A downward curve means later delivery is cheaper, so a producer selling forward is accepting less than spot, by more the further out they go. That cost is real and it belongs in the conversation before anyone deals.', correct: true },
            { text: 'Backwardation means the market expects prices to fall, so you should hedge as much as possible', why: 'A curve is a price for each delivery month, not a forecast. Backwardation usually says the market is short *now* rather than that it expects a decline, and reading it as a prediction is the most common mistake made with this chart.' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'selling-forward',
            title: 'Two million barrels, one decision',
            intro: 'March production is 2,000,000 barrels of condensate, priced off the Dated Brent average. Drag **how much you sold forward** at $82.00, and drag **where March averaged out**. Watch what happens to the two lines, and to where they cross.',
            hideProgram: true,
            outputLabel: 'March, once the month is over',
            template:
              'barrels = 2000000\n'
              + 'swap_price = 82.00\n'
              + 'pct = ⟦hedge⟧ * 10\n'
              + 'move = ⟦move⟧ * 2\n'
              + 'hedged_bbl = barrels * pct // 100\n'
              + 'average = swap_price + move\n'
              + 'plain = barrels * average\n'
              + 'swap_cash = hedged_bbl * (swap_price - average)\n'
              + 'total = plain + swap_cash\n'
              + '\n'
              + 'def money(x):\n'
              + '    return ("-" if x < 0 else "") + "$" + format(abs(x) / 1000000, ",.2f") + "m"\n'
              + '\n'
              + 'if move > 0:\n'
              + '    verdict = "$" + format(move, ".2f") + " above the price you sold at"\n'
              + 'elif move < 0:\n'
              + '    verdict = "$" + format(-move, ".2f") + " below the price you sold at"\n'
              + 'else:\n'
              + '    verdict = "exactly the price you sold at"\n'
              + 'print("March programme:  " + format(barrels, ",") + " bbl, priced off the Dated Brent average")\n'
              + 'print("Sold forward:     " + str(pct) + "% (" + format(hedged_bbl, ",") + " bbl) at $" + format(swap_price, ".2f"))\n'
              + 'print("March averaged:   $" + format(average, ".2f") + ", " + verdict)\n'
              + 'print("")\n'
              + 'print(f"Cargo revenue      {money(plain):>10}")\n'
              + 'print(f"Swap settlement    {money(swap_cash):>10}")\n'
              + 'print(f"Revenue, hedged    {money(total):>10}")\n'
              + 'print(f"Revenue, unhedged  {money(plain):>10}")\n'
              + 'print("")\n'
              + 'if pct == 0:\n'
              + '    print("Nothing was sold forward, so the whole month rides on the average.")\n'
              + 'elif swap_cash > 0:\n'
              + '    print("The swap paid " + money(swap_cash) + ": the market fell and you had already sold.")\n'
              + 'elif swap_cash < 0:\n'
              + '    print("The swap cost " + money(-swap_cash) + ": the market rose and you had already sold.")\n'
              + 'else:\n'
              + '    print("The swap settled for nothing: March averaged where you sold it.")\n'
              + '\n'
              + 'unhedged_line = []\n'
              + 'hedged_line = []\n'
              + 'for step in range(-15, 16):\n'
              + '    m = step * 2\n'
              + '    unhedged_line.append([m, round(barrels * (swap_price + m) / 1000000, 2)])\n'
              + '    hedged_line.append([m, round((barrels * (swap_price + m) - hedged_bbl * m) / 1000000, 2)])\n'
              + 'here = [[move, round(plain / 1000000, 2)], [move, round(total / 1000000, 2)]]\n',
            knobs: [
              { id: 'hedge', kind: 'range', label: 'March production sold forward, out of every 10 barrels', min: 0, max: 10, start: 6 },
              { id: 'move', kind: 'range', label: 'where March averaged out, in $2 a barrel steps', min: -15, max: 15, start: 5 },
            ],
            probes: {
              'unhedged-line': 'unhedged_line',
              'hedged-line': 'hedged_line',
              here: 'here',
            },
            visual: {
              kind: 'plot',
              xLabel: 'where March averaged, $ a barrel against the $82.00 you sold at',
              yLabel: 'March revenue, $ million',
              caption: 'Two straight lines. The steep one is the market; the flatter one is the market after the hedge. They cross at the price you sold, which is the only place a hedge is free.',
              series: [
                { probe: 'unhedged-line', label: 'unhedged' },
                { probe: 'hedged-line', label: 'hedged' },
              ],
              marker: 'here',
            },
            notes: {
              '10-25': 'Everything sold forward, and the market rallied $20. Revenue is dead flat at $164 million — exactly what you signed up for — while the unhedged company beside you banked $204 million. Selling 100% of production is not caution; it is a firm decision to give away every dollar of upside, and it is the version that gets a hedging policy torn up after a strong year.',
              '0-5': 'Nothing hedged, and March averaged $20 below where you could have sold it. Revenue lands at $124 million against the $164 million on the budget, and there is no second leg to soften it. The flat line is the one you did not buy.',
              '6-15': 'Sixty per cent sold forward and March settles precisely where you sold it. The swap pays nothing, the two lines meet, and the hedge cost exactly zero. This is the single point on the whole chart where hedging and not hedging are the same trade — and nobody knows in January that they are standing on it.',
            },
            takeaway:
              'Drag the hedge slider and you are not changing your view on the price; you are choosing the slope of your revenue. At zero you own every dollar of the market in both directions. At ten you own none of it. Everything in between is a deliberate choice about how much of the year the company wants decided by something nobody can forecast.',
          },
        },
        {
          kind: 'prose',
          body:
            'That picture fixes a **price**. Three things it does not fix, and each of them has ended somebody\'s year.\n\n' +
            '**It does not fix volume.** You sell March forward in January against a production forecast. Then a compressor trips, a turnaround runs long, a cyclone shuts the port for nine days, and March comes in at 1.4 million barrels against the 1.6 million you already sold. Those extra 200,000 barrels are not a hedge any more — they are a short position in a rising market, put on by accident. That is why producers hedge a fraction of expected production rather than all of it, and why the hedge book is reconciled against the production forecast every single month.\n\n' +
            '**It fixes the benchmark\'s price, not yours.** What you sold is Dated Brent, or JKM. What you own is a particular grade, at a particular terminal, priced at the benchmark plus a [[differential]] — or LNG under a contract that slopes off Brent with a lag built into it. The benchmark is hedged. The gap between the benchmark and your barrel is not, and it moves on its own. That leftover is [[basis-risk]], and on a well-run desk it is the only risk anyone is actually being paid to understand.\n\n' +
            '**It costs cash, on a schedule that has nothing to do with the cargoes.** Futures settle every evening, and cleared swaps carry margin too. A $10 rally on 1.6 million hedged barrels is $16 million out the door within days, against cargoes that will not be invoiced for another two months. Being right and being funded are separate problems, and treasury only has an opinion about the second one.',
        },
        {
          kind: 'checkpoint',
          prompt: 'You are in a review meeting. Someone says: "We are sixty per cent hedged on the March programme through Dated Brent swaps, we sold the cal-27 strip into a flat curve, and the futures leg cost us $9 million of margin last week." Translate each clause, and say what the company is still exposed to.',
          answer:
            '**"Sixty per cent hedged on March through Dated Brent swaps."** The price is fixed on 60% of *expected* March volume, and fixed against the monthly average of Dated Brent — which is the right shape, because the cargoes themselves price in windows scattered across the month. The other 40% is deliberately open: production is a forecast, and selling forward volume that may not turn up converts a hedge into a naked short.\n\n' +
            '**"Sold the cal-27 strip into a flat curve."** Twelve monthly contracts for 2027, quoted as one line but settling month by month. A flat curve means no contango premium to harvest and no backwardation discount to swallow: they locked roughly today\'s price for the whole year, which is a neutral outcome rather than a good or a bad one.\n\n' +
            '**"The futures leg cost us $9 million of margin."** That is mark-to-market on an exchange position, not a loss. The market moved against the paper leg, so the cash has already gone; the physical barrels it protects have moved the same way in the company\'s favour and will not pay until they are lifted and invoiced. The number belongs in a funding conversation, not a performance one.\n\n' +
            '**Still exposed to three things.** Volume, because 60% of a forecast is still a forecast and an outage turns the hedge into an over-hedge. Basis, because Dated Brent is not the grade at the terminal and certainly is not an LNG contract sloped off Brent with a lag — that differential can move several dollars with the flat price perfectly hedged. And cash, because every further dollar the market rallies is more margin out the door before a single cargo has been paid for.',
        },
      ],
    },
  ],
};

export default lesson;
