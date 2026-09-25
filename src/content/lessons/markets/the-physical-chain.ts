// The physical chain: who touches a barrel, and where a trader's margin actually comes from.
//
// Finance first. The reader is a new hire on a crude desk, not a programmer: the only Python in this
// lesson is the engine behind the crack-spread card, and `hideProgram` keeps it out of sight so the
// reader sees sliders, a picture and dollars per barrel.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'the-physical-chain',
  title: 'From well to pump',
  summary: 'Who touches a barrel between the ground and the tank of a car, and which of them is paid for the risk',
  track: 'markets',
  order: 2,
  minutes: 10,
  prereqs: ['what-a-barrel-is'],
  outcomes: [
    'Name every hand a barrel passes through, and say which one is carrying the price risk',
    'Say where a physical trader is paid from: time, place or form',
    'Read a refining margin off a crude price and a product slate',
    'Explain why a refinery is long the [[crack-spread]] whether it wants to be or not',
    'Say why physical trading is a few large decisions rather than a lot of small ones',
  ],
  sections: [
    {
      id: 'the-chain',
      title: 'Who touches the barrel',
      blocks: [
        {
          kind: 'prose',
          body:
            'A North Sea producer has 600,000 barrels loading in the second half of next month. You buy them. Not an option on them, not a swap that references them — the [[cargo]] itself, priced at dated Brent plus 40 cents, and from the moment the last barrel crosses the ship\'s flange it is yours.\n\n' +
            'Nobody at the producer is thinking about that oil any more. It is sold, the price is fixed off a published [[spot]] benchmark and a [[differential]], and their next problem is the next cargo. Yours has just started. You own 600,000 barrels of one particular [[crude-grade]], sitting in a ship off Aberdeen, and you have to find the buyer who wants exactly that barrel, in that month, at that place.',
        },
        {
          kind: 'table',
          caption: 'The chain a barrel goes down, and what each link is really selling.',
          head: ['Link', 'What they own', 'What they are paid for'],
          rows: [
            ['Producer', 'A field and a loading programme', 'Getting it out of the ground and sold; they rarely hold a barrel'],
            ['**Trader (you)**', '**Title to the cargo, and every risk attached to it**', '**Knowing where that barrel is worth more than you paid**'],
            ['Shipowner', 'Steel and a crew', '[[freight]] for the voyage, whatever the oil does while it is aboard'],
            ['Refinery', 'A plant with a fixed appetite for crude', 'The gap between the crude it buys and the products it sells'],
            ['Distributor', 'Terminals, trucks and forecourts', 'Delivering to [[spec]], on time, in small lots, close to the driver'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Notice what you are not. You are not a broker introducing the producer to the refinery for a fee, and you are not a pipeline of paperwork. You **own** it. If the ship is three weeks late, if the refinery rejects the parcel off spec, if Brent falls $6 while you are still looking for a home — that is your money, and nobody else\'s.\n\n' +
            'And you cannot sell it to just anyone. A plant is built for a certain [[api-gravity]] and a certain sulphur content: feed a heavy [[sour]] barrel to a refinery configured for light sweet and it either cannot process it or will only take it at a discount that wipes out your margin. "A barrel" is not one thing. That is exactly why there is a job here at all.',
        },
        {
          kind: 'prose',
          body:
            'The other thing to take in is the size of the lump. The unit of this business is the cargo: 600,000 barrels on an Aframax, a million on a Suezmax, two million on a [[vlcc]]. At $80 a barrel that last one is $160 million of oil moving on a single decision.\n\n' +
            'So the rhythm is nothing like a screen. You will make a handful of these decisions a month, each one weeks long, each one hard to undo — once the ship sails for Singapore it is going to Singapore, and reversing it costs a charter and a month. Few, large, slow, irreversible. The work is in the decision, not in the clicking.',
        },
        {
          kind: 'quiz',
          prompt: 'Your cargo is halfway to Rotterdam when the buyer has an unplanned shutdown and walks away from the deal. Who is out of pocket?',
          options: [
            { text: 'The producer, who sold a cargo that nobody used', why: 'They were paid on loading and their exposure ended at the flange. What happens to the barrel afterwards is not their problem or their profit.' },
            { text: 'You. You own 600,000 barrels at sea and no buyer', why: 'Title is the whole job. You now re-offer the cargo, probably at a worse differential, and you pay for every day the ship waits.', correct: true },
            { text: 'The shipowner, who now has nowhere to discharge', why: 'The shipowner earns freight for the voyage and demurrage for every day you keep the vessel waiting. Their risk is the ship, not the oil in it.' },
          ],
        },
      ],
    },
    {
      id: 'three-arbitrages',
      title: 'Three ways to make it worth more',
      blocks: [
        {
          kind: 'prose',
          body:
            'The cargo is on your books at $80. You did not buy it because you think crude is going up — if that were the trade you would have bought futures and saved yourself the freight, the insurance and the phone calls.\n\n' +
            'You bought it because a physical barrel can be sold into a *different market* from the one you bought it in. There are only three of those, and every trade this desk does is one of them or a combination.',
        },
        {
          kind: 'prose',
          body:
            '**Time.** Sell it to next quarter. Look at the [[forward-curve]]: when the forward price sits above today\'s, a shape called [[contango]], you can buy now, sell the forward contract now, and hold the barrel in between. What you earn is the [[time-spread]] less the [[carry]] — the rent, the interest and the insurance on a full tank. In [[backwardation]], the opposite shape, the market is paying you not to hold anything.\n\n' +
            '**Place.** Sell it somewhere else. Gasoil in Singapore and gasoil in Rotterdam are the same product with different prices, and the difference is the [[location-spread]]. Charter a ship, pay the freight, and keep whatever is left over.\n\n' +
            '**Form.** Sell it as something else. Run it through a refinery and a barrel of crude comes out as petrol, diesel and heavy fuel; or put two off-spec parcels in a tank and stir, which is [[blending]], and land a barrel that meets a spec neither one met alone.\n\n' +
            'The rest of this track is one lesson per arbitrage. The storage trade is time. The voyage is place. The crack and the blend are form.',
        },
        {
          kind: 'match',
          ask: 'Match each way of making money to what it takes to do it.',
          pairs: [
            { left: 'Time: hold it and deliver later', right: 'a tank, and a forward price above spot by more than the carry' },
            { left: 'Place: move it somewhere else', right: 'a ship, and two markets priced further apart than the freight' },
            { left: 'Form: turn it into something else', right: 'a plant or a blend tank, and products worth more than the feed' },
            { left: 'None of the three: hold it and hope', right: 'a view on the flat price, which is a bet rather than a trade' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Gasoil in Singapore is $9 a barrel above gasoil in Rotterdam. Freight on the ships you can actually get is $4. What do you do?',
          options: [
            { text: 'Buy Rotterdam, sell Singapore, charter the ship', why: 'A $9 spread against $4 of freight leaves $5 a barrel, and you sell the Singapore leg the day you buy the Rotterdam one so the $5 is locked rather than hoped for.', correct: true },
            { text: 'Nothing — the spread will have closed by the time you arrive', why: 'It may well close, which is precisely why you sell the far leg on day one. An open spread is a forecast; a spread you have sold both sides of is a trade.' },
            { text: 'Buy Singapore, sell Rotterdam, and collect the freight', why: 'That is the trade backwards: you would buy the expensive barrel, sell the cheap one, and pay the freight for the privilege. And freight is a cost you pay, never income you collect.' },
          ],
        },
      ],
    },
    {
      id: 'the-refinery-gap',
      title: 'The gap a refinery lives in',
      blocks: [
        {
          kind: 'prose',
          body:
            'Your buyer is a refinery, and a refinery is not really buying oil. It is buying the right to turn one barrel of crude into a slate of products — call it 45% petrol, 35% diesel, 20% heavy fuel — and to keep the difference between what the barrel cost and what the slate sells for.\n\n' +
            'That difference is the **[[crack-spread]]**, and it is the only number on the plant manager\'s screen that matters. Crude at $80 is neither good nor bad news to them. Crude at $80 with a slate worth $87 is a good week; crude at $80 with a slate worth $79 means they are paying for the privilege of running.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'refining-margin',
            title: 'Does the plant run this week?',
            intro: 'Drag the **crude price** and the **premium the light products carry over crude**. The bars are what each cut of one barrel is worth, what the whole slate is worth, and what the barrel cost. Heavy fuel is priced the way it really trades: as a fraction of crude, not at a fixed premium.',
            hideProgram: true,
            outputLabel: 'One barrel, from well to pump',
            template:
              'crude = ⟦crude⟧ * 2.0\n' +
              'premium = ⟦premium⟧ * 2.0\n' +
              'petrol = crude + premium\n' +
              'diesel = crude + premium + 2.0\n' +
              'heavy = crude * 0.80\n' +
              'slate = 0.45 * petrol + 0.35 * diesel + 0.20 * heavy\n' +
              'margin = slate - crude\n' +
              'print(f"Crude bought          ${crude:7.2f}")\n' +
              'print(f"Petrol, 45% of it     ${petrol:7.2f}")\n' +
              'print(f"Diesel, 35% of it     ${diesel:7.2f}")\n' +
              'print(f"Heavy fuel, 20% of it ${heavy:7.2f}")\n' +
              'print(f"The slate is worth    ${slate:7.2f}")\n' +
              'print(f"Refining margin       ${margin:7.2f}")\n' +
              'print(f"On a 2m barrel cargo  ${margin * 2000000:12,.0f}")\n',
            knobs: [
              { id: 'crude', kind: 'range', label: 'crude price, $ a barrel (in $2 steps)', min: 20, max: 60, start: 40 },
              { id: 'premium', kind: 'range', label: 'light products over crude, $ a barrel (in $2 steps)', min: 0, max: 8, start: 6 },
            ],
            probes: {
              bars: '[round(0.45 * petrol, 2), round(0.35 * diesel, 2), round(0.20 * heavy, 2), round(slate, 2), round(crude, 2)]',
              labels: '["petrol, 45%", "diesel, 35%", "heavy, 20%", "whole slate", "crude cost"]',
            },
            visual: {
              kind: 'bars',
              values: 'bars',
              labels: 'labels',
              max: 130,
              caption: 'Each cut is its price times its share of the barrel, so the first three bars add up to the fourth. The slate has to clear the crude bar, or the plant is running at a loss.',
            },
            notes: {
              '20-6': 'Crude at $80 with the light products $12 over it: a healthy but unremarkable refinery, and the kind of margin a plant is built to earn. Multiply it by a cargo and it is still serious money.',
              '40-6': 'The same $12 premium with crude at $120, and the margin is visibly thinner. Nothing about the plant changed — but a fifth of every barrel comes out as heavy fuel priced off crude, so a higher flat price costs you more on the bottom of the barrel than the light cuts make back.',
              '20-1': 'Crude at $80 and almost no product premium: the slate no longer clears the crude bar. This is the week refineries cut runs, bring forward maintenance, and stop bidding for your cargo.',
            },
            takeaway:
              'The refinery is long this gap every single day it runs, whether it has a view on it or not: it buys crude and sells products, and nothing it can do changes that. The only levers are how hard to run and whether to sell the gap forward. The 45/35/20 slate here is a simplification — real yields differ with every plant\'s configuration and every crude grade, and shifting a few percent between the light cuts and the heavy one is worth more to a refiner than most price moves.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Crude goes from $80 to $110. Petrol and diesel rally penny for penny with it, and heavy fuel stays where it always is, at about 80% of crude. What happened to the refining margin?',
          options: [
            { text: 'Unchanged — crude and products moved together', why: 'The light cuts did move together. Heavy fuel did not: at 80% of crude it gains 80 cents for every dollar crude gains, and that shortfall lands on a fifth of every barrel.' },
            { text: 'It narrowed by about $1.20 a barrel', why: 'Crude rose $30, heavy fuel rose $24, and the $6 shortfall falls on the 20% of the barrel that comes out heavy: about $1.20.', correct: true },
            { text: 'It grew, because the margin is a percentage of the crude price', why: 'A crack is a dollar gap per barrel, not a percentage of anything. A higher flat price makes the margin harder to earn, not automatically bigger.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'Which is why refiners sell the crack forward: buy crude futures, sell product futures, and lock a gap they know they can run at. It solves one problem and creates two.\n\n' +
            'First, the paper legs are [[mark-to-market]] every night while the plant pays nothing until the products are actually sold — so a rally in crude produces a [[margin-call]] on a refinery that is, in real terms, doing fine. Second, the futures are Brent and the plant runs your North Sea grade: the hedge covers the flat price and leaves the differential naked, which is [[basis-risk]], and it is the thing that quietly kills people who thought they were hedged.',
        },
        {
          kind: 'checkpoint',
          prompt: 'Your refinery customer calls. The crack has collapsed, they are cutting runs, and they want to defer your cargo by three weeks. Walk through what that does to each link of the chain — and say what your problem is now.',
          answer:
            'The producer is untouched: they were paid at loading and their barrel is long gone. The shipowner is untouched and slightly better off: they earn freight either way, and demurrage for every extra day you hold the vessel. The refinery is doing the only thing it can do, because it is long the crack and the crack has gone; running harder would just lose money faster.\n\n' +
            'Everything lands on you, because you are the one who owns barrels. Three things happen at once. The differential on your grade weakens, since the refineries that would bid for it are the ones cutting runs — and if you hedged with Brent futures, that is exactly the part your hedge does not cover. Your place trade turns into a time trade you never chose: three weeks of demurrage or storage is carry you did not budget for, and it only pays if the curve is in contango wide enough to cover it. And the cargo has to find a different home — a plant with a different appetite, a blend into something else, or a tank until the crack comes back.\n\n' +
            'The right answer is rarely "wait and see". It is to price all three exits today and take the least bad one, because every day you spend deciding is a day of carry you are paying for the privilege of owning oil that nobody currently wants.',
        },
      ],
    },
  ],
};

export default lesson;
