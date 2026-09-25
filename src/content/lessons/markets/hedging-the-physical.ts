// Hedging the physical: what selling futures against a cargo does, and what it leaves behind.
//
// Finance first. The reader owns barrels and has a paper position against them; the only Python in the
// lesson is the engine behind one interactive card, and `hideProgram` keeps it out of sight. Every
// number the card shows was still produced by the verifier running that program.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'hedging-the-physical',
  title: 'Hedging, and what it does not cover',
  summary: 'Sell the futures, keep the barrels — and find out what risk you actually kept',
  track: 'markets',
  order: 6,
  minutes: 12,
  prereqs: ['the-storage-trade'],
  outcomes: [
    'Describe the two legs of a physical hedge and what is left over when they cancel',
    'Name the three mismatches that make a hedge imperfect: grade, place and date',
    'Explain why a correctly hedged trader can still run out of cash',
    'Say what hedging actually converts, rather than what it removes',
  ],
  sections: [
    {
      id: 'two-legs',
      title: 'Two legs, one trade',
      blocks: [
        {
          kind: 'prose',
          body:
            'You have just bought a [[cargo]]: 500,000 barrels of West African [[sour]] crude, loading in three weeks, priced at Dated Brent **minus $1.50**. The money leaves your account when it loads. It comes back six weeks later, when the vessel discharges and the buyer pays.\n\n' +
            'In those six weeks the flat price of crude can do anything. An OPEC meeting, a cold January, a drone over a Russian refinery — a $6 move is an ordinary quarter, and $6 on 500,000 barrels is **$3 million**. Nobody hired you to have an opinion on that. You bought this cargo because you were the best bid for it and you know a refinery that wants it at a better number.\n\n' +
            'So before you leave the desk you sell 500 lots of Brent futures — 500,000 barrels of paper, the same volume you just bought in steel. Two legs, put on the same afternoon.',
        },
        {
          kind: 'table',
          caption: 'The same six weeks, played both ways, per barrel.',
          head: ['', 'Brent falls $6', 'Brent rises $6'],
          rows: [
            ['The cargo you own', '−$6.00', '+$6.00'],
            ['The futures you sold', '+$6.00', '−$6.00'],
            ['**Flat price, net**', '**$0.00**', '**$0.00**'],
            ['**What you are left holding**', '**the differential**', '**the differential**'],
          ],
        },
        {
          kind: 'prose',
          body:
            'Read the bottom row again, because it is the whole point. You did not trade crude. You traded the **[[differential]]** — the minus $1.50 you bought it at, against whatever that discount is worth on the day you sell it. If West African sour tightens from minus $1.50 to minus $0.60, you made 90 cents a barrel, or $450,000, and it is completely irrelevant whether crude was at $60 or $120 while you held it.\n\n' +
            'That is what a physical trader means by a position. Not "long crude". Long *this* crude, against *that* paper, for *these* weeks.',
        },
        {
          kind: 'quiz',
          prompt: 'The cargo is bought and the futures are sold. Over the next month Brent rallies hard, from $82 to $96. Your boss asks how the position did.',
          options: [
            { text: 'Up $14 a barrel — $7 million on the cargo', why: 'The cargo is worth $14 more, yes. But you are short 500 lots against it, and that leg lost the same $14. The rally passed straight through you.' },
            { text: 'Flat on the rally; the position lives or dies on the differential', why: 'Both legs moved $14 in opposite directions and cancelled. What is left is the discount you bought at against the discount you sell at.', correct: true },
            { text: 'Down $14 a barrel, because you were short futures into a rally', why: 'You were short paper, but you were long the same number of real barrels, and they went up by the same amount. Counting one leg and not the other is how a hedged book gets mistaken for a losing one.' },
          ],
        },
      ],
    },
    {
      id: 'the-risk-you-kept',
      title: 'Your barrel is not the benchmark',
      blocks: [
        {
          kind: 'prose',
          body:
            'The table quietly assumed something that is never quite true: that both legs move by the same $6. They do not, and there are three reasons at once.\n\n' +
            '**Grade.** Yours is a heavy, sour West African [[crude-grade]]; Brent is light and sweet North Sea. When Asian refiners run hard, sour tightens against sweet; when a hydrocracker in Korea goes down for maintenance, it widens. Brent has no idea any of that happened.\n\n' +
            '**Place.** Your barrels are floating off Bonny. Brent settles against cargoes in the North Sea. The gap between those two prices is [[freight]], plus whoever happens to be short in each basin this month.\n\n' +
            '**Date.** Your cargo prices off a five-day window around the bill of lading. You sold the December contract, which settles on a day of the exchange\'s choosing, not yours.\n\n' +
            'What you own is Brent *plus a differential*. What you sold is Brent. So you hedged the Brent and you kept the differential — and the differential moves on its own. That leftover has a name: **[[basis-risk]]**. It is smaller than the flat price risk you got rid of, by a long way. It is not zero, and it is where hedged traders still lose money.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'basis-drift',
            title: 'The hedge that nearly matches',
            intro: 'Brent follows a fixed path: it falls hard, then bounces. Drag **how much of the cargo is hedged**, and drag **basis drift** to make your grade slide against Brent day by day. Watch the black *net* line: that is what you actually made.',
            hideProgram: true,
            outputLabel: 'The hedge, day by day',
            template:
              'brent = [82.00, 81.20, 79.40, 77.90, 78.60, 76.10, 74.30, 75.00, 73.80, 74.60, 76.20]\n' +
              'drift = (⟦drift⟧ * 2) / 100\n' +
              'hedged = ⟦hedged⟧ / 10\n' +
              'barrels = 500000\n' +
              'cents = round(drift * 100)\n' +
              'if cents > 0:\n' +
              '    basis = "the differential gains " + str(cents) + "c a day"\n' +
              'elif cents < 0:\n' +
              '    basis = "the differential loses " + str(-cents) + "c a day"\n' +
              'else:\n' +
              '    basis = "the differential holds still"\n' +
              'print("Cargo:  500,000 bbl of West African sour, bought at Brent minus $1.50")\n' +
              'print("Hedge:  " + str(round(hedged * 100)) + "% of it sold as Brent futures")\n' +
              'print("Basis:  " + basis)\n' +
              'print("")\n' +
              'print("day    Brent    cargo    paper      net")\n' +
              'cargo_line = []\n' +
              'paper_line = []\n' +
              'net_line = []\n' +
              'for d in range(0, 11):\n' +
              '    cargo = (brent[d] - brent[0]) + drift * d\n' +
              '    paper = 0.0 - hedged * (brent[d] - brent[0])\n' +
              '    cargo_line.append([d, round(cargo, 2)])\n' +
              '    paper_line.append([d, round(paper, 2)])\n' +
              '    net_line.append([d, round(cargo + paper, 2)])\n' +
              '    print(f"{d:>3}  {brent[d]:>7.2f}  {cargo:>+7.2f}  {paper:>+7.2f}  {cargo + paper:>+7.2f}")\n' +
              'final = net_line[10][1]\n' +
              'total = round(final * barrels)\n' +
              'print("")\n' +
              'print("Ten days on, the net is " + format(final, "+.2f") + " a barrel.")\n' +
              'if total < 0:\n' +
              '    print("On the whole cargo: a loss of $" + format(-total, ","))\n' +
              'elif total > 0:\n' +
              '    print("On the whole cargo: a gain of $" + format(total, ","))\n' +
              'else:\n' +
              '    print("On the whole cargo: nothing gained, nothing lost.")\n',
            knobs: [
              { id: 'drift', kind: 'range', label: 'basis drift against Brent, in 2c a day per step', min: -10, max: 10, start: 0 },
              { id: 'hedged', kind: 'range', label: 'barrels hedged, out of every 10', min: 0, max: 10, start: 10 },
            ],
            probes: {
              'cargo-line': 'cargo_line',
              'paper-line': 'paper_line',
              'net-line': 'net_line',
              end: '[cargo_line[10], paper_line[10], net_line[10]]',
            },
            visual: {
              kind: 'plot',
              xLabel: 'days held',
              yLabel: 'gain or loss, $ a barrel',
              caption: 'Two legs pulling against each other, and what is left between them. The dots are where each leg stands after ten days.',
              series: [
                { probe: 'cargo-line', label: 'the cargo' },
                { probe: 'paper-line', label: 'the futures' },
                { probe: 'net-line', label: 'net — what you actually made' },
              ],
              marker: 'end',
            },
            notes: {
              '10-10': 'Fully hedged, and the grade tracks Brent exactly. The two legs are mirror images and the net line sits flat on zero all the way across. This is the hedge as it is drawn on a whiteboard, and it never happens.',
              '10-0': 'No hedge at all. The net line *is* the cargo line: crude falls $5.80 and you are down $2.9 million on a trade you put on for a 90-cent differential. Nobody survives a career doing this.',
              '3-10': 'Every barrel hedged, and the grade still bleeds 14 cents a day against Brent. The flat price is perfectly neutralised — and you finish $1.40 a barrel down, $700,000 on the cargo, having never had a view on the price of oil.',
            },
            takeaway:
              'Move the hedge slider and you change how much of the *flat price* reaches you. Move the drift slider and you change something the hedge cannot touch at all. A trader who hedges well has not removed risk; they have swapped a $6 problem they cannot forecast for a 40-cent problem they are paid to understand.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Your cargo is fully hedged with Brent. For a week Brent barely moves, but Asian buyers cancel two liftings and West African differentials fall 80 cents. What happened to your book?',
          options: [
            { text: 'Nothing — the hedge covers it', why: 'The hedge covers Brent. Brent did not move. The thing that moved was the gap between your grade and Brent, which is precisely the part you kept.' },
            { text: 'Down about 80 cents a barrel, and the futures did not help', why: 'The cargo is worth 80 cents less and the paper leg is unchanged, because the benchmark it tracks is unchanged. That is basis risk arriving.', correct: true },
            { text: 'Up 80 cents, because the short futures gain when physical weakens', why: 'A short futures position gains when the *futures* fall. Weak West African differentials against a flat Brent leave the futures exactly where they were.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'This is why traders talk about hedges being *good* rather than *on*. Hedging a Nigerian cargo with Brent is a good hedge — the two really do move together most days. Hedging the same cargo with natural gas because the correlation looked fine last quarter is a position dressed as a hedge. The question is never "am I hedged"; it is "what did I keep, and do I understand it".',
        },
      ],
    },
    {
      id: 'the-cash',
      title: 'Right, and still broke',
      blocks: [
        {
          kind: 'prose',
          body:
            'Now the part that surprises people who have only seen hedging on paper.\n\n' +
            'Crude rallies $12 over nine days. Your cargo is worth $12 a barrel more — $6 million of paper gain sitting in a vessel somewhere off Angola. Your futures leg is down the same $6 million, and here is the asymmetry: the exchange settles that leg in cash every single evening. Positions are **[[mark-to-market]]**, and a **[[margin-call]]** does not want your cargo or your invoice. It wants wired funds tomorrow morning.\n\n' +
            'The cargo, meanwhile, pays you nothing until it discharges and the buyer\'s thirty days run out. You are perfectly hedged, completely right, and short $6 million of cash for five weeks.',
        },
        {
          kind: 'prose',
          body:
            'That gap is what a credit line is for, and it is the reason commodity trading is a banking business wearing a hard hat. The trading houses that failed did not usually fail because they were wrong about a price. They failed because a rally they were *hedged against* generated margin calls faster than their lenders would fund, and they were forced to lift hedges at the worst possible moment — turning a neutral book into a naked one at the top.\n\n' +
            'So the real constraint on how much a trader can carry is not their appetite for risk. It is how much variation margin their bank will finance on a bad week.',
        },
        {
          kind: 'match',
          ask: 'Match each situation to what it really costs you.',
          pairs: [
            { left: 'Brent rallies $12 while your cargo is still at sea', right: 'cash out today, cash back in five weeks' },
            { left: 'Your crude is sour, your hedge is sweet', right: 'the grade gap moves with nobody watching it' },
            { left: 'You sold December, the cargo prices in January', right: 'two dates that can drift apart before either settles' },
            { left: 'Fully hedged, fully funded, grade tracking well', right: 'only the differential is left to be right or wrong about' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A new analyst tells you the desk is "fully hedged, so there is no risk". What is wrong with the sentence?',
          options: [
            { text: 'Nothing — that is what fully hedged means', why: 'It is what the word sounds like. It is not what the position is: a hedge exchanges one exposure for several smaller ones, and the smaller ones are still real money.' },
            { text: 'Hedging converts one large uncertain exposure into small, named ones — basis, timing and cash — it does not delete risk', why: 'That is the whole trade. You gave up a flat price you cannot forecast and kept a differential, a date mismatch and a funding requirement, all of which you can measure and manage.', correct: true },
            { text: 'Hedging is only safe once you are hedged in both directions', why: 'Hedging the hedge just leaves you flat with two sets of costs. The issue is not the quantity of hedges, it is that a hedge never matches the thing it covers exactly.' },
          ],
        },
        {
          kind: 'checkpoint',
          prompt: 'A cargo of sour crude is bought at Brent minus $1.50 and fully hedged with Brent futures. Over the six weeks you hold it, Brent falls $9 and sour differentials widen from minus $1.50 to minus $2.40. Treasury also calls twice about funding. What did the desk make, and what did the desk actually risk?',
          answer:
            'The $9 fall is a non-event: the cargo lost $9 a barrel and the short futures made $9 a barrel, which is exactly what the hedge was put on to do. What the desk actually traded was the differential, and it went the wrong way — bought at minus $1.50, now worth minus $2.40, so 90 cents a barrel lost, or $450,000 on 500,000 barrels. That is basis risk, and it is the only P&L in the whole six weeks that came from a decision anyone made.\n\nThe calls from treasury are the second, separate story. Brent falling meant the short futures leg was *winning*, so margin flowed in rather than out — but had crude rallied $9 instead, the same correct hedge would have demanded roughly $4.5 million of cash weeks before the cargo paid a cent. The hedge protected the margin and created a funding problem; both are true at once, and a desk is sized by the second one as much as the first.\n\nThe honest summary for the boss: the flat price risk was removed as designed, the position lost on the grade differential it existed to trade, and the risk that could actually have ended the desk was never price at all — it was cash timing.',
        },
      ],
    },
  ],
};

export default lesson;
