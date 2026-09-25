// How a cargo of LNG gets a price, and why two cargoes off the same ship can be worth wildly different
// money.
//
// Written for someone joining a pricing desk who has to follow the conversation on day one. Every number
// under the sliders was computed in real Python by the verifier, but the reader is here for the
// commercial picture, not the arithmetic, so no program is ever shown.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'how-lng-is-priced',
  title: 'How an LNG cargo is priced',
  summary: 'What a "13.5% slope" means, how JKM and the gas hubs price the same ship differently, and why one cargo can be worth a hundred million more one way than the other',
  track: 'markets',
  order: 1,
  minutes: 12,
  outcomes: [
    'Read an oil-linked LNG formula and turn "a 14 slope" into a price in $/MMBtu',
    'Turn a $/MMBtu price into the value of a whole [[cargo]], and a cent into dollars',
    'Name JKM, TTF and Henry Hub, and say what each one moves with',
    'Say why the choice between an oil-linked and a hub-linked price is the biggest commercial question in an LNG portfolio',
  ],
  sections: [
    {
      id: 'priced-off-crude',
      title: 'A cargo priced off crude',
      blocks: [
        {
          kind: 'prose',
          body:
            'A [[cargo]] loads on the Burrup Peninsula and sails for Japan. Nobody on either side rings up to agree a price. The price was settled years before the ship was built, in a sale and purchase agreement — an SPA — that runs for fifteen or twenty years, and it is not a number at all. It is a formula:\n\n'
            + '**price = slope × crude + constant**\n\n'
            + 'The crude is usually Brent, or in many of the older Asian contracts JCC, the Japan Crude Cocktail, which is the average price of crude landed in Japan. The **constant** is a small fixed addition or subtraction, often a few tens of cents, sometimes negative. And the **slope** is a percentage — the number both sides send their best people to argue about.\n\n'
            + 'So when someone says the deal "went at a 14 slope", or quotes you "13.5%", they mean the LNG costs that percentage of a barrel of crude, per MMBtu. With Brent at $80 a barrel, a 14% slope gives 0.14 × 80 = **$11.20/MMBtu** before the constant. Move Brent to $100 and the same untouched contract prices at $14.00. Nobody renegotiated; the formula did the work.\n\n'
            + 'Slopes in signed long-term contracts have typically sat somewhere between roughly 10% and 17% over the past two decades, depending on when the deal was struck and how tight the market felt at the time. Deals done into a glut price low; deals done into a panic price high, and then live with it for twenty years.',
        },
        {
          kind: 'table',
          caption: 'Round numbers, and deliberately so: ships differ in size and gas differs in heating value, so desks carry slightly different cargo conversions.',
          head: ['Quantity', 'Round number', 'Why you hear it'],
          rows: [
            ['One standard cargo', 'about 160,000 m³ of LNG', 'The size of a common modern carrier'],
            ['The same cargo, as energy', 'about 3.4 million MMBtu', 'LNG is sold by energy, not by volume'],
            ['The price unit', '$ per MMBtu', 'Every LNG price you will meet is quoted this way'],
            ['**$1/MMBtu on one cargo**', '**about $3.4 million**', 'So a ten-cent argument is worth $340,000'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Why would a producer with twenty years of capital to recover want its gas priced off oil at all, when what it sells is gas?\n\n'
            + 'Because crude is enormous, liquid and hedgeable, and lenders financing a multi-billion-dollar train understand it. An oil-linked price is not fixed, but it moves slowly and legibly compared with gas [[spot]], and many Asian SPAs go further and carry an **S-curve**: above some agreed crude level the slope flattens, and below another it flattens again. The formula is damped at both ends. That is the floor the seller is really buying, and the ceiling is what it pays for it.\n\n'
            + 'The buyer, meanwhile, negotiates one thing. A single point of slope — 14% against 13% — is 0.01 × Brent per MMBtu. At $80 Brent that is $0.80/MMBtu, about **$2.7 million a cargo**, and on fifty cargoes a year for twenty years it is the number that decides whether a project gets sanctioned at all.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'slope-pricing',
            title: 'What a slope is worth',
            intro: 'Drag **Brent** and the **slope** and watch the contract price move. The flat line is the Asian spot market, held at $12.00/MMBtu so you can see where the two cross. The formula carries a constant of $0.50.',
            hideProgram: true,
            outputLabel: 'One cargo, both ways',
            template:
              'brent = ⟦brent⟧\n'
              + 'slope_pct = ⟦slope⟧\n'
              + 'constant = 0.50\n'
              + 'jkm = 12.00\n'
              + 'cargo_mmbtu = 3_400_000\n'
              + '\n'
              + 'price = slope_pct / 100 * brent + constant\n'
              + 'oil_linked_m = price * cargo_mmbtu / 1_000_000\n'
              + 'spot_m = jkm * cargo_mmbtu / 1_000_000\n'
              + 'gap = oil_linked_m - spot_m\n'
              + '\n'
              + 'print(f"Brent                       {brent:>8.2f}   $/bbl")\n'
              + 'print(f"slope                       {slope_pct:>8}   % of Brent")\n'
              + 'print(f"contract price              {price:>8.2f}   $/MMBtu")\n'
              + 'print(f"JKM spot                    {jkm:>8.2f}   $/MMBtu")\n'
              + 'print(f"one cargo on the contract   {oil_linked_m:>8.1f}   $m")\n'
              + 'print(f"the same cargo at JKM       {spot_m:>8.1f}   $m")\n'
              + 'print(f"contract minus spot         {gap:>+8.1f}   $m")\n',
            knobs: [
              { id: 'brent', kind: 'range', label: 'Brent crude, $ a barrel', min: 45, max: 120, start: 80 },
              { id: 'slope', kind: 'range', label: 'slope, % of Brent', min: 11, max: 15, start: 13 },
            ],
            probes: {
              'oil-linked': '[[b, round(slope_pct / 100 * b + constant, 2)] for b in range(45, 121, 5)]',
              'jkm-line': '[[b, jkm] for b in range(45, 121, 5)]',
              here: '[[brent, round(price, 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'Brent, $ a barrel',
              yLabel: '$ per MMBtu',
              caption: 'The sloping line is the contract; the flat line is spot. Where they cross is where the twenty-year formula stops being the good deal.',
              series: [
                { probe: 'oil-linked', label: 'oil-linked contract' },
                { probe: 'jkm-line', label: 'JKM spot' },
              ],
              marker: 'here',
            },
            notes: {
              '35-2': 'A fair middle: $10.90/MMBtu on the contract against a $12.00 spot market. Spot is paying about $3.7 million more for this ship — enough to argue about, not enough to restructure a portfolio over.',
              '75-2': 'Crude at $120 drags the contract to $16.10 while spot sits still. Now term volume is the good business and it is the spot desk doing the explaining.',
              '0-4': 'The steepest slope in the range, and it still cannot rescue a $45 crude price: $7.25 against $12.00, about $16 million a cargo. A high slope is only worth having when crude is worth having.',
            },
            takeaway:
              'The slope is a lever on the crude price and on nothing else. At a 15 slope the contract beats a $12 spot market from about $77 Brent upward; at an 11 slope it takes Brent up around $105 to do the same. One percentage point, chosen once, decides which side of the market a twenty-year contract sits on for its whole life.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A colleague says the new deal "went at a 12.5 slope". Brent is $88. Roughly what does the LNG price at, before any constant?',
          options: [
            { text: '$12.50/MMBtu', why: 'That is the slope read as though it were a price. A slope is a percentage of crude, not a dollar figure — it only becomes a price once you multiply it by Brent.' },
            { text: '$11.00/MMBtu', why: '12.5% of $88 is $11.00. The constant, usually a few tens of cents either way, is then added on top, and on a cargo of about 3.4 million MMBtu even that constant is worth seven figures.', correct: true },
            { text: '$88.00/MMBtu', why: 'That is the crude price itself. Crude is quoted per barrel and LNG per MMBtu, so the two numbers are never the same size: a 12.5 slope lands at roughly an eighth of the crude number.' },
          ],
        },
      ],
    },
    {
      id: 'priced-off-gas',
      title: 'Priced off gas instead',
      blocks: [
        {
          kind: 'prose',
          body:
            'Not every cargo is spoken for years ahead. Some volume is uncommitted by design, some falls out when a buyer nominates less than its maximum, and some is simply produced by a portfolio that always keeps a few ships loose. Those cargoes get sold on the [[spot]] market, and there the price comes off a gas marker rather than off oil.\n\n'
            + '**JKM** — the Japan Korea Marker, assessed by Platts — is the reference for LNG delivered into Northeast Asia. It is quoted in **$/MMBtu**, the same unit as the contract price, so an oil-linked number and a JKM number can be set side by side with no conversion at all. That is exactly the comparison a portfolio makes every month.\n\n'
            + '**TTF** is the Dutch virtual gas hub and the European reference. It is quoted in **€/MWh**, so it does need converting: a megawatt hour is about 3.41 MMBtu, so €30/MWh is roughly €8.80/MMBtu, call it about $9.50 at the exchange rates of recent years. TTF matters to a Perth producer even though no ship from the North West Shelf is likely to sail there, because TTF is the competing bid — it sets what the Atlantic cargoes are worth, and therefore whether they come and compete for the Asian buyer.\n\n'
            + '**Henry Hub** is a physical pipeline junction in Louisiana and the US reference, quoted in $/MMBtu and usually the cheapest of the three. US offtake is typically priced at **115% of Henry Hub plus a fixed liquefaction fee** of a couple of dollars, with shipping on top. The 15% uplift covers the gas the plant burns to run itself; the fixed fee is owed whether or not the cargo is lifted, which is why in mid-2020 US offtakers found it cheaper to cancel cargoes and keep paying the fee than to lift them.',
        },
        {
          kind: 'table',
          caption: 'The same ship can be priced against any of these. Which one it is priced against is a commercial decision, not a physical one.',
          head: ['Marker', 'Quoted in', 'Moves with', 'Where it bites'],
          rows: [
            ['Oil-linked SPA (Brent or JCC)', 'A % slope on crude', 'The oil market, on a lag', 'Term volume, 15 to 20 years'],
            ['JKM', '$/MMBtu', 'Asian LNG supply and demand', 'Spot cargoes into Japan, Korea, China'],
            ['TTF', '€/MWh', 'European gas, storage and weather', 'The competing bid for the same ship'],
            ['Henry Hub', '$/MMBtu', 'US production and weather', 'US offtake, at 115% of HH plus a fee'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Price a cargo off a hub and you have changed what it is exposed to, completely. An oil-linked cargo does not care what the weather is doing in Tokyo; it cares what OPEC did last week. A JKM-linked cargo is the reverse: it cares about a Japanese nuclear restart, a Chinese industrial slowdown, a cold snap in Korea, an outage at a competing plant, and not at all about crude.\n\n'
            + 'Once two hubs are in the picture, so is the ship. **JKM minus TTF** is the [[location-spread]] every LNG desk watches: it is the question of which continent the next uncommitted cargo sails to. When that spread is wider than the difference in [[freight]] between the two voyages, cargoes move, and they keep moving until it is not.',
        },
        {
          kind: 'match',
          ask: 'Match each marker to the thing that actually moves it.',
          pairs: [
            { left: 'JKM', right: 'LNG landing in Northeast Asia' },
            { left: 'TTF', right: 'European gas storage and weather' },
            { left: 'Henry Hub', right: 'American pipeline gas' },
            { left: 'Brent', right: 'Crude oil, and the contracts that slope off it' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A cargo is priced at 115% of Henry Hub plus a $2.50 liquefaction fee. Henry Hub is $3.00. Before freight, what is the cargo worth per MMBtu?',
          options: [
            { text: '$5.50', why: 'That adds the fee to Henry Hub but drops the 115%. The uplift is not a margin — it covers the gas the liquefaction plant burns to run itself, so the buyer pays for more gas than it ships.' },
            { text: '$5.95', why: '115% of $3.00 is $3.45, plus the $2.50 fee. Shipping is then on top, which is why the same cargo has a different landed cost in Rotterdam and in Tokyo and why the arbitrage is worth watching.', correct: true },
            { text: '$3.45', why: 'That is the gas alone. The fixed liquefaction fee is owed whether or not the cargo is lifted, so it belongs in the landed cost of every cargo that is.' },
          ],
        },
      ],
    },
    {
      id: 'which-one-wins',
      title: 'The question the portfolio is really asking',
      blocks: [
        {
          kind: 'prose',
          body:
            'In the middle of 2020, JKM was assessed under $2/MMBtu. Asian demand had gone, storage was full, and US offtakers were cancelling cargoes rather than lifting them. Brent averaged in the low $40s that year, so an oil-linked cargo at a 13 slope priced near $6/MMBtu. In round numbers, the twenty-year contract was worth about three times the spot market, and every term buyer in Asia was reading its force majeure clause very carefully.\n\n'
            + 'Two years later it had inverted completely. Through the northern summer of 2022, with European buyers bidding for anything that floated, JKM ran well past $50/MMBtu. Brent near $100 put that same 13 slope near $13.50. The gap was somewhere north of $35/MMBtu, and on a cargo of about 3.4 million MMBtu that is **well over $100 million on a single ship**.\n\n'
            + 'Say that again, because it is the whole lesson. Same molecules, same ship, same voyage, same crew — and a nine-figure difference that turned on nothing except which formula was written into the contract it sailed under.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'spot-vs-contract',
            title: 'The same ship, two contracts',
            intro: 'Brent is held at $80.00 and the contract at a 13.5% slope, so the contract price does not move at all. Drag **JKM** through the range the Asian spot market has genuinely covered in recent years and watch what the same ship is worth.',
            hideProgram: true,
            outputLabel: 'One cargo of about 3.4 million MMBtu',
            template:
              'brent = 80.0\n'
              + 'slope_pct = 13.5\n'
              + 'constant = 0.50\n'
              + 'jkm = ⟦jkm⟧\n'
              + 'cargo_mmbtu = 3_400_000\n'
              + '\n'
              + 'price = slope_pct / 100 * brent + constant\n'
              + 'oil_linked_m = price * cargo_mmbtu / 1_000_000\n'
              + 'spot_m = jkm * cargo_mmbtu / 1_000_000\n'
              + 'gap = spot_m - oil_linked_m\n'
              + '\n'
              + 'print(f"contract price   {price:>8.2f}   $/MMBtu   (13.5% of Brent 80.00, plus 0.50)")\n'
              + 'print(f"JKM spot         {jkm:>8.2f}   $/MMBtu")\n'
              + 'print(f"cargo, contract  {oil_linked_m:>8.1f}   $m")\n'
              + 'print(f"cargo, at JKM    {spot_m:>8.1f}   $m")\n'
              + 'print(f"spot minus term  {gap:>+8.1f}   $m")\n',
            knobs: [
              { id: 'jkm', kind: 'range', label: 'JKM spot, $ per MMBtu', min: 2, max: 40, start: 12 },
            ],
            probes: {
              values: '[round(oil_linked_m, 1), round(spot_m, 1)]',
              labels: '["sold on the contract", "sold at JKM"]',
            },
            visual: {
              kind: 'bars',
              values: 'values',
              labels: 'labels',
              max: 140,
              caption: 'What one cargo is worth, in millions of dollars, under each formula. The left bar never moves.',
            },
            notes: {
              '0': 'Mid-2020. Asian spot collapsed under $2 and cargoes were being cancelled at US plants rather than lifted. Every term buyer on an oil-linked contract was paying several times the market and asking its lawyers what could be done about it.',
              '10': 'A settled-looking market: the two are within a couple of million dollars of each other across a whole cargo, which is roughly where you would expect a market that has had time to find its level.',
              '38': 'Not quite the 2022 peak, but the right neighbourhood. At these levels a single diverted cargo is worth more than a mid-sized company earns in a year, and every flexible molecule on the planet is pointed at whichever basin is paying.',
            },
            takeaway:
              'Same ship, same molecules, same voyage. At $2 JKM the contract is worth more than five times the spot market; at $40 the spot market is worth more than three times the contract, and the difference on one cargo is most of a hundred million dollars. Nothing about the gas changed — only which formula it was sold under.',
          },
        },
        {
          kind: 'prose',
          body:
            'So what does a portfolio actually do about this? It does not pick a side; it picks a mix. Term volume on oil-linked SPAs underwrites the debt and keeps the lenders calm. A slice of uncommitted volume, with destination flexibility written into it, is what lets the portfolio take the 2022 upside instead of watching someone else take it. The argument about how big that slice should be is a permanent one, and it is settled differently after every year like 2020 and every year like 2022.\n\n'
            + 'Two traps sit under it. The first is [[basis-risk]]: hedging an oil-linked sale with a crude swap and a hub-linked purchase with a gas swap leaves both legs individually hedged and the pair of them wide open, because crude and JKM are not the same market and in 2022 they went in opposite directions by a factor of four. The second is timing. Every open position is [[mark-to-market]] at month end against the [[forward-curve]], so a divergence that will not settle in cash for a year still shows up in this month\'s numbers — and a hedge that is right in the end can still generate a very uncomfortable [[margin-call]] on the way there.',
        },
        {
          kind: 'quiz',
          prompt: 'Brent is $70 and the term contract runs at a 14 slope. JKM is assessed at $9.80. An uncommitted cargo could go either way. What is true?',
          options: [
            { text: 'The contract is worth more', why: '14% of $70 is $9.80, which is exactly where JKM is assessed. Before the constant, the freight to each buyer and the credit terms, the two are the same price.' },
            { text: 'They price the same, so the decision turns on everything else', why: '0.14 × 70 = 9.80, so the two formulas meet. This is the crossover, and it is the one place on the chart where the formula does not decide: what decides is the constant, the freight to each destination, who pays faster, and what you think happens next.', correct: true },
            { text: 'JKM is worth more, because spot always beats term', why: 'Spot does not always beat term — that is the point of the last two sections. In mid-2020 spot was a fraction of the oil-linked price; in 2022 it was a large multiple of it. Neither side of that trade is safe.' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Monday morning, and the trading manager says: "We have one uncommitted cargo in November. Term is 13.2 on Brent, the curve has Brent at $78 for the November average, and November JKM is bid at $11.40. TTF plus freight nets back under that. Recommendation is we keep it in the portfolio." Translate that into plain English, do the arithmetic, and say what the recommendation actually commits you to.',
          answer:
            '"Term is 13.2 on Brent" is the slope in the long-term contracts: sold to a term buyer, this cargo prices at 13.2% of Brent, plus whatever constant that SPA carries. "The curve has Brent at $78 for the November average" is the [[forward-curve]] number the formula would settle against, so 0.132 × 78 = **$10.30/MMBtu** before the constant.\n\n'
            + '"November JKM is bid at $11.40" is the Asian spot marker: someone will pay $11.40/MMBtu for a cargo delivered into Northeast Asia that month. That is $1.10/MMBtu more than the term price, and on a cargo of roughly 3.4 million MMBtu it is **about $3.7 million**.\n\n'
            + '"TTF plus freight nets back under that" means the same ship sent to Europe — sold at the Dutch hub and charged the voyage cost — comes back worth less than $11.40. Asia wins the [[location-spread]] this month, so the ship sails east.\n\n'
            + 'And "keep it in the portfolio" means: do not commit it to the term buyer. Leave it uncommitted and sell it [[spot]], because spot is currently paying about $3.7 million more for the identical ship. What it commits you to is a view, not a fact — the $11.40 is a bid today for a month that has not happened, and the $78 is a curve number that will not be final until the November crude average is actually struck. If JKM softens between now and loading, that $3.7 million was never real, and the term buyer you turned down is still there next year remembering it.',
        },
      ],
    },
  ],
};

export default lesson;
