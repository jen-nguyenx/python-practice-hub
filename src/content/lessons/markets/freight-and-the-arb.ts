// Freight and the arb: why a ship is a position.
//
// The arbitrage of place, written the way the storage lesson was written: the reader is a trader with a
// cargo in the wrong country, and every number under the sliders was computed by the verifier. The
// program is the engine and not the subject, so `hideProgram` keeps the Python out of the reader's way.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'freight-and-the-arb',
  title: 'Freight and the arb',
  summary: 'Buy where it is cheap, sell where it is dear, and pay the ship in between',
  track: 'markets',
  order: 9,
  minutes: 11,
  prereqs: ['the-storage-trade'],
  outcomes: [
    'Work out whether the gap between two ports pays for the ship that closes it',
    'Say what a trader means by "the arb is shut", and what reopens it',
    'Explain how a route dies with no change in the oil price at all',
    'Recognise when a tanker is worth more sitting still than sailing',
  ],
  sections: [
    {
      id: 'the-gap',
      title: 'A cargo in the wrong place',
      blocks: [
        {
          kind: 'prose',
          body:
            'A West African producer offers you a full [[cargo]] — two million barrels of light sweet crude, loading at Bonny in three weeks — at **$80.30 a barrel**. You have no use for two million barrels in Nigeria. But a refiner at Ningbo is bidding **$85.30** for that same crude delivered to his berth.\n\n' +
            'Same oil, same month, two places, five dollars apart. That gap is the **[[location-spread]]**, and everyone on the desk calls it the arb. It exists because oil is not one market: it is a few hundred loading terminals and a few hundred refineries, and the price at each one is set by what is actually available *there* this month.\n\n' +
            'The five dollars is not yours, though. Somebody has to carry those barrels forty-five days around the Cape, and that somebody wants paying. **[[freight]]** on West Africa to China is $3.50 a barrel today. Insurance, port dues and the oil you lose in transit take another quarter. And the $160 million you hand over at Bonny sits at sea earning nothing for six weeks, which at 5% costs you 49 cents more.',
        },
        {
          kind: 'table',
          caption: 'One ship, Bonny to Ningbo, forty-five days at sea.',
          head: ['', 'Per barrel', 'On the cargo'],
          rows: [
            ['Sell, delivered Ningbo', '+$85.30', '+$170,600,000'],
            ['Buy, loaded at Bonny', '−$80.30', '−$160,600,000'],
            ['Freight', '−$3.50', '−$7,000,000'],
            ['Insurance, port dues, losses', '−$0.25', '−$500,000'],
            ['Financing, 45 days at 5%', '−$0.49', '−$980,000'],
            ['**Margin**', '**+$0.76**', '**+$1,520,000**'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Five dollars of gap came out the other end as seventy-six cents. That is the trade: a million and a half dollars for putting the right barrels in front of the right refiner, and four fifths of the gap went to the people who own the ship, the insurance and the money.\n\n' +
            'So the rule the desk actually runs on is one line. **The arb is open when the gap is wider than the cost of getting there.** Wider by a nose and you are working for the shipowner; wider by a dollar and you have a business.\n\n' +
            'When the gap is narrower, nobody says the trade is uneconomic. They say *the arb is shut*, and the cargo stays home — which in practice means the producer sells to a nearer buyer at a worse price, and the refiner at Ningbo buys from somebody closer. Nothing dramatic happens. The barrels simply stop crossing the ocean, and the two prices stay apart because it is not worth anyone\'s while to bring them together.',
        },
        {
          kind: 'quiz',
          prompt: 'Overnight the whole crude complex rallies $6. Bonny now offers at $86.30 and Ningbo now bids $91.30. Freight and everything else are unchanged. What happened to your trade?',
          options: [
            {
              text: 'It is $6 a barrel better — you were long before the rally',
              why: 'You are not long anything. You buy at Bonny and sell to Ningbo as one decision, so the level of the market appears on both legs and cancels. A location trade is a bet on the difference, never on the price.',
            },
            {
              text: 'Nothing worth mentioning: the gap is still $5.00, so the margin is still about $0.76',
              why: 'Both legs moved together, so the spread is untouched. The only real change is a few cents more financing on a dearer cargo.',
              correct: true,
            },
            {
              text: 'It is worse, because a $6 rally makes freight more expensive',
              why: 'Freight is priced by the shipping market, not by the oil price. A tanker owner charges what his ship can earn, and a $6 move in crude does not change how many ships are free next week.',
            },
          ],
        },
      ],
    },
    {
      id: 'freight-moves',
      title: 'Ships are a market of their own',
      blocks: [
        {
          kind: 'prose',
          body:
            'Tuesday morning. Bonny is still offering at $80.30, Ningbo is still bidding $85.30, the gap is still exactly five dollars. And the arb is shut.\n\n' +
            'What moved was ships. A **[[vlcc]]** — a very large crude carrier, two million barrels, the unit every long-haul crude trade is sized in — was $3.50 a barrel to China on Friday and is $4.50 this morning. Your seventy-six cents is now minus twenty-four, and not one oil price on your screen changed. That is the sentence worth remembering from this lesson: a route can die of shipping.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'freight-arb',
            title: 'Does the cargo sail?',
            intro: 'Drag the **gap between the two ports** and the **freight rate**. The line is your margin per barrel at every possible gap; the dot is where today sits. Above the break-even line you fix a ship, below it the cargo stays home.',
            hideProgram: true,
            outputLabel: 'The voyage, priced',
            template:
              'gap = ⟦gap⟧ / 2\n' +
              'freight = ⟦freight⟧ / 2\n' +
              'other = 0.74\n' +
              'margin = gap - freight - other\n' +
              'cargo = margin * 2000000\n' +
              '\n' +
              'def money(x, dp=2):\n' +
              '    return ("-$" if x < 0 else "$") + f"{abs(x):,.{dp}f}"\n' +
              '\n' +
              'print("Price gap between the ports", money(gap).rjust(12), "a barrel")\n' +
              'print("Freight for the voyage     ", money(freight).rjust(12), "a barrel")\n' +
              'print("Insurance, ports, financing", money(other).rjust(12), "a barrel")\n' +
              'print("Margin                     ", money(margin).rjust(12), "a barrel")\n' +
              'print("Margin on a full cargo     ", money(cargo, 0).rjust(12))\n' +
              'print()\n' +
              'print("The arb is OPEN: fix a ship." if margin > 0 else "The arb is SHUT: the cargo stays home.")\n',
            knobs: [
              { id: 'gap', kind: 'range', label: 'gap between the two ports, $ a barrel (in 50c steps)', min: 0, max: 24, start: 10 },
              { id: 'freight', kind: 'range', label: 'freight for the voyage, $ a barrel (in 50c steps)', min: 2, max: 16, start: 7 },
            ],
            probes: {
              'margin-line': '[[g / 2, round(g / 2 - (⟦freight⟧ / 2) - 0.74, 2)] for g in range(0, 25)]',
              'break-even': '[[g / 2, 0] for g in range(0, 25)]',
              here: '[[⟦gap⟧ / 2, round((⟦gap⟧ / 2) - (⟦freight⟧ / 2) - 0.74, 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'gap between the two ports, $ a barrel',
              yLabel: 'margin per barrel, $',
              caption: 'What a barrel earns you at every gap, after the ship and the rest are paid. The dot is today. Where the line crosses zero is the gap the route needs to exist at all.',
              series: [
                { probe: 'margin-line', label: 'margin after freight' },
                { probe: 'break-even', label: 'break-even' },
              ],
              marker: 'here',
            },
            notes: {
              '10-5': 'The Bonny cargo as it stood on Friday: a five dollar gap against a $3.50 ship, seventy-six cents a barrel, a million and a half dollars. A good week, and the whole of it sitting on four dollars and change of costs.',
              '10-7': 'Tuesday morning. The oil prices have not moved at all — only the freight slider did — and the dot has dropped below the line. This is what "the arb is shut" looks like from the inside.',
              '20-5': 'A ten dollar gap: a genuine dislocation, a refinery outage or a sanctions scramble. Note that everybody can see it, everybody charters at once, and freight is usually halfway up to meet you before your ship is fixed.',
              '4-0': 'A two dollar gap and a one dollar ship: a short haul, US Gulf to eastern Canada or Rotterdam to the Baltic. Short routes live on gaps too thin for a VLCC, which is exactly why they are worked by smaller vessels and thinner margins.',
            },
            takeaway:
              'Two markets decide whether a cargo moves, and only one of them is the oil market. The gap tells you what the trade is worth; freight tells you what it costs; and because ships are priced by their own supply and demand, the second number can take the trade away from you on a morning when nothing happened to oil at all.',
          },
        },
        {
          kind: 'prose',
          body:
            'It is worth knowing why freight jumps like that. Two hundred thousand tonnes of steel cannot be conjured up in a week: the fleet is what it is for years at a time, and a ship that is loading at Basrah is not available to you at any price. So the supply of ships is close to fixed in the short run, while demand for them lurches about — a fortnight of heavy Chinese buying, a war-risk premium that makes owners refuse a sea, a sanctions list that strands forty tankers, a canal that closes and adds a week to every voyage.\n\n' +
            'When a fixed supply meets lurching demand, the price does not move politely. Rates that sat at $3 a barrel for a year can double in ten days and give it all back in a month. It is a market with its own brokers, its own screens, its own [[spot]] and forward prices, and traders who do nothing but that.\n\n' +
            'The consequence for you is simple and slightly brutal: half of your arb is priced by people who do not care what oil is doing.',
        },
        {
          kind: 'quiz',
          prompt: 'You have five cargoes on the water, ships fixed weeks ago, all West Africa to China. This morning freight rates double. What has happened to the money on those five voyages?',
          options: [
            {
              text: 'The margin on them is roughly halved',
              why: 'The freight on a sailing cargo was fixed the day you fixed the ship, at the rate agreed that day. A move afterwards changes what the *next* voyage costs, not what this one cost.',
            },
            {
              text: 'Nothing to the five on the water — it is the sixth cargo that just died',
              why: 'Fixed is fixed. The five are done at the old rate; the trade you were about to do at $3.50 no longer exists, and neither does anyone else\'s, which is why cargoes stop leaving West Africa when rates spike.',
              correct: true,
            },
            {
              text: 'They are worth more, because the freight needed to move them is now worth more',
              why: 'The refiner at Ningbo pays a delivered price set by his market, not a cost-plus price set by yours. Expensive ships do not make a delivered cargo dearer; they make fewer cargoes worth sending.',
            },
          ],
        },
      ],
    },
    {
      id: 'the-ship',
      title: 'Why the ship is the position',
      blocks: [
        {
          kind: 'prose',
          body:
            'You did not buy a ship to do that trade. You took one on time charter: six months of a VLCC at **$70,000 a day**, and you buy the fuel she burns.\n\n' +
            'Which is where the $3.50 came from, and it is worth seeing the arithmetic once. The voyage is not forty-five days, it is nearer seventy, because the ship has to get back — you pay for the empty leg home as surely as the full one. Seventy days at $70,000 is $4.9 million. Bunkers are most of $1.7 million. Port dues, dues at both ends and the odd week of waiting take it to about **$7 million**, and $7 million spread over two million barrels is your $3.50.\n\n' +
            'That is the same discovery as the tank in the last lesson, wearing different clothes. The chartered vessel is not overhead. It is the position.',
        },
        {
          kind: 'prose',
          body:
            'Look at what the charter actually bought. For six months you hold the right, and not the obligation, to move two million barrels from anywhere to anywhere. When a gap opens wider than the voyage costs, you exercise that right and keep the difference. When no gap anywhere is wide enough, you do not sail at a loss to look busy — you sit, and the most the option can cost you is what you paid for it. A ship is an option on the spread, and the charter is the premium.\n\n' +
            'And the same steel does a second job. Put her at anchor and she is a tank. When the [[forward-curve]] goes into steep enough [[contango]] — the storage trade you already know — barrels are worth more sitting still than moving, and a trader will pay tanker rates to keep them still. That is not a curiosity: in the spring of 2020 something close to a tenth of the world crude fleet was hired as floating storage, because the shore tanks were full and the marginal tank in the world was a VLCC at anchor off Singapore.\n\n' +
            'When that happens the two markets become one. Every ship hired to sit is a ship not available to sail, so the [[carry]] that pays for floating storage sets the freight rate for everybody trying to move a cargo — and the arb shuts for traders who never went anywhere near the storage trade.',
        },
        {
          kind: 'quiz',
          prompt: 'Crude goes into steep contango: six-month oil is $9 above [[spot]]. Your chartered VLCC is idle at Singapore with every arb out of the region shut. What is the ship worth?',
          options: [
            {
              text: 'Nothing until an arb reopens — a tanker with no voyage earns nothing',
              why: 'A ship is not a route. The steel does one thing, which is to hold two million barrels, and holding barrels is worth money whenever the curve pays for it.',
            },
            {
              text: 'More than yesterday: a $9 contango pays to hold barrels, and a ship holds barrels',
              why: 'Same asset, different trade. When shore tanks fill, the marginal tank in the world is a tanker, and the curve has to pay tanker rates to get one.',
              correct: true,
            },
            {
              text: 'Less than yesterday, because an idle ship still costs $70,000 a day',
              why: 'The charter is owed whatever the ship does — that part is already spent. The live question is what she can earn from here, and a steep contango is one of the few markets that pays a tanker handsomely to do nothing at all.',
            },
          ],
        },
        {
          kind: 'match',
          ask: 'Match each market to what happens to the cargo.',
          pairs: [
            { left: 'Gap $5.00, freight $3.50', right: 'she loads, and the voyage clears about $1.5m' },
            { left: 'Gap $2.00, freight $3.50', right: 'the arb is shut and the barrels stay home' },
            { left: 'Gap unchanged, ships suddenly scarce', right: 'a route that worked last week stops working' },
            { left: 'Steep contango and shore tanks full', right: 'the ship is hired to sit still as storage' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'You hold a VLCC on time charter for four more months at $70,000 a day. The West Africa–China arb has been shut for three weeks: the gap is $2.10 against a voyage that costs $4.20. Your boss asks what the ship is costing the desk, and whether to sail the cargo anyway to keep the ship busy. What do you tell her?',
          answer:
            'Do not sail. At $2.10 of gap against $4.20 of cost, every barrel loses $2.10 and a full cargo loses $4.2 million — a losing voyage loses the money whether or not the ship is already paid for. Then separate the two questions she has asked, because they have nothing to do with each other. The charter is $70,000 a day for four more months, about $8.4 million, and you owe it whatever the ship does; it is spent, so it plays no part in the sail-or-not decision. What is live is what this ship can earn between now and the end of the charter, and there are three honest answers: another route, since the open arb today may well be US Gulf to Europe rather than West Africa to China; floating storage, if the curve has gone contango enough to pay for it; or reletting her into the charter market, which is where the real number comes from. Freight is a market, so the charter is a position you [[mark-to-market]] against today\'s rates: if rates have risen since you fixed her, the charter is an asset on a desk with every arb shut, and if they have fallen it is a loss you are already carrying and sailing will not undo. The mistake to avoid is the one that feels like action — sending a ship to lose $4.2 million so that an asset you have already paid for does not look idle.',
        },
      ],
    },
  ],
};

export default lesson;
