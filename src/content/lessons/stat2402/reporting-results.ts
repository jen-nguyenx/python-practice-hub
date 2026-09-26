// Reporting a GLM to someone who is not a statistician.
//
// The last STAT2402 lesson. It follows one analysis, the quasi-Poisson model of warpbreaks that the
// overdispersion lesson ended with, from summary() to a paragraph a mill manager could act on. A logit
// aside on mtcars covers the one thing a log link cannot show: odds that need translating into chances.
//
// The device that keeps the track's rule intact: a report sentence is full of numbers R computed, and
// prose may never type one. So R writes the sentences. Every report sentence a reader sees below was
// printed by sprintf() on a fitted model, and the prose around it only points at it.
import type { Lesson } from '../../lessonSchema.ts';

const QFIT = 'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)';
const LOGIT = 'fit <- glm(am ~ wt, family = binomial, data = mtcars)';

const lesson: Lesson = {
  id: 'reporting-results',
  title: 'Saying what the model found, to someone who is not a statistician',
  summary: 'Turning a fitted glm into sentences a non-statistician can use: sizes on a scale they understand, intervals done properly, predictions for real cases, and what not to claim',
  track: 'stat2402',
  order: 15,
  minutes: 20,
  prereqs: ['poisson-regression', 'overdispersion', 'comparing-models'],
  outcomes: [
    'Turn a log-link coefficient into "times as many" and a percentage change, with its variable, baseline, direction and size',
    'Put a 95% interval on the same scale with `exp(confint(fit))` or the Wald version, and say what "Waiting for profiling to be done..." means',
    'Predict for chosen cases with `se.fit = TRUE`, building the interval on the link scale and transforming both ends',
    'Translate an odds ratio into chances for cases a reader can picture',
    'Avoid four claims a model cannot support: p-values as probabilities, "no effect", causation and extrapolation',
    'Have R write the report sentences from the fitted model, so no number is copied by hand',
  ],
  sections: [
    {
      id: 'who-reads-it',
      title: 'Who reads your report',
      blocks: [
        {
          kind: 'prose',
          body:
            'Every lesson so far has ended at `summary()`. That table is for you. The people who asked the question (a mill manager, a doctor, a council) will never read it, and should not have to. What they need is a few sentences that say what was found, how big it is and how sure you can be, in words and units they already use.\n\n' +
            'This lesson follows one analysis from `summary()` to that paragraph. The data is `warpbreaks` from the overdispersion lesson: how many times the yarn broke while a loom wove a fixed length of it, for two wools (A and B) and three tensions (low, medium and high). Those counts spread out more than a Poisson model allows, so the model is the quasi-Poisson one that lesson ended with. The dispersion line in the summary says by how much.',
        },
        {
          kind: 'code',
          code: `${QFIT}\nsummary(qfit)\n`,
          caption: 'The starting point. Every number a report needs is in here, and none of it is in a form a reader can use.',
        },
        {
          kind: 'prose',
          body:
            'A sentence a reader can use has five parts:\n\n' +
            '- **the variable**, named the way the reader names it: "tension", not `tensionH`;\n' +
            '- **the comparison or the units**: high tension *against low tension*, or *per 100 pounds*;\n' +
            '- **the direction**: more breaks or fewer;\n' +
            '- **the size**, on a scale the reader understands: a percentage, "times as many", a count or a chance, never a log;\n' +
            '- **the uncertainty**: a 95% confidence interval, on that same scale.\n\n' +
            'The `tensionH` row holds the raw material for one such sentence. Its estimate is on the log scale, which nobody outside a statistics class reads, so the next two sections turn it into a size and an interval.',
        },
        {
          kind: 'quiz',
          prompt: 'A mill manager asks what the model says about tension. Which answer can they use? (P, L and U stand for numbers R would fill in.)',
          options: [
            {
              text: 'Looms at high tension had P% fewer breaks than looms at low tension, for the same wool (95% CI L% to U% fewer)',
              correct: true,
              why: 'It names the variable and the comparison, gives the direction, puts the size in percent, and says how sure the data let you be. Later in this lesson R fills in P, L and U itself.',
            },
            {
              text: 'The tensionH coefficient is negative and has three stars',
              why: 'True, and no use to a manager: it has no size, no units and no uncertainty, and "three stars" means nothing outside a statistics class.',
            },
            {
              text: 'Tension has a significant effect on the number of breaks',
              why: 'It says there is an effect without saying which way or how big. Worse, "significant" in everyday English means "large", which is not what a p-value says.',
            },
            {
              text: 'At high tension, the log of the mean number of breaks is lower by the tensionH estimate',
              why: 'Correct, and on the log scale. Nobody plans a production run in log breaks; turn the estimate into a ratio or a percentage first.',
            },
          ],
        },
      ],
    },
    {
      id: 'times-and-percent',
      title: 'Times as many, or a percentage',
      blocks: [
        {
          kind: 'prose',
          body:
            'The quasi-Poisson model has a log link, so, as in the Poisson lesson, a coefficient b **multiplies** the expected count by exp(b). That gives two ways to say the same thing:\n\n' +
            '- **times as many**: exp(b). A value of 0.8 means "0.8 times as many breaks".\n' +
            '- **a percentage change**: 100 × (exp(b) − 1). The same 0.8 becomes −20, which a reader hears as "20% fewer".\n\n' +
            'The percentage is usually the one to write, because most people picture "20% fewer" faster than "0.8 times as many". The intercept is not a comparison, so it has no percentage: exp() of it is the expected count for the baseline, wool A at low tension.',
        },
        {
          kind: 'shell',
          lines: [
            QFIT,
            'exp(coef(qfit))',
            '100 * (exp(coef(qfit)[-1]) - 1)',
          ],
          caption: '`[-1]` leaves out the intercept, which is a baseline count rather than a change. Each percentage compares one level with its baseline: wool B with wool A, and each tension with low tension.',
        },
        {
          kind: 'predict',
          code: 'b <- log(0.75)\n100 * (exp(b) - 1)\n',
          ask: 'A coefficient of log(0.75) multiplies the expected count by 0.75. What percentage change does R print?',
          choices: ['[1] -25', '[1] 25', '[1] 75', '[1] 0.75'],
        },
        {
          kind: 'match',
          ask: 'Match each multiplier to the words a reader should hear.',
          pairs: [
            { left: 'exp(b) = 1.25', right: '25% more' },
            { left: 'exp(b) = 0.8', right: '20% fewer' },
            { left: 'exp(b) = 2', right: 'twice as many, or 100% more' },
            { left: 'exp(b) = 0.5', right: 'half as many, or 50% fewer' },
            { left: 'exp(b) = 1', right: 'no change' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Per what, and than what',
          body:
            'A percentage change always has a "than". For a factor it is the baseline level: "than wool A", "than at low tension". For a numeric predictor it is the step: "per extra 100 pounds", "per degree". When one unit is not a step anyone cares about, scale the coefficient first: exp(10 × b) is the multiplier for ten units.',
        },
      ],
    },
    {
      id: 'intervals',
      title: 'Intervals on the same scale',
      blocks: [
        {
          kind: 'prose',
          body:
            'An estimate on its own promises more than the data can deliver: a different set of looms would give a different one. The interval says how far it could reasonably move. For a log-link model you build the interval for b on the log scale, where the model is a straight line, and then exponentiate **both ends**. R offers two ways to get the interval for b.',
        },
        {
          kind: 'compare',
          caption:
            '"Waiting for profiling to be done..." is a message from `confint()`, not an error. For a glm it works each interval out by **profiling** the likelihood: it pushes one coefficient away from its estimate, refits the others, and finds how far it can go before the fit gets significantly worse. That takes a moment, so R says so. The right-hand side is the **Wald** interval, the estimate plus or minus 1.96 standard errors, which you can check by hand from the summary.',
          left: {
            label: 'Profile intervals: confint()',
            code: `${QFIT}\nexp(confint(qfit))\n`,
          },
          right: {
            label: 'Wald intervals: estimate ± 1.96 SE',
            code:
              `${QFIT}\n` +
              'b <- coef(qfit)\n' +
              'se <- summary(qfit)$coefficients[, "Std. Error"]\n' +
              'exp(cbind(lower = b - 1.96 * se, upper = b + 1.96 * se))\n',
          },
        },
        {
          kind: 'prose',
          body:
            'Row by row, the two tables are close but not identical. A profile interval need not be symmetric on the log scale, and it tends to behave better in small samples, which is why `confint()` uses it. Either is defensible; say which one you used.\n\n' +
            'The mistake to avoid is a third version: exponentiating the estimate first and then adding ±1.96 standard errors to it.',
        },
        {
          kind: 'quiz',
          prompt: 'Why exponentiate the two ends of the interval for b, rather than work out exp(b) ± 1.96 × SE?',
          options: [
            {
              text: 'The standard error measures how much b varies on the log scale, and exp() of the two ends carries that range over to the ratio scale',
              correct: true,
              why: 'The standard error belongs to b, not to exp(b). exp() never changes the order of two numbers, so whatever lies inside the interval for b lies inside the exponentiated ends.',
            },
            {
              text: 'It makes the interval narrower',
              why: 'Narrower is not the aim; right is. Exponentiated ends are not even centred on exp(b): the interval reaches further above the estimate than below it.',
            },
            {
              text: 'It gives the same answer, only more tidily',
              why: 'Only by accident. The standard error is in log units, so adding it to a ratio mixes two scales. For a small ratio with a large standard error, exp(b) − 1.96 × SE can even fall below zero, which no ratio can.',
            },
          ],
        },
        {
          kind: 'code',
          code:
            `${QFIT}\n` +
            'ratio <- exp(coef(qfit))[["tensionH"]]\n' +
            'ends <- exp(suppressMessages(confint(qfit)))["tensionH", ]\n' +
            'fewer <- function(r) sprintf("%.1f%%", 100 * (1 - r))\n' +
            'sentence <- sprintf("Looms at high tension had %s fewer breaks than looms at low tension, for the same wool (95%% CI %s to %s fewer).", fewer(ratio), fewer(ends[[2]]), fewer(ends[[1]]))\n' +
            'writeLines(strwrap(sentence, 64))\n',
          caption:
            'R writes the sentence, so no number in it was copied by hand. The upper end of the ratio is the smaller drop, so it comes first in the sentence. `suppressMessages()` keeps the profiling note out of the way, and `strwrap()` breaks the sentence into lines.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'three-comparisons',
            title: 'Two models, two kinds of interval',
            intro:
              'Choose the model and how the interval is built. R prints each comparison as a percentage change with its 95% interval. In the picture, each dot is an estimate, each vertical line its interval, and the flat line is no change.',
            template:
              'fit <- glm(breaks ~ wool + tension, family = ⟦family⟧, data = warpbreaks)\n' +
              'b <- coef(fit)[-1]\n' +
              'se <- summary(fit)$coefficients[-1, "Std. Error"]\n' +
              'ends <- ⟦method⟧\n' +
              'pct <- 100 * (exp(b) - 1)\n' +
              'lo <- 100 * (exp(ends[, 1]) - 1)\n' +
              'hi <- 100 * (exp(ends[, 2]) - 1)\n' +
              'what <- c("wool B against wool A", "medium against low tension", "high against low tension")\n' +
              'cat(sprintf("%-28s %+6.1f%%   (95%% CI %+6.1f%% to %+6.1f%%)\\n", what, pct, lo, hi), sep = "")\n' +
              'cat("\\nIntervals that include no change:", sum(lo < 0 & hi > 0), "of 3\\n")\n',
            knobs: [
              {
                id: 'family',
                label: 'the model',
                choices: [
                  { value: 'poisson', caption: 'Poisson' },
                  { value: 'quasipoisson', caption: 'quasi-Poisson' },
                ],
              },
              {
                id: 'method',
                label: 'how the interval is built',
                choices: [
                  { value: 'suppressMessages(confint(fit))[-1, ]', caption: 'profile, from confint()' },
                  { value: 'cbind(b - 1.96 * se, b + 1.96 * se)', caption: 'Wald, estimate ± 1.96 SE' },
                ],
              },
            ],
            notes: {
              '0-0': 'The Poisson model assumes the variance equals the mean. These counts vary far more than that, so its intervals are narrower than the data can support.',
              '1-0': 'Quasi-Poisson estimates how much more the counts vary and widens every interval to match. The estimates themselves do not move.',
            },
            probes: {
              wool: 'rbind(c(1, lo[1]), c(1, hi[1]))',
              medium: 'rbind(c(2, lo[2]), c(2, hi[2]))',
              high: 'rbind(c(3, lo[3]), c(3, hi[3]))',
              none: 'rbind(c(0.5, 0), c(3.5, 0))',
              est: 'cbind(1:3, pct)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'the comparisons, in the order printed',
              yLabel: '% change in breaks',
              caption: 'A dot for each estimate and a line for its 95% interval, as percentage changes.',
              series: [
                { probe: 'wool', label: 'wool B vs A' },
                { probe: 'medium', label: 'medium vs low tension' },
                { probe: 'high', label: 'high vs low tension' },
                { probe: 'none', label: 'no change' },
              ],
              marker: 'est',
            },
            takeaway:
              'Moving from Poisson to quasi-Poisson leaves every dot where it was and stretches every line: the Poisson intervals were too narrow for counts this spread out. With the wider intervals, the wool comparison reaches no change, which is why the `woolB` row of the quasi-Poisson summary has a p-value above 0.05. Yet nearly all of that interval still lies on the side of fewer breaks. Profile or Wald moves the ends only a little. The model you report decides what you can claim, so report the one whose spread matches the data.',
          },
        },
      ],
    },
    {
      id: 'predictions',
      title: 'Predictions for real cases',
      blocks: [
        {
          kind: 'prose',
          body:
            'Coefficients compare. Readers often want something more concrete: *how many breaks should we expect with wool B at medium tension?* That is a prediction, and it needs an interval too. The recipe is the same idea as before: do the arithmetic on the link scale, where the model is a straight line, and transform the two ends at the very end. Click a line to see what it does.',
        },
        {
          kind: 'annotate',
          code:
            `${QFIT}\n` +
            'new <- data.frame(wool = "B", tension = "M")\n' +
            'p <- predict(qfit, new, type = "link", se.fit = TRUE)\n' +
            'ends <- p$fit + c(-1.96, 1.96) * p$se.fit\n' +
            'exp(ends)\n' +
            'exp(p$fit)\n',
          notes: {
            '1': 'The model from the summary, fitted again: every block starts from an empty workspace.',
            '2': 'The case you want a prediction for. Every predictor in the model needs a column, spelled as it is in the data.',
            '3': '`type = "link"` asks for the answer on the log scale, where the model is a straight line. `se.fit = TRUE` adds the standard error of that prediction. The result is a list that holds `p$fit` and `p$se.fit`.',
            '4': 'The interval on the log scale: the prediction minus and plus 1.96 standard errors, both ends at once.',
            '5': 'Undo the log link on both ends. exp() never changes the order of two numbers, so the lower end stays the lower end.',
            '6': 'The predicted count itself, on the same scale as the ends. It lies inside the interval, closer to the lower end than to the upper one.',
          },
        },
        {
          kind: 'code',
          code:
            `${QFIT}\n` +
            'cases <- expand.grid(wool = c("A", "B"), tension = c("L", "M", "H"))\n' +
            'p <- predict(qfit, cases, type = "link", se.fit = TRUE)\n' +
            'cases$breaks <- exp(p$fit)\n' +
            'cases$lower <- exp(p$fit - 1.96 * p$se.fit)\n' +
            'cases$upper <- exp(p$fit + 1.96 * p$se.fit)\n' +
            'cases[3:5] <- round(cases[3:5], 1)\n' +
            'cases\n',
          caption:
            'All six settings, each with its expected number of breaks and a 95% interval. A small table like this is often the most useful thing in a report: it answers the question in counts. `expand.grid()` makes every combination of the values it is given.',
        },
        {
          kind: 'compare',
          caption:
            'The same three predictions two ways, with how far each interval reaches below and above the estimate.',
          left: {
            label: 'On the link scale, then exp()',
            code:
              `${QFIT}\n` +
              'new <- data.frame(wool = "B", tension = c("L", "M", "H"))\n' +
              'p <- predict(qfit, new, type = "link", se.fit = TRUE)\n' +
              'est <- exp(p$fit)\n' +
              'lower <- exp(p$fit - 1.96 * p$se.fit)\n' +
              'upper <- exp(p$fit + 1.96 * p$se.fit)\n' +
              'round(cbind(est, below = est - lower, above = upper - est), 2)\n',
          },
          right: {
            label: '± on the count scale',
            bad: true,
            code:
              `${QFIT}\n` +
              'new <- data.frame(wool = "B", tension = c("L", "M", "H"))\n' +
              'p <- predict(qfit, new, type = "response", se.fit = TRUE)\n' +
              'est <- p$fit\n' +
              'lower <- est - 1.96 * p$se.fit\n' +
              'upper <- est + 1.96 * p$se.fit\n' +
              'round(cbind(est, below = est - lower, above = upper - est), 2)\n',
          },
        },
        {
          kind: 'prose',
          body:
            'The estimates agree, and the intervals do not. Built on the log scale, each interval reaches further above the estimate than below it. Built with ± on the count scale, the two sides are equal by construction, as if a count were as free to fall as to rise.\n\n' +
            'Here the difference is modest, because these counts are well away from zero. The closer a prediction gets to a limit (zero for a count, 0 or 1 for a probability), the more it matters, until a ± interval runs past the limit into values that cannot happen. The next section shows one that does.',
        },
        {
          kind: 'quiz',
          prompt: 'The table above gives wool B at high tension a 95% interval. What does that interval describe?',
          options: [
            {
              text: 'The expected number of breaks, averaged over many looms run at those settings',
              correct: true,
              why: 'A confidence interval from `predict()` is for the mean count at those settings: where the model\'s average could plausibly be.',
            },
            {
              text: 'The range the next loom\'s count will fall in, 95% of the time',
              why: 'That would be a prediction interval for one loom, which also has to allow for how much single counts scatter around the mean. It has to be wider, and it is not what `se.fit` gives you.',
            },
            {
              text: 'The chance that the true count lies in the interval is 95%',
              why: 'The 95% belongs to the method: intervals built this way catch the true mean in 95% of samples. And it is about the mean count, not any one loom\'s count.',
            },
          ],
        },
      ],
    },
    {
      id: 'odds-and-chances',
      title: 'Odds are not chances',
      blocks: [
        {
          kind: 'prose',
          body:
            'Everything so far had a log link, where a coefficient multiplies a count. Logistic regression has a logit link, and exp(b) multiplies the **odds**. That still makes a tidy sentence ("each extra 100 pounds multiplies the odds of a manual gearbox by this much"), but it sets a trap: most readers hear "odds" as "chance", and an odds ratio is not a ratio of chances. The fix is to translate into **chances for cases the reader can picture**.\n\n' +
            'The example is the one from the logistic regression lesson: whether a car in `mtcars` has a manual gearbox (`am`), modelled by its weight in thousands of pounds (`wt`).',
        },
        {
          kind: 'shell',
          lines: [
            LOGIT,
            'exp(0.1 * coef(fit)[["wt"]])',
            'predict(fit, data.frame(wt = c(2.5, 3.5)), type = "response")',
          ],
          caption: 'The odds ratio for 100 pounds, then the chance of a manual gearbox for a car of 2,500 pounds and one of 3,500.',
        },
        {
          kind: 'predict',
          code:
            `${LOGIT}\n` +
            'p <- predict(fit, data.frame(wt = c(2.5, 2.6, 4.5, 4.6)), type = "response")\n' +
            'odds <- p / (1 - p)\n' +
            'isTRUE(all.equal(odds[2] / odds[1], odds[4] / odds[3], check.attributes = FALSE))\n' +
            'isTRUE(all.equal(p[2] - p[1], p[4] - p[3], check.attributes = FALSE))\n',
          ask: 'Two steps of 100 pounds: from 2,500 to 2,600, and from 4,500 to 4,600. The first line asks whether both steps multiply the odds by the same factor. The second asks whether both change the chance by the same amount.',
          choices: [
            '[1] TRUE\n[1] TRUE',
            '[1] TRUE\n[1] FALSE',
            '[1] FALSE\n[1] TRUE',
            '[1] FALSE\n[1] FALSE',
          ],
        },
        {
          kind: 'code',
          code:
            `${LOGIT}\n` +
            'or <- exp(0.1 * coef(fit)[["wt"]])\n' +
            'p <- predict(fit, data.frame(wt = c(2.5, 3.5)), type = "response")\n' +
            'odds_words <- sprintf("Each extra 100 pounds multiplied the odds of a manual gearbox by %.2f.", or)\n' +
            'chance_words <- sprintf("The model puts the chance of a manual gearbox at %.0f%% for a 2,500 lb car, and at %.0f%% for a 3,500 lb car.", 100 * p[[1]], 100 * p[[2]])\n' +
            'writeLines(strwrap(c(odds_words, "", chance_words), 64))\n',
          caption:
            'Both sentences are true. The first is about odds, which a reader will probably take for chances. The second gives chances for two cars they can picture, which is what a reader outside statistics can use.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'chance-by-weight',
            title: 'A chance, and an interval that stays possible',
            intro:
              'Drag the weight to pick a car, and choose how the 95% interval is built. R prints the chance of a manual gearbox for that car, with its interval. The picture shows the fitted chance across the weights in the data, the two ends of the interval as lines, and each car in the data as a dot at 0 (automatic) or 1 (manual).',
            template:
              `${LOGIT}\n` +
              'wt <- ⟦hundreds⟧ / 10\n' +
              'grid <- data.frame(wt = seq(1.5, 5.4, by = 0.1))\n' +
              'link_then_plogis <- function(new) { p <- predict(fit, new, type = "link", se.fit = TRUE); cbind(plogis(p$fit), plogis(p$fit - 1.96 * p$se.fit), plogis(p$fit + 1.96 * p$se.fit)) }\n' +
              'plus_minus_on_chance <- function(new) { p <- predict(fit, new, type = "response", se.fit = TRUE); cbind(p$fit, p$fit - 1.96 * p$se.fit, p$fit + 1.96 * p$se.fit) }\n' +
              'interval <- ⟦method⟧\n' +
              'car <- interval(data.frame(wt = wt))\n' +
              'curve <- round(interval(grid), 4)\n' +
              'cat("A car weighing", format(1000 * wt, big.mark = ","), "lb\\n")\n' +
              'cat(sprintf("Chance of a manual gearbox: %.1f%%\\n", 100 * car[1]))\n' +
              'cat(sprintf("95%% interval: %.1f%% to %.1f%%\\n", 100 * car[2], 100 * car[3]))\n' +
              'if (car[2] < 0 || car[3] > 1) cat("This interval runs outside 0% to 100%, where no chance can be.\\n")\n',
            knobs: [
              { id: 'hundreds', kind: 'range', label: 'the car\'s weight, in hundreds of pounds', min: 20, max: 40, start: 30 },
              {
                id: 'method',
                label: 'how the interval is built',
                choices: [
                  { value: 'link_then_plogis', caption: 'on the log-odds scale, then plogis()' },
                  { value: 'plus_minus_on_chance', caption: '± on the chance scale' },
                ],
              },
            ],
            probes: {
              chance: 'cbind(grid$wt, curve[, 1])',
              lower: 'cbind(grid$wt, curve[, 2])',
              upper: 'cbind(grid$wt, curve[, 3])',
              here: 'rbind(c(wt, car[1]))',
              cars: 'cbind(mtcars$wt, mtcars$am)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'weight, thousands of lb',
              yLabel: 'chance of a manual gearbox',
              caption: 'The fitted chance with the two ends of its 95% interval. The dot on the curve is the car you picked.',
              series: [
                { probe: 'chance', label: 'fitted chance' },
                { probe: 'lower', label: 'lower end' },
                { probe: 'upper', label: 'upper end' },
              ],
              marker: 'here',
              points: 'cars',
            },
            takeaway:
              'Built on the log-odds scale and transformed, the interval bends with the curve and never goes below 0 or above 1, at any weight. Built with ± on the chance scale, it reaches as far above the estimate as below, and towards either end of the slider it runs past 0 or past 1: an interval that includes chances that cannot exist. Report the first kind, and report it as a chance for a car the reader can picture.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Which sentence belongs in a report for a reader who is not a statistician? (P, Q and k stand for numbers R would fill in.)',
          options: [
            {
              text: 'A 3,500 lb car had about a P% chance of a manual gearbox, against Q% for a 2,500 lb car',
              correct: true,
              why: 'Chances for cars the reader can picture, from `predict()` with `type = "response"`. Add each one\'s interval, built on the log-odds scale, and it is complete.',
            },
            {
              text: 'Each extra 100 pounds made a car k times as likely to have a manual gearbox, where k is the odds ratio',
              why: 'That turns an odds ratio into a ratio of chances, which it is not. "Times as likely" is about probabilities; the model\'s ratio is about odds.',
            },
            {
              text: 'Each extra 100 pounds lowered the chance of a manual gearbox by the same amount',
              why: 'The predict block above says otherwise: the same 100 pounds changes the chance by different amounts at different weights. Only the odds ratio stays the same.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-not-to-say',
      title: 'What not to say',
      blocks: [
        {
          kind: 'prose',
          body:
            'A report can get every number right and still claim something the analysis cannot support. Four such claims come up again and again. Match each sentence to what is wrong with it.',
        },
        {
          kind: 'match',
          ask: 'Match each sentence to its flaw.',
          pairs: [
            { left: 'There is almost no chance that tension makes no difference', right: 'A p-value is not the probability that a hypothesis is true' },
            { left: 'Wool type makes no difference to breaks', right: '"Not significant" is not the same as "no effect"' },
            { left: 'Taking weight off a car would make it more likely to be manual', right: 'The cars were observed, not changed: association is not cause' },
            { left: 'A 7,000 lb car has almost no chance of being manual', right: 'No car in the data weighs that much' },
          ],
        },
        {
          kind: 'code',
          code:
            `${QFIT}\n` +
            'ratio <- exp(coef(qfit))[["woolB"]]\n' +
            'ends <- exp(suppressMessages(confint(qfit)))["woolB", ]\n' +
            'change <- function(r) sprintf("%.1f%% %s", abs(100 * (r - 1)), if (r < 1) "fewer" else "more")\n' +
            'verdict <- if (ends[[1]] < 1 && ends[[2]] > 1) "so the data cannot rule out no difference, and cannot rule out a sizeable reduction either." else "so the data rule out no difference."\n' +
            'sentence <- sprintf("Wool B had %s breaks than wool A, for the same tension. The 95%% interval runs from %s to %s, %s", change(ratio), change(ends[[1]]), change(ends[[2]]), verdict)\n' +
            'writeLines(strwrap(sentence, 64))\n',
          caption:
            'The honest version of "wool makes no difference": the estimate, the interval, and what the interval allows. R chooses the last clause by checking whether the interval includes a ratio of 1.',
        },
        {
          kind: 'quiz',
          prompt: 'In the quasi-Poisson summary, the `woolB` p-value is above 0.05. Which conclusion is right?',
          options: [
            {
              text: 'The data cannot rule out no difference between the wools, and cannot rule out a sizeable one either',
              correct: true,
              why: 'That is what an interval stretching from a large reduction to about no change says. Report the interval rather than a verdict.',
            },
            {
              text: 'Wool type has no effect on breaks',
              why: 'Not finding evidence of an effect is not evidence that there is none. The best estimate is a reduction, and most of the interval is reductions.',
            },
            {
              text: 'The p-value is the chance that wool has no effect',
              why: 'A p-value is worked out by assuming there is no effect, so it cannot also be the chance of that assumption. It is how surprising data like these would be if the wools were the same.',
            },
          ],
        },
        {
          kind: 'shell',
          lines: [
            LOGIT,
            'range(mtcars$wt)',
            'predict(fit, data.frame(wt = 7), type = "response")',
          ],
          caption:
            'R answers the question about a 7,000 lb car without a warning. The heaviest car in the data is the second number `range()` printed, so that answer is the fitted curve carried on past every car the model has seen. Say what range your predictions hold for, and stay inside it.',
        },
      ],
    },
    {
      id: 'your-turn',
      title: 'Your turn',
      blocks: [
        {
          kind: 'shell',
          lines: [
            QFIT,
            'family(qfit)$linkinv(c(0, 1, 2))',
            'exp(c(0, 1, 2))',
            LOGIT,
            'family(fit)$linkinv(c(-2, 0, 2))',
            'plogis(c(-2, 0, 2))',
          ],
          caption: 'Every fitted glm carries its own inverse link, `family(fit)$linkinv`, which undoes the link whichever family it is. Compare each one with the function it stands for.',
        },
        {
          kind: 'task',
          prompt:
            'Write a function `ci_response(fit, newdata)` that takes a fitted glm and a data frame with **one row**, and returns a 95% confidence interval for the prediction on the response scale: a vector of two numbers, the lower end and then the upper end.\n\n' +
            'Build it the right way: predict on the link scale with its standard error, take the prediction minus and plus 1.96 standard errors, then undo the link on both ends with `family(fit)$linkinv`, so the same function works for a log link and a logit link.',
          run: 'function',
          fnName: 'ci_response',
          starter:
            'ci_response <- function(fit, newdata) {\n' +
            '  # 1. predict on the link scale, with its standard error\n' +
            '  # 2. the prediction minus and plus 1.96 standard errors\n' +
            '  # 3. undo the link on both ends\n' +
            '}\n',
          solution:
            'ci_response <- function(fit, newdata) {\n' +
            '  p <- predict(fit, newdata, type = "link", se.fit = TRUE)\n' +
            '  ends <- p$fit + c(-1.96, 1.96) * p$se.fit\n' +
            '  family(fit)$linkinv(ends)\n' +
            '}\n',
          tests: [
            {
              id: 'loom', label: 'wool B at medium tension, quasi-Poisson', hidden: false,
              setup: QFIT,
              call: 'ci_response(qfit, data.frame(wool = "B", tension = "M"))',
              expect: 'local({ f <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks); p <- predict(f, data.frame(wool = "B", tension = "M"), se.fit = TRUE); exp(p$fit + c(-1.96, 1.96) * p$se.fit) })',
              cmp: 'float',
            },
            {
              id: 'car', label: 'a 3,000 lb car, logistic', hidden: false,
              setup: LOGIT,
              call: 'ci_response(fit, data.frame(wt = 3))',
              expect: 'local({ f <- glm(am ~ wt, family = binomial, data = mtcars); p <- predict(f, data.frame(wt = 3), se.fit = TRUE); plogis(p$fit + c(-1.96, 1.96) * p$se.fit) })',
              cmp: 'float',
            },
            {
              id: 'heavy-car', label: 'a 4,000 lb car: the lower end must stay above 0', hidden: true,
              setup: LOGIT,
              call: 'ci_response(fit, data.frame(wt = 4))',
              expect: 'local({ f <- glm(am ~ wt, family = binomial, data = mtcars); p <- predict(f, data.frame(wt = 4), se.fit = TRUE); plogis(p$fit + c(-1.96, 1.96) * p$se.fit) })',
              cmp: 'float',
            },
            {
              id: 'insects', label: 'spray C in a Poisson model of InsectSprays', hidden: true,
              setup: 'sfit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'ci_response(sfit, data.frame(spray = "C"))',
              expect: 'local({ f <- glm(count ~ spray, family = poisson, data = InsectSprays); p <- predict(f, data.frame(spray = "C"), se.fit = TRUE); exp(p$fit + c(-1.96, 1.96) * p$se.fit) })',
              cmp: 'float',
            },
          ],
          hint: '`p <- predict(fit, newdata, type = "link", se.fit = TRUE)` gives a list, and `p$fit` and `p$se.fit` are the two numbers you need. `c(-1.96, 1.96)` makes both ends in one line.',
        },
      ],
    },
    {
      id: 'the-paragraph',
      title: 'From summary() to a paragraph',
      blocks: [
        {
          kind: 'prose',
          body:
            'Here is the whole analysis as a reader would get it: what was done and why, what was found with its size and interval, what was not found, what the model assumes, and two predictions a manager could plan around. R writes every number, so if the data change, the paragraph changes with them.',
        },
        {
          kind: 'code',
          code:
            `${QFIT}\n` +
            'rr <- exp(coef(qfit))\n' +
            'ci <- exp(suppressMessages(confint(qfit)))\n' +
            'pc <- function(r) sprintf("%.1f%%", abs(100 * (r - 1)))\n' +
            'cases <- data.frame(wool = c("A", "B"), tension = c("L", "H"))\n' +
            'p <- predict(qfit, cases, type = "link", se.fit = TRUE)\n' +
            'est <- exp(p$fit)\n' +
            'lo <- exp(p$fit - 1.96 * p$se.fit)\n' +
            'hi <- exp(p$fit + 1.96 * p$se.fit)\n' +
            'text <- c(\n' +
            '  sprintf("We counted warp breaks on %d looms, each weaving the same length of yarn, and modelled the counts with a quasi-Poisson regression on wool and tension, because their variance was about %.1f times what a Poisson model allows.", nrow(warpbreaks), summary(qfit)$dispersion),\n' +
            '  sprintf("For the same wool, looms at high tension had %s fewer breaks than at low tension (95%% CI %s to %s fewer), and looms at medium tension %s fewer (%s to %s fewer).", pc(rr[["tensionH"]]), pc(ci["tensionH", 2]), pc(ci["tensionH", 1]), pc(rr[["tensionM"]]), pc(ci["tensionM", 2]), pc(ci["tensionM", 1])),\n' +
            '  sprintf("Wool B had %s fewer breaks than wool A, but the interval runs from %s fewer to %s more, so these data cannot settle whether the wools differ.", pc(rr[["woolB"]]), pc(ci["woolB", 1]), pc(ci["woolB", 2])),\n' +
            '  "The model assumes tension has the same proportional effect on both wools.",\n' +
            '  sprintf("It expects about %.0f breaks per loom (95%% CI %.0f to %.0f) for wool A at low tension, and about %.0f (%.0f to %.0f) for wool B at high tension.", est[1], lo[1], hi[1], est[2], lo[2], hi[2])\n' +
            ')\n' +
            'writeLines(strwrap(paste(text, collapse = " "), 68))\n',
          caption:
            'Every number in the paragraph comes from the fitted model. The wool sentence is worded for an interval that crosses no change; the "What not to say" section showed R checking that before choosing its words.',
        },
        {
          kind: 'steps',
          title: 'Writing up a GLM',
          items: [
            'Say what was measured, on what, and which model you fitted and why: the family, the link, and any check that led you there, such as the dispersion.',
            'For each comparison, name the variable, the baseline or the step, the direction and the size, on the reader\'s scale: `100 * (exp(b) - 1)` for a log link, chances from `predict(type = "response")` for a logit link.',
            'Give a 95% interval on that same scale: `exp(confint(fit))`, or the exponentiated ends of the estimate ± 1.96 SE. Say which.',
            'Give predictions for a few cases the reader cares about, each with an interval built on the link scale and transformed at the end.',
            'Report what was not found as an interval, never as "no effect".',
            'Stay inside the range of the data, say what the model assumes, and write "associated with" unless the design lets you say "caused".',
            'Let R write the numbers into the sentences, so nothing is copied by hand.',
          ],
        },
      ],
    },
  ],
};

export default lesson;
