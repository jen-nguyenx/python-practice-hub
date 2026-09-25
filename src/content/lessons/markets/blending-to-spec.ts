// Blending to spec: the arbitrage of form.
//
// A finance lesson, not a programming one. The reader is a new hire on a fuel oil desk, so there is no
// Python on the page at all: the one interactive card sets `hideProgram`, and every number under it was
// still worked out by the verifier running the model. The model is the engine, never the subject.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'blending-to-spec',
  title: 'Blending to spec',
  summary: 'Two parcels nobody wants at that price, one tank, and a line you have to land just inside',
  track: 'markets',
  order: 5,
  minutes: 11,
  prereqs: ['what-a-barrel-is'],
  outcomes: [
    'Read a [[spec]] as a price step rather than a target',
    'Work out the blend that lands just inside a sulphur limit',
    'Put a number on quality giveaway, and on what missing the limit costs',
    'Say why the blending tank, not the forecast, is the position',
  ],
  sections: [
    {
      id: 'the-line',
      title: 'The line with a price step on it',
      blocks: [
        {
          kind: 'prose',
          body:
            'The phone goes at seven. A refinery has 12,000 tonnes of residue it wants gone this week: **1.20% sulphur**, offered at **$465 a tonne**. You know what that number means before he finishes the sentence. Marine fuel sold into the global market has to come in at or under **0.50% sulphur**. His parcel is over that line by more than double, so it is not marine fuel. It is [[sour]] residue, it prices off the discounted market at about **$440** this morning, and he is asking $465 for it.\n\n' +
            'The 0.50% is a [[spec]]: the quality the buyer has contracted for, written into the deal as hard limits — sulphur, density, flash point, water, ash. A spec is not a target you aim at and a spec is not a preference. It is a line with a price step sitting on it. At 0.4985% you have marine fuel. At 0.5015% you have the other thing, and nobody at the discharge port cares that the difference between the two is three parts in ten thousand.\n\n' +
            'An hour later the opposite problem calls. A [[cargo]] of low-sulphur cutter, **0.05% sulphur**, offered at **$625 a tonne**. Clean as you like — and worth less than it costs, because marine fuel is $600 this morning. Anyone buying that parcel to sell it straight is down $25 a tonne before the surveyor has climbed the ladder.',
        },
        {
          kind: 'table',
          caption: 'Two parcels on your screen. Handling and tank costs run about $4 a tonne on either.',
          head: ['', 'The cheap parcel', 'The dear parcel'],
          rows: [
            ['What it is', 'Refinery residue, 12,000 t', 'Low-sulphur cutter, 20,000 t'],
            ['Sulphur', '1.20%', '0.05%'],
            ['What you pay', '$465 a tonne', '$625 a tonne'],
            ['What it sells as, on its own', 'Off-spec fuel at $440', 'Marine fuel at $600'],
            ['**Margin, sold as it stands**', '**−$29 a tonne**', '**−$29 a tonne**'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Two offers, both of them losers, both losing exactly the same $29. That is not bad luck. It is what a competitive market looks like: a parcel is priced at what it is worth to the people who can use it as it stands, and neither of these is worth buying as it stands.\n\n' +
            'Notice where the money actually sits. It is not spread smoothly across the sulphur range — the market does not pay you a little more for 1.10% than for 1.20%. Physical fuel is quoted as a [[differential]] to the benchmark, and that differential is flat across the whole off-spec range, then jumps $160 the moment you cross under 0.50%. All the value in this business lives in that one step.',
        },
        {
          kind: 'quiz',
          prompt: 'Two parcels of residue sit side by side. One tests at 0.49% sulphur, the other at 0.51%. The contract limit is 0.50%. How far apart are they worth?',
          options: [
            { text: 'Almost nothing — 0.02% of sulphur is a rounding error', why: 'Chemically, near enough. Contractually, no. One meets the limit and one does not, and the two are priced off completely different markets.' },
            { text: 'About $160 a tonne, because one sells as marine fuel and one sells as discounted fuel', why: 'The price step sits at the limit, not spread across the sulphur range. That step is the entire reason blending is a business.', correct: true },
            { text: 'The 0.51% parcel is worth more, since there is more of it by mass', why: 'Sulphur is a contaminant the buyer has to pay to deal with. Nobody has ever paid extra for it.' },
            { text: 'It depends on the oil price', why: 'The flat price moves both parcels together. What separates them is the discount off-spec fuel trades at, and that is a spread, not a price level.' },
          ],
        },
      ],
    },
    {
      id: 'the-blend',
      title: 'Two wrongs, one cargo',
      blocks: [
        {
          kind: 'prose',
          body:
            'Buy both. Put them in the same tank.\n\n' +
            'Sulphur blends by mass, and near enough perfectly linearly over the range a fuel oil desk works in: 100 tonnes of the 1.20% parcel with 200 tonnes of the 0.05% parcel gives you 300 tonnes at 0.43%. That mixture is marine fuel. It sells at $600. Neither parcel could be sold at $600 an hour earlier.\n\n' +
            'Nothing was refined. No molecule changed. What you sold was **form** — a quality the market pays a premium for, assembled out of two qualities it does not. That is [[blending]], and it is the oldest asset-backed margin in the business, because the asset doing the work is the tank. A refinery does the same trick at industrial scale and calls the result its [[crack-spread]]; you are doing it with two parcels, a line and a mixer, and the arithmetic has the same shape.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'blend-to-the-limit',
            title: 'Where do you stop pouring?',
            intro: 'Drag the **share of the cheap parcel** up and watch the blend sulphur climb toward the 0.50% limit. The margin climbs with it — right up until the blend crosses the line and the whole cargo reprices.',
            hideProgram: true,
            outputLabel: 'The blend, tonne by tonne',
            template:
              'cheap_pct = ⟦cheap⟧\n' +
              'discount = ⟦discount⟧\n' +
              's_high = 1.20\n' +
              's_low = 0.05\n' +
              'limit = 0.50\n' +
              'cost_high = 465.0\n' +
              'cost_low = 625.0\n' +
              'sell_on_spec = 600.0\n' +
              'handling = 4.0\n' +
              'cargo_t = 30000\n' +
              '\n' +
              'def sulphur_at(pct):\n' +
              '    x = pct / 100\n' +
              '    return s_high * x + s_low * (1 - x)\n' +
              '\n' +
              'def price_at(pct):\n' +
              '    return sell_on_spec if sulphur_at(pct) <= limit else sell_on_spec - discount\n' +
              '\n' +
              'def cost_at(pct):\n' +
              '    x = pct / 100\n' +
              '    return cost_high * x + cost_low * (1 - x) + handling\n' +
              '\n' +
              'def margin_at(pct):\n' +
              '    return price_at(pct) - cost_at(pct)\n' +
              '\n' +
              'def money(v, places=2):\n' +
              '    return ("-$" if v < 0 else "$") + f"{abs(v):,.{places}f}"\n' +
              '\n' +
              'sulphur = sulphur_at(cheap_pct)\n' +
              'on_spec = sulphur <= limit\n' +
              'margin = margin_at(cheap_pct)\n' +
              'print(f"Cheap parcel, 1.20% S   {cheap_pct:>3}% of the blend")\n' +
              'print(f"Dear parcel, 0.05% S    {100 - cheap_pct:>3}% of the blend")\n' +
              'print(f"Blend sulphur           {sulphur:.4f}%    limit {limit:.2f}%")\n' +
              'print(f"Verdict                 {\'on spec, sells as marine fuel\' if on_spec else \'OFF SPEC, sells as discounted fuel\'}")\n' +
              'print(f"Price received          {money(price_at(cheap_pct))} a tonne")\n' +
              'print(f"All-in cost             {money(cost_at(cheap_pct))} a tonne")\n' +
              'print(f"Margin                  {money(margin)} a tonne")\n' +
              'print(f"On a 30,000 t cargo     {money(margin * cargo_t, 0)}")\n',
            knobs: [
              { id: 'cheap', kind: 'range', label: 'share of the cheap high-sulphur parcel, %', min: 0, max: 99, start: 30 },
              {
                id: 'discount',
                label: 'what off-spec fuel trades below the $600 marine price',
                choices: [
                  { value: '160.0', caption: '$160 below (usual)' },
                  { value: '120.0', caption: '$120 below (narrow)' },
                  { value: '200.0', caption: '$200 below (wide)' },
                ],
              },
            ],
            probes: {
              margin: '[[p, round(margin_at(p), 2)] for p in [0, 10, 20, 30, 39, 40, 50, 60, 70, 80, 90, 100]]',
              breakeven: '[[0, 0], [100, 0]]',
              here: '[[cheap_pct, round(margin_at(cheap_pct), 2)]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'share of the cheap high-sulphur parcel, %',
              yLabel: 'margin, $ a tonne',
              caption: 'What the blend earns at every ratio. The dot is the ratio you have set. The drop is the moment the cargo stops being marine fuel.',
              series: [
                { probe: 'margin', label: 'margin on the blend' },
                { probe: 'breakeven', label: 'break even' },
              ],
              marker: 'here',
            },
            notes: {
              '0-0': 'No cheap parcel at all: you have simply bought the dear cutter and sold it as marine fuel, for a loss of $29 a tonne. Every dollar of margin in this trade comes from the parcel you were not allowed to sell.',
              '30-0': 'A cautious blend. On spec at 0.3950%, making $19 a tonne — and a tenth of a percent of sulphur headroom left sitting in the tank, unsold.',
              '39-0': 'The trade. 0.4985% against a 0.50% limit, $33.40 a tonne, a million dollars on the cargo. There is nothing left to give away and nothing given away.',
              '40-0': 'One more point of the cheap parcel. Sulphur 0.5100%, and the cargo is no longer marine fuel — all 30,000 tonnes of it. The swing from the step before is over four million dollars.',
              '99-0': 'Nearly pure cheap parcel: back to losing about $30 a tonne, which is what the refinery was trying to hand you at seven o\'clock this morning.',
            },
            takeaway:
              'The margin is a ramp with a cliff at the end of it, and the whole skill is standing as close to the edge as your lab and your mixer will let you. Everything to the left of the edge is value you handed over; one step past it and you are not trading a margin any more, you are trading a discount on a cargo three times the size.',
          },
        },
        {
          kind: 'prose',
          body:
            'Come back to the cautious blend for a moment. At 30% cheap parcel the cargo tests 0.395% and makes $19 a tonne. At 39% it tests 0.4985% and makes $33.40. Same buyer, same contract, same price received — the only difference is that the cautious blend used more of the dear parcel than the contract ever asked for.\n\n' +
            'The trade calls that **quality giveaway**, and it is the quietest way to lose money in this business, because nothing goes wrong. The cargo ships, the buyer is pleased, the paperwork is clean. You simply handed over a tenth of a percent of sulphur headroom that you paid $625 a tonne to create and were paid nothing for. Blend to just inside the limit. Every spare unit of quality you give away is value given away.',
        },
        {
          kind: 'quiz',
          prompt: 'Your blender stops at 30% of the cheap parcel. The cargo tests at 0.395% against a 0.50% limit and he is pleased with a clean, safe result. What has he done?',
          options: [
            { text: 'Nothing wrong — the buyer gets a better cargo and the price is the same', why: 'The price is the same, and that is exactly the problem. The buyer contracted for 0.50% and received 0.395%. The difference is a gift, priced at whatever the dear parcel cost you.' },
            { text: 'Given away about 0.10% of sulphur headroom, worth roughly $14 a tonne on this blend', why: 'Every point of headroom you leave unused is a tonne of the dear parcel you did not have to buy. $14.40 a tonne, and on a 30,000 tonne cargo that is over $430,000 of margin walked off the terminal.', correct: true },
            { text: 'Reduced the risk enough to justify whatever it cost', why: 'Some tolerance is right: the lab has a reproducibility band and a tank is never perfectly mixed. But "whatever it cost" is not a policy. A blend tolerance should be a number you can defend, not a habit.' },
            { text: 'Made more money, because a lower-sulphur cargo is worth more', why: 'Not under this contract. There is one price for anything at or under the limit, so 0.395% and 0.4985% fetch exactly the same dollar.' },
          ],
        },
      ],
    },
    {
      id: 'the-risk',
      title: 'The line only bends one way',
      blocks: [
        {
          kind: 'prose',
          body:
            'Now the other side of the cliff, because this is where blending desks actually get hurt.\n\n' +
            'Off-spec is not a bad outcome for the part of the blend that was off-spec. It is a bad outcome for **the whole tank**. Put 12,000 tonnes of 1.20% residue into 18,000 tonnes of clean cutter and land at 0.51%, and you have not lost the discount on 12,000 tonnes. You have lost it on 30,000, including the expensive, perfectly clean material you paid $625 a tonne for. At the usual $160 discount that is $4.8 million, and the loss is larger than the loss on either parcel sold untouched. Mixing is the one operation on a terminal you cannot reverse.\n\n' +
            'Which is why the certificate matters more than the calculation. You do not own a blend because the arithmetic says 0.4985%; you own it when an independent surveyor draws a sample from a properly circulated tank and the lab signs the number. Until then you own an opinion about a tank.',
        },
        {
          kind: 'steps',
          title: 'How a blend actually gets landed',
          items: [
            'Test both parcels yourself before you commit. The seller\'s certificate is the seller\'s certificate, and a tenth of a percent of error on the incoming residue moves your stopping point by several hundred tonnes.',
            'Blend in stages, not in one pour. Bring the tank to somewhere short of the limit, circulate it properly, sample it, and only then decide how much more of the cheap parcel it will take.',
            'Keep cutter in reserve. The cheapest insurance against an off-spec tank is a few thousand tonnes of clean material you have not already sold, because coming back down is far cheaper than repricing the cargo.',
            'Set the tolerance as a number and defend it. Lab reproducibility on sulphur, plus an allowance for imperfect mixing, gives you a defensible gap below the limit. Anything wider than that gap is giveaway wearing a safety jacket.',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Your 30,000 tonne blend comes back from the lab at 0.53% against a 0.50% limit. Cutter at 0.05% is available at $625. What is the cheapest way out?',
          options: [
            { text: 'Sell it as off-spec fuel and take the hit', why: 'That is the $160 discount on all 30,000 tonnes — $4.8 million. It is the fallback, not the answer, and it should only ever happen when you have no tank space and no cutter.' },
            { text: 'Cut in more low-sulphur material until it tests under the limit', why: 'About 2,100 tonnes of cutter brings 30,000 tonnes from 0.53% down to 0.4985%. The cutter only loses you the $25 a tonne it costs above the marine price — call it $53,000 against a $4.8 million discount.', correct: true },
            { text: 'Add more of the high-sulphur parcel so the total averages out', why: 'Sulphur blends by mass. Adding more of the thing that is over the limit moves the average further over it, every time.' },
            { text: 'Ask the buyer to accept it at 0.53% for a small allowance', why: 'Worth a phone call, and occasionally it works. But the buyer has the same 0.50% obligation downstream, so what you are really asking is for him to inherit your problem — and he will price it as such.' },
          ],
        },
        {
          kind: 'match',
          ask: 'Match each blend result to what it does to the cargo.',
          pairs: [
            { left: 'Lands at 0.4985% against a 0.50% limit', right: 'the best cargo on the board: on spec, with nothing given away' },
            { left: 'Lands at 0.395% against a 0.50% limit', right: 'on spec, but you shipped quality you were never paid for' },
            { left: 'Lands at 0.5100% against a 0.50% limit', right: 'every tonne in the tank reprices to the discounted market' },
            { left: 'Never blended: both parcels sold as they stand', right: 'two small losses instead of one large margin' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'Your blender lands a 30,000 tonne cargo at 0.42% against a 0.50% limit, and the desk congratulates him on a clean, safe result. Your head of trading asks you what that safety cost. What do you tell her, and what is the harder question underneath it?',
          answer:
            'Work it in cheap-parcel share, because that is where the money is. Landing at 0.42% means about 32% of the cheap parcel; landing at 0.4985% means 39%. Those seven points of 30,000 tonnes are roughly 2,100 tonnes swapped out of the $465 parcel and into the $625 one, and at $160 a tonne of price difference that is about $11 a tonne of margin, near enough $336,000 on this one cargo. The buyer received sulphur headroom he did not contract for and did not pay for, and it is not a rounding error — it is a third of a million dollars that never appeared as a loss anywhere, because nothing went wrong.\n\n' +
            'The harder question is what the right gap actually is. Zero is not the answer: the lab has a reproducibility band on sulphur, a tank is never perfectly homogeneous, and an off-spec certificate costs you the discount on the whole parcel, not on the sliver that broke it. So the honest gap is the one you can justify from the test method and the mixing, and it should be written down, reviewed and the same on every cargo. What you must not accept is a blender choosing 0.42% because it feels comfortable. Comfort is not a tolerance; it is a fee, paid by you, to a buyer who never asked for it.',
        },
      ],
    },
  ],
};

export default lesson;
