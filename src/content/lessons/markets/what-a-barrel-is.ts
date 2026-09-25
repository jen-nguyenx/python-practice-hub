// What a barrel actually is: grades, gravity, sulphur, and the differential.
//
// The first lesson of the Markets track, and a finance lesson end to end: the reader is a trader with two
// offers on the screen, not a student learning Python. The only code in the file is the engine inside the
// interactive card, and `hideProgram` keeps it where it belongs — every number the reader sees was still
// computed by the verifier, so the schedule on the page and the schedule in the slider cannot drift apart.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'what-a-barrel-is',
  title: 'What a barrel actually is',
  summary: 'Two cargoes, the same 600,000 barrels, millions apart — grades, gravity, sulphur, and why nobody quotes a flat price',
  track: 'markets',
  order: 6,
  minutes: 10,
  outcomes: [
    'Say which benchmark a cargo prices off, and why the answer depends on where it lands',
    'Read a crude from its two headline numbers: gravity and sulphur',
    'Explain why sour crude trades at a discount, and what makes that discount move',
    'Quote a cargo the way the market does — benchmark plus or minus a differential — and say why',
  ],
  sections: [
    {
      id: 'two-offers',
      title: 'Two offers, same volume',
      blocks: [
        {
          kind: 'prose',
          body:
            'Two offers land before lunch. Both are for **600,000 barrels**, both load in March, both say *crude oil* on the ticket.\n\n' +
            'The first is a West African light sweet [[cargo]], offered at **90 cents over Brent**. The second is heavy sour crude out of the Gulf, offered at **$5.80 under Brent**. With Brent at $82.00 that is $82.90 a barrel against $76.20 a barrel: the same volume, the same month, about **$4 million apart**.\n\n' +
            'Nobody is being cheated, and there is nothing wrong with the second cargo. A barrel is a unit of volume — 42 US gallons, near enough 159 litres — and volume tells you almost nothing about what you have bought. What you have bought is a chemistry, and a refinery pays for what it can get out of the barrel.',
        },
        {
          kind: 'table',
          caption: 'The two offers, side by side.',
          head: ['', 'Cargo A', 'Cargo B'],
          rows: [
            ['What it is', 'West African light sweet', 'Gulf heavy sour'],
            ['Volume', '600,000 bbl', '600,000 bbl'],
            ['[[api-gravity]]', '40.0 — light', '24.0 — heavy'],
            ['Sulphur', '0.20% — sweet', '1.60% — [[sour]]'],
            ['Quoted as', 'Brent **+ $0.90**', 'Brent **− $5.80**'],
            ['With Brent at $82.00', '$82.90 a barrel', '$76.20 a barrel'],
            ['The whole cargo', '$49,740,000', '$45,720,000'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Notice what neither seller gave you: a price. They quoted Brent plus or minus a number, and Brent is neither of these cargoes — it is a light sweet North Sea grade nobody in this conversation is buying. The $82.00 is the Brent [[spot]] price, today\'s number for a barrel delivered now, and it moves every minute of the day.\n\n' +
            'That is deliberate. A [[crude-grade]] that trades in enough volume, with enough buyers and sellers to be hard to push around, becomes the reference everyone else prices against. Three of them carry most of the world:\n\n' +
            '- **Brent** — North Sea, light and sweet. The reference for the Atlantic basin: Europe, West Africa, the Mediterranean.\n' +
            '- **WTI** — light and sweet, delivered inland at Cushing, Oklahoma. The reference for North America.\n' +
            '- **Dubai**, alongside Oman — medium and sour. The reference for barrels moving east of Suez, Middle East to Asia.\n\n' +
            'Which one a cargo prices off is a question about **where it ends up**, not about what is in it. The same Gulf heavy sour is quoted against Brent sailing to Rotterdam and against Dubai sailing to Ningbo, because the buyer at the far end budgets, hedges and argues in the reference his region uses. A benchmark is a common language, not a valuation.',
        },
        {
          kind: 'quiz',
          prompt: 'The Gulf heavy sour cargo finds a buyer in Ningbo instead of Rotterdam. What changes about the way it is quoted?',
          options: [
            {
              text: 'Nothing — a cargo has one price and the buyer pays it',
              why: 'Physical crude is quoted against a regional reference rather than as one global number. Change the destination and you change the reference the deal is written in.',
            },
            {
              text: 'It is quoted against Dubai instead of Brent, because that is what the Asian buyer prices in',
              why: 'Right. The benchmark follows the buyer. Nothing about the oil in the tank changed; the language of the deal did.',
              correct: true,
            },
            {
              text: 'It is quoted against WTI, because the cargo is now moving internationally',
              why: 'WTI is the North American reference, delivered inland at Cushing. A Gulf cargo bound for China has nothing to do with it.',
            },
          ],
        },
      ],
    },
    {
      id: 'inside-the-barrel',
      title: 'What is actually in the barrel',
      blocks: [
        {
          kind: 'prose',
          body:
            'Run the two cargoes through the same refinery and watch what comes out of each.\n\n' +
            'Crude is a mixture, and heat separates it by weight. The light ends come off first — the naphtha, petrol and jet that sell well **above** the price of crude — and what stays at the bottom is heavy residue, which leaves as fuel oil or bitumen and sells **below** the price of crude.\n\n' +
            'API gravity is the one number that tells you which way a barrel leans, and it runs backwards from what you would guess: **higher API means lighter**. Above about 31 the trade calls a crude light; below about 22, heavy; in between, medium. Every degree upward is a little more of the valuable end of the barrel and a little less residue. That, and not quality in any moral sense, is why the light cargo costs more. It is yield.',
        },
        {
          kind: 'prose',
          body:
            'Now the sulphur. Crude carries anywhere from a trace of it to four or five per cent. The fuels you sell carry almost none: road diesel is held to ten parts per million across most of the world, and since 2020 ships burning fuel outside the special zones are held to 0.50%.\n\n' +
            'So the sulphur has to come out, and taking it out means a hydrotreater, hydrogen to feed it and energy to run it — a real plant with a real cost per barrel. Crude with a lot of sulphur in it is sour; crude with little is sweet.\n\n' +
            'Here is the part worth carrying with you. **The sour discount is roughly what removing the sulphur costs.** It is not the market calling sour crude bad oil; it is the market handing the buyer the money to do a job. When treating capacity is long or hydrogen is cheap, the discount narrows. When low-sulphur fuel is scarce and everybody wants sweet barrels, it widens — and it can move dollars without a single molecule changing.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'pricing-a-cargo',
            title: 'What is this cargo worth against the benchmark?',
            intro:
              'Drag the **gravity** and the **sulphur** and watch the cargo re-price. The line is the whole gravity range at the sulphur you have set; the dot is your cargo. The benchmark sits at 38.0 API and 0.40% sulphur, flat at $82.00.',
            hideProgram: true,
            outputLabel: 'The cargo, priced',
            template:
              'BENCHMARK = 82.00\n' +
              'api = ⟦api⟧\n' +
              'sulphur = ⟦sulphur⟧ / 10\n' +
              '\n' +
              'def gravity_worth(a):\n' +
              '    """20 cents a barrel for every API degree above the benchmark\'s 38.0."""\n' +
              '    return (a - 38.0) * 0.20\n' +
              '\n' +
              'def sulphur_cost(s):\n' +
              '    """$2.50 a barrel for every 1% of sulphur above the benchmark\'s 0.40%."""\n' +
              '    return (0.40 - s) * 2.50\n' +
              '\n' +
              'def differential(a, s):\n' +
              '    return gravity_worth(a) + sulphur_cost(s)\n' +
              '\n' +
              'dif = differential(api, sulphur)\n' +
              'price = BENCHMARK + dif\n' +
              'print(f"Benchmark, $/bbl        {BENCHMARK:>11.2f}")\n' +
              'print(f"API gravity, degrees    {api:>11.1f}")\n' +
              'print(f"Sulphur, per cent       {sulphur:>11.2f}")\n' +
              'print(f"Worth of the gravity    {gravity_worth(api):>+11.2f}")\n' +
              'print(f"Cost of the sulphur     {sulphur_cost(sulphur):>+11.2f}")\n' +
              'print(f"Differential, $/bbl     {dif:>+11.2f}")\n' +
              'print(f"Cargo price, $/bbl      {price:>11.2f}")\n' +
              'print(f"600,000 barrels, $      {price * 600000:>11,.0f}")\n',
            knobs: [
              { id: 'api', kind: 'range', label: 'API gravity, degrees (higher is lighter)', min: 20, max: 40, start: 38 },
              { id: 'sulphur', kind: 'range', label: 'sulphur, in tenths of a per cent (4 = 0.40%)', min: 0, max: 18, start: 4 },
            ],
            probes: {
              curve: '[[a, round(differential(a, sulphur), 2)] for a in range(20, 41)]',
              flat: '[[a, 0] for a in range(20, 41)]',
              here: '[[api, round(dif, 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'API gravity, degrees',
              yLabel: 'differential to the benchmark, $/bbl',
              caption: 'The premium or discount the schedule pays across the whole gravity range, at the sulphur you have set. The dot is your cargo; the flat line is the benchmark itself.',
              series: [
                { probe: 'curve', label: 'differential at this sulphur' },
                { probe: 'flat', label: 'the benchmark' },
              ],
              marker: 'here',
            },
            notes: {
              '18-4': 'The benchmark itself: 38.0 API, 0.40% sulphur, no differential either way. Everything else on this card is priced against this one point.',
              '20-2': 'Cargo A from the table. Lighter and sweeter than the benchmark, so it earns a premium — and roughly the 90 cents the seller asked for.',
              '4-16': 'Cargo B. Fourteen degrees heavier and more than a per cent more sulphur: $2.80 of lost yield and $3.00 of processing, and the barrel is $5.80 cheaper. Same volume of oil.',
              '11-18': 'About where a medium sour Gulf grade sits — the kind of barrel Dubai exists to price, and the kind a complex refinery was built to buy.',
            },
            takeaway:
              'Two numbers, several dollars. Gravity moves the value smoothly, a little more of the valuable end of the barrel with every degree, while sulphur is a flat charge for work somebody has to do. **This schedule is a rule of thumb written for this lesson, not a market model**: real differentials are negotiated cargo by cargo and carry freight, loading dates, contract terms and whoever happens to be short this month. What is real is the shape — light and sweet earns a premium, heavy and sour earns a discount, and the discount is the price of the processing rather than a verdict on the oil.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A wave of new hydrotreating capacity comes online across the region, and removing sulphur gets markedly cheaper. All else equal, what happens to the discount on sour crude?',
          options: [
            {
              text: 'It narrows — the discount only ever had to cover the cost of the work',
              why: 'Right. The discount is the price of a job. Make the job cheaper and buyers can bid more for the sour barrel and still earn the same margin.',
              correct: true,
            },
            {
              text: 'It widens, because more refineries can now process sour crude so there is more of it about',
              why: 'More capacity to treat sour crude means more buyers competing for the same barrels, not more barrels. Competition on the bid narrows a discount.',
            },
            {
              text: 'It does not move, because the discount is set by the chemistry of the crude',
              why: 'The chemistry sets what work has to be done. The discount is the price of doing that work, and prices move.',
            },
          ],
        },
      ],
    },
    {
      id: 'the-differential',
      title: 'Where the trader actually competes',
      blocks: [
        {
          kind: 'prose',
          body:
            'Go back to how both offers were written: Brent plus 90 cents, Brent minus $5.80. That number — the premium or discount against the benchmark — is the [[differential]], and physical crude is essentially never quoted any other way.\n\n' +
            'There is a good reason. Between shaking hands and loading the cargo lie weeks, and the flat price will move dollars in that time. You and the seller have no argument worth having about where Brent goes; quoting a flat price would just be the two of you betting on it. The differential is the part you genuinely disagree about: what **this** crude, on **this** loading date, out of **this** port is worth against the reference. Fix that, and let the benchmark do whatever it does — the flat price becomes a hedging decision, made separately, by whoever wants the exposure.\n\n' +
            'A physical trader\'s entire competitive life happens in that number. Ten cents a barrel on a 600,000 barrel cargo is $60,000. Nobody on the desk is paid for a view on oil.',
        },
        {
          kind: 'prose',
          body:
            'Which brings you to what the two offers are really asking: **who is this cargo worth more to?**\n\n' +
            'A simple refinery — heat, separate, a little treating, what the trade calls hydroskimming — can only sell what the barrel already contains. Feed it the heavy sour cargo and it makes a mountain of high-sulphur fuel oil it sells for less than it paid for the crude, and it has no hydrotreater to fix the sulphur anyway. That refinery pays the 90 cents over Brent without blinking, and it is right to: the light sweet cargo is the only one it can run.\n\n' +
            'A complex refinery has a coker and hydrotreaters — plant that cracks the heavy residue into light products and strips the sulphur out. That plant cost a couple of billion dollars, and it earns the money back in exactly one way: by buying the discounted barrel and selling the same products as everybody else. Offer it the light sweet cargo and it will decline politely. Paying up for a barrel that needs no processing wastes the equipment it has already paid for.\n\n' +
            'Two buyers, one cargo, several dollars apart in what they will bid, and both of them right. The differential settles where the buyer who values the barrel most has to bid to get it.',
        },
        {
          kind: 'match',
          ask: 'Match each barrel or buyer to what it does in the market.',
          pairs: [
            { left: 'Light sweet crude, 40 API, 0.20% sulphur', right: 'trades at a premium to the benchmark' },
            { left: 'Heavy sour crude, 24 API, 1.60% sulphur', right: 'trades at a discount close to the cost of processing it' },
            { left: 'A hydroskimming refinery with no hydrotreater', right: 'pays up for the light sweet cargo and cannot touch the other one' },
            { left: 'A complex refinery with a coker', right: 'was built to buy the cheap barrel and keep the discount' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'You agreed the West African cargo at Brent + $0.90 three weeks ago. Overnight Brent falls $6. What has happened to the deal?',
          options: [
            {
              text: 'Nothing about the deal — you still buy at Brent + $0.90, and the invoice is simply $6 lower',
              why: 'Right. You never agreed a flat price, you agreed a differential, and the differential has not moved. Whether the $6 hurts depends entirely on what you did about the flat price, which was always a separate decision.',
              correct: true,
            },
            {
              text: 'You have lost $6 a barrel, or $3.6 million on the cargo',
              why: 'Only if you were left long the flat price with no hedge. The number you negotiated is untouched; the benchmark exposure is a different position with a different answer.',
            },
            {
              text: 'The differential widens to compensate, so you end up paying about the same',
              why: 'Differentials move for their own reasons — a refinery outage, a shut arb, a pile of unsold cargoes — and not to offset the benchmark. That is exactly why the two are quoted separately.',
            },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A broker offers you a heavy sour cargo, 24 API and 1.60% sulphur, at "Dubai minus $4.00", loading in the Gulf next month. Your buyer is a hydroskimming refinery in the Mediterranean with no hydrotreater. What do you tell the broker, and what were you really being asked?',
          answer:
            'You pass, and not because $4.00 is a mean discount. Three separate things are bundled into that one quote. **The reference:** Dubai is the right benchmark for a Gulf cargo and the wrong one for a Mediterranean buyer who budgets in Brent, so taking the deal means carrying the gap between two references on top of the cargo itself. **The gravity:** at 24 API a great deal of that barrel leaves your buyer\'s plant as heavy residue he sells below what he paid for the crude, because he has nothing that breaks it down. **The sulphur:** at 1.60% it has to be treated, and for a refinery with no hydrotreater the sour discount is not payment for work he can do — it is a wall. Minus $4.00 may well be a perfectly fair differential; it is fair to a complex refinery with a coker, and that is who the barrel belongs to. The question was never "is $4 enough". It was "who is this barrel worth the most to, and am I that person\'s route to it" — which is the question behind every physical trade you will ever look at.',
        },
      ],
    },
  ],
};

export default lesson;
