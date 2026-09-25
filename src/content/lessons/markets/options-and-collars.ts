// Options from a producer's seat, and the structure a producer actually signs: the zero-cost collar.
//
// Finance first. The reader is about to sit in a pricing meeting at an LNG producer, not write a pricing
// library, so there is no visible Python anywhere in this lesson. The one interactive card hides its
// program (`hideProgram`) and shows only the band — but every number and every point on that chart was
// still produced by the verifier running real Python, exactly like the rest of the library.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'options-and-collars',
  title: 'Options, and the collar a producer actually buys',
  summary: 'Why a producer buys puts, why it sells calls to pay for them, and what a zero-cost collar really gives you',
  track: 'markets',
  order: 4,
  minutes: 12,
  // The intended prerequisite is 'futures-and-swaps', which does not exist in the library yet; the
  // verifier rejects a prereq that is not a lesson id. 'hedging-the-physical' is the nearest thing
  // currently written (selling futures against a cargo). Switch this back the day that lesson lands.
  prereqs: ['futures-and-swaps'],
  outcomes: [
    'Say what a bought put does for a producer above and below the strike, and what the premium bought',
    'Explain why a producer sells a call to fund the put, and what a zero-cost collar costs',
    'Draw the collar payoff from memory: flat, sloped, flat — and say how it differs from a swap',
    'Use "implied vol" and "delta" in a sentence without reaching for a formula',
  ],
  sections: [
    {
      id: 'puts-and-calls',
      title: 'A floor you own, and a ceiling somebody else wants',
      blocks: [
        {
          kind: 'prose',
          body:
            'Brent is $80. Your company sells liquids and oil-linked LNG, so every barrel of the quarter — call it a million of them in the tranche treasury is looking at — is worth whatever the market says on the day it prices. Nobody in the building is short crude. That is the whole shape of the problem: a producer is **structurally long**, and has been since the day the project was sanctioned.\n\n' +
            'So the instrument that protects you is a **bought put**: the right, not the obligation, to sell at a fixed price. Buy the December $70 Brent put and it costs you a **premium** of $2.10 a barrel, paid up front — $2.1 million for the tranche, gone the moment the trade confirms.\n\n' +
            'What it bought: if Brent prices at $58, the put pays you the $12 difference, and combined with the $58 you got for the physical you have realised $70 — less the premium, so $67.90. That is your **floor**, and it holds all the way down to zero. If Brent prices at $103 the put is worthless and you throw it away, having sold your cargoes at $103 like everybody else. You are out $2.10 and you would do it again. That is insurance, and that is exactly how insurance is supposed to feel in a good year.',
        },
        {
          kind: 'prose',
          body:
            'A **bought call** is the mirror: the right to buy at a fixed price. Ask who wants that and the answer is never the producer. It is the **consumer** — a Japanese utility capping what it pays for a winter [[cargo]], an airline capping jet fuel, a smelter capping power — and it is the **speculator**, who wants exposure to a rally with a known maximum loss, because the most a buyer of an option can lose is the premium.\n\n' +
            'A producer who buys a call is not hedging. They already own the upside; buying more of it is a position, and it will be called one in the meeting. The asymmetry is worth holding on to: **buy** an option and your loss is capped at the premium while the payoff runs on. **Sell** one and you collect the premium up front and take on the obligation — and that obligation is margined, so it can generate a [[margin-call]] while a bought option never does.',
        },
        {
          kind: 'match',
          ask: 'Match each instrument to what it does for the person holding it.',
          pairs: [
            { left: 'Bought put', right: 'the right to sell at a fixed price: a producer\'s floor' },
            { left: 'Bought call', right: 'the right to buy at a fixed price: a consumer\'s cap' },
            { left: 'Sold call', right: 'premium received now, in exchange for giving up the upside' },
            { left: 'Swap', right: 'one fixed price, whatever the market does, in both directions' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'You hold the December $70 Brent put and paid $2.10 for it. Brent prices at $103. What happens?',
          options: [
            { text: 'You are obliged to sell your cargoes at $70', why: 'That is what a *sold* put would do. A bought put is a right; nobody can make you use it, and at $103 you would be mad to.' },
            { text: 'The put pays you $33 a barrel', why: 'A put pays when the market is *below* the strike. At $103 it is $33 out of the money and worth nothing.' },
            { text: 'The put expires worthless; you sold at $103 and are down the $2.10 premium', why: 'The floor was never reached, so the insurance never paid. You realised $103 minus the $2.10 you spent on protection you did not need.', correct: true },
          ],
        },
      ],
    },
    {
      id: 'why-a-collar',
      title: 'Nobody wants to pay for the put',
      blocks: [
        {
          kind: 'prose',
          body:
            'Here is what kills the clean answer. $2.10 a barrel on a million barrels is $2.1 million a quarter, $8.4 million a year — on **one** tranche of **one** exposure, before anybody has hedged the rest of the liquids or the gas. And in most quarters it expires worthless, because most quarters the market does not collapse. So the board sees a line item that has cost tens of millions over three years and paid out twice.\n\n' +
            'Every producer has had that conversation, and the answer the market settled on decades ago is not "stop hedging". It is: **make the upside pay for the downside.**',
        },
        {
          kind: 'prose',
          body:
            'You already own more upside than you can use. Above $92, nobody in treasury is lying awake. So sell it. Write the December **$92 call** and the market pays you about **$2.10** for it — near enough exactly what the $70 put costs.\n\n' +
            'Put the two together and you have a **collar**: long the $70 put, short the $92 call. Below $70 you are protected. Above $92 you have sold the upside away — if Brent prices at $118, the buyer of your call takes the $26 and you realise $92. In between, nothing happens and you sell at the market.\n\n' +
            'When the two premiums match and no cash changes hands, it is a **zero-cost collar** — you will also hear "costless collar", or a structurer simply saying "**seventy by ninety-two for zero**". This is the single most common hedging structure a producer signs, and the conversation is almost always shaped the same way: you name the floor you need, and the bank solves for the ceiling that pays for it. Ask for a higher floor and the ceiling comes down to fund it. It is one trade with one dial, and the dial is how much upside you are willing to sell.\n\n' +
            'Zero cost is not free. It cost you every dollar above $92, and there are quarters where that is the most expensive thing you did all year.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'the-collar-band',
            title: 'Move the floor, move the ceiling, watch the band',
            intro: 'Brent is $80 today. Drag the **floor** (the put you buy) and the **ceiling** (the call you sell) and watch what a barrel of your production actually realises. The straight line is what happens if you do nothing.',
            hideProgram: true,
            outputLabel: 'What a barrel realises, at three settlement prices',
            template:
              'floor = ⟦floor⟧\n'
              + 'ceiling = ⟦ceiling⟧\n'
              + 'swap = 80\n'
              + 'print("floor", floor, " ceiling", ceiling, " band", ceiling - floor, "wide")\n'
              + 'for market in (50, 80, 120):\n'
              + '    collar = min(max(market, floor), ceiling)\n'
              + '    print("Brent at", market, " unhedged", market, " collar", collar, " swap", swap)\n',
            knobs: [
              { id: 'floor', kind: 'range', label: 'floor: the put you buy, $', min: 64, max: 80, start: 70 },
              { id: 'ceiling', kind: 'range', label: 'ceiling: the call you sell, $', min: 80, max: 100, start: 92 },
            ],
            // Every line here is straight between its kinks, so the corners are the only points worth
            // recording: four for the collar, two for each straight line. The two straight ones never
            // move, so they are hoisted into the shared block and ship once instead of 357 times.
            probes: {
              collar: '[[40, floor], [floor, floor], [ceiling, ceiling], [120, ceiling]]',
              unhedged: '[[40, 40], [120, 120]]',
              swapline: '[[40, swap], [120, swap]]',
              strikes: '[[floor, floor], [ceiling, ceiling]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'where Brent settles, $ a barrel',
              yLabel: 'what you realise, $ a barrel',
              caption: 'The collar is flat, then sloped, then flat. The swap is flat everywhere. The dots are the two strikes.',
              series: [
                { probe: 'collar', label: 'collar' },
                { probe: 'unhedged', label: 'unhedged' },
                { probe: 'swapline', label: 'swap at $80' },
              ],
              marker: 'strikes',
            },
            notes: {
              '6-12': 'The trade in the story: a $70 floor funded by a $92 ceiling, for no cash. You have kept $22 of the band and sold the rest of the sky.',
              '16-0': 'Floor and ceiling both at $80, and the band has closed completely. Look at the chart: the collar line is now the swap line. A collar with no width *is* a swap — which is the neatest way to see that these are the same family of trade.',
              '0-20': 'A $64 floor and a $100 ceiling: a very wide band. Cheap in opportunity cost, and it tracks the unhedged line almost everywhere — which is another way of saying it barely hedges anything.',
              '14-4': 'A $78 floor and an $84 ceiling. Almost all the price risk is gone and so is almost all the upside. In the real market a floor this close to the money is expensive, so the ceiling would have to sit near here to pay for it.',
            },
            takeaway:
              'A collar is a band, not a price. Widen it and you keep upside and accept more downside; narrow it and you are heading towards a swap. The producer\'s question is never "should we hedge" — it is "how wide should the band be, and which end are we willing to sell".',
          },
        },
        {
          kind: 'quiz',
          prompt: 'The bank quotes you "$70 floor, we come out at $92, for zero". You say the $70 floor is too low — you need $75. What happens to the ceiling?',
          options: [
            { text: 'It comes down, below $92', why: 'A $75 put is more expensive than a $70 put, so you have to sell a more valuable call to pay for it — and a call is worth more the lower its strike. Higher floor, lower ceiling, narrower band.', correct: true },
            { text: 'It goes up, above $92', why: 'That would mean a better floor *and* more upside for the same zero cost. If that were available, everybody would take it and the quote would not survive the morning.' },
            { text: 'It stays at $92 and you pay the difference in cash', why: 'That is a legitimate structure and it is what a *financed* collar is. But the quote asked about is the zero-cost one, and there the ceiling has to move.' },
          ],
        },
      ],
    },
    {
      id: 'the-shape',
      title: 'The shape, and the two words in the room',
      blocks: [
        {
          kind: 'table',
          caption: 'One quarter, one barrel, four ways of having handled it. Brent was $80 when the trades were done.',
          head: ['Brent prices at', 'Unhedged', 'Swap at $80', 'Zero-cost collar $70/$92', 'Bought $70 put, $2.10 paid'],
          rows: [
            ['$50', '$50.00', '$80.00', '$70.00', '$67.90'],
            ['$80', '$80.00', '$80.00', '$80.00', '$77.90'],
            ['$120', '$120.00', '$80.00', '$92.00', '$117.90'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Read the table as three shapes rather than nine numbers.\n\n' +
            '**Unhedged** is the 45-degree line: what the market does, you do. **The swap** is flat everywhere — $80 whatever happens, which is certainty bought by handing over every dollar of upside and, in the bad year, being the person who looks like a genius. **The collar** is flat, then sloped, then flat: protected below $70, exposed in between, capped above $92.\n\n' +
            'That is the real trade-off, and it is the sentence to have ready. A swap gives you **a price**. A collar gives you **a band**. A CFO who needs to underwrite a dividend or a project loan wants a price and will pay the opportunity cost for it. A CFO who is asked "and what if oil goes to $130" wants a band. Most producers run both, on different slices of the same production.\n\n' +
            'What neither one fixes: the collar settles against a published index, and your cargoes do not. The difference between the two is [[basis-risk]], and it survives every structure in this lesson. Both legs also get [[mark-to-market]] every day, and the short call leg is margined, so a rally you are perfectly happy about commercially still moves cash out of the door before the physical ever prices.',
        },
        {
          kind: 'prose',
          body:
            'Two words will come up and you only need one sentence for each.\n\n' +
            '**Implied volatility** is what the market is charging for uncertainty, and it is the main thing driving both premiums — so "seventy by ninety-two" is not a fact about $70, it is today\'s answer: when vol is bid the same floor comes with a ceiling further away, and when the market is quiet the ceiling has to sit closer in to raise the same premium.\n\n' +
            '**The greeks** are the sensitivities of an option\'s value, and the only one you must be able to hear is **delta**: how much of a futures position the thing behaves like right now. A collar running at a delta of 0.35 across a million barrels is hedging roughly like being short 350,000 barrels of paper today — and it will not be 0.35 next week, because delta moves as the market moves. That is the whole of it. Nobody is going to ask you to derive Black-Scholes, and if they do, that is a different job.',
        },
        {
          kind: 'quiz',
          prompt: 'Brent prices at $118. Company A hedged the quarter with a swap at $80. Company B did the zero-cost $70/$92 collar. Per barrel, what did each realise?',
          options: [
            { text: 'A gets $80, B gets $118', why: 'B sold the $92 call, and at $118 the buyer of that call takes the $26 above it. B does not keep the rally; that is what paid for the floor.' },
            { text: 'Both get $80 — that is what hedging means', why: 'That is what a swap means. A collar only fixes the price outside the band; between $70 and $92 it does nothing at all, and above $92 it fixes at $92, not at $80.' },
            { text: 'A gets $80, B gets $92', why: 'A is flat at the swap price whatever happens. B participated all the way from $80 up to the $92 ceiling and was capped there. B is $12 a barrel better off, which is what the sold upside was worth in this particular quarter.', correct: true },
          ],
        },
        {
          kind: 'checkpoint',
          prompt:
            'You are in the meeting. The structurer says: "We can do zero-cost seventy by ninety-two on 60% of Q3 liquids. Vol is bid this week so the ceiling is better than the quote we showed you last month. Delta is about 0.35, so tell treasury the margin will move around." Translate it, line by line, into plain English — and say what is being given up.',
          answer:
            'Line one is the structure and the size. A **zero-cost collar** means two trades done together for no net cash: they buy a $70 put for you (your floor) and you sell them a $92 call (your ceiling), and the two premiums cancel. "On 60% of Q3 liquids" is the volume — the other 40% of the quarter\'s production stays unhedged and prices at whatever the market does.\n\n' +
            'Line two is a price observation, not a compliment. "Vol is bid" means implied volatility has risen, so options are more expensive across the board — and for a fixed $70 floor, that buys you a ceiling further out than the same structure would have got last month. It is the reason the quote moved, and it is also the reason the quote will not still be there next week.\n\n' +
            'Line three is about cash, not value. **Delta** says the position currently behaves like a futures position about a third the size of the barrels it covers. Because the sold call leg is margined and marked to market daily, a rally that is commercially good news for the company still sends variation margin out of the door long before the physical cargoes price — so treasury has to fund it.\n\n' +
            'What is being given up: every dollar above $92 on 60% of the quarter. In a $118 quarter that is $26 a barrel you have sold, and it will be visible in the numbers. That is the price of the floor, and the fact that no cash left the building on day one does not change it.',
        },
      ],
    },
  ],
};

export default lesson;
