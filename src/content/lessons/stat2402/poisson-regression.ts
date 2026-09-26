// Poisson regression: the generalised linear model for counts.
//
// The third STAT2402 lesson. Same discipline as the exemplar: every number a reader sees was printed by
// R, and the prose points at it rather than typing it. The two ideas a student has to leave with are the
// log link (why a predicted count can never go below zero) and the rate ratio (why a coefficient is read
// as "this many times the baseline", not "this many more"). Overdispersion is the next lesson's; this
// one only says the mean-equals-variance assumption will be checked there.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'poisson-regression',
  title: 'Counting things: Poisson regression',
  summary: 'Counts are whole numbers that never go below zero: the Poisson distribution, the log link, rate ratios and offsets, fitted with glm() in R',
  track: 'stat2402',
  order: 5,
  minutes: 18,
  prereqs: ['logistic-regression'],
  outcomes: [
    'Say what makes a count different from a measurement, and what `dpois()` gives',
    'Explain why the log link keeps every predicted count above zero',
    'Fit a Poisson model with `glm(..., family = poisson)` and read its coefficients as log rate ratios',
    'Turn coefficients into rate ratios with `exp()` and say them as "times the baseline"',
    'Get predicted counts with `predict(type = "response")`',
    'Model counts watched for unequal lengths of time with an offset',
  ],
  sections: [
    {
      id: 'counts-are-different',
      title: 'What makes a count different',
      blocks: [
        {
          kind: 'prose',
          body:
            'A lot of what gets measured in the world is a count: insects on a plant, crashes at an intersection, faults in a length of cable, goals in a match. Counts break the normal model in their own way, and Poisson regression is the generalised linear model built for them.\n\n' +
            'The data is `InsectSprays`, which ships with R: the number of insects found on field plots, each plot treated with one of six sprays labelled A to F.',
        },
        {
          kind: 'code',
          code: 'head(InsectSprays)\ntable(InsectSprays$spray)\n',
          caption: '`table()` counts how many plots were given each spray.',
        },
        {
          kind: 'prose',
          body:
            'Three things set a count apart from a measurement like a stopping distance:\n\n' +
            '- it is a **whole number**: 0, 1, 2 and so on;\n' +
            '- it can **never go below zero**;\n' +
            '- its **spread grows with its mean**: where counts are large, they also vary a lot.\n\n' +
            'The last one is easiest to see in the data. Here is each spray\'s average count next to the variance of its counts.',
        },
        {
          kind: 'code',
          code:
            'means <- tapply(InsectSprays$count, InsectSprays$spray, mean)\n' +
            'variances <- tapply(InsectSprays$count, InsectSprays$spray, var)\n' +
            'cbind(means, variances)\n',
          caption: '`tapply(x, group, f)` applies `f` to `x` one group at a time.',
        },
        {
          kind: 'prose',
          body:
            'The sprays with small averages have small variances, and the sprays with large averages vary far more. A linear model gives every group the same spread, which these counts do not have.',
        },
        {
          kind: 'quiz',
          prompt: 'If you fitted `lm(count ~ spray, data = InsectSprays)`, which of its assumptions does that table argue against?',
          options: [
            { text: 'That every spray\'s counts scatter by the same amount around their mean', correct: true, why: 'A linear model assumes one error variance for everyone. Here the variance climbs with the mean, so spray C\'s counts and spray F\'s cannot share one spread.' },
            { text: 'That the fitted mean for a spray can be a fraction', why: 'That is not a problem at all. Each plot\'s count is a whole number, but an average of whole numbers need not be, and a Poisson model predicts fractional means too.' },
            { text: 'That the sprays can be compared with each other', why: 'Comparing groups is exactly what both models do. The trouble is how the counts spread around each group\'s mean, not whether groups can be compared.' },
          ],
        },
      ],
    },
    {
      id: 'the-poisson-distribution',
      title: 'The Poisson distribution',
      blocks: [
        {
          kind: 'prose',
          body:
            'The **Poisson distribution** is the standard model for a count of events that happen independently of each other: insects landing on a plot, earthquakes in a year, typos on a page. It has one parameter, its mean, written λ (lambda). `dpois(k, lambda)` gives the probability of a count of exactly `k`.\n\n' +
            'Its defining property is that the **variance equals the mean**. If Y is Poisson with mean λ, then E[Y] = λ and Var[Y] = λ. That is the "spread grows with the mean" from the table above, built into the model.',
        },
        {
          kind: 'shell',
          lines: [
            'dpois(0:6, lambda = 3)',
            'sum(dpois(0:100, lambda = 3))',
            'k <- 0:100',
            'sum(k * dpois(k, lambda = 3))',
            'sum((k - 3)^2 * dpois(k, lambda = 3))',
          ],
          caption: 'The probabilities of every count add to 1. Weighting each count by its probability gives the mean; weighting each squared distance from 3 gives the variance. `0:100` stands in for every count: with a mean of 3, the ones left out are vanishingly rare.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'poisson-shape',
            title: 'The shape of a Poisson count',
            intro: 'Drag the slider to change λ, the mean count. The bars are the chance of each count from 0 to 15. Watch where the chance piles up, and compare the mean and the variance R works out from the probabilities.',
            template:
              'lambda <- ⟦halves⟧ / 2\n' +
              'counts <- 0:15\n' +
              'chance <- round(100 * dpois(counts, lambda))\n' +
              'cat("lambda:", lambda, "\\n")\n' +
              'cat("chance of a count of zero: ", round(100 * dpois(0, lambda), 1), "%\\n", sep = "")\n' +
              'k <- 0:100\n' +
              'p <- dpois(k, lambda)\n' +
              'cat("mean of Y:    ", sum(k * p), "\\n")\n' +
              'cat("variance of Y:", sum((k - sum(k * p))^2 * p), "\\n")\n',
            knobs: [
              { id: 'halves', kind: 'range', label: 'the mean λ, counted in halves', min: 1, max: 16, start: 6 },
            ],
            probes: {
              chance: 'chance',
              counts: 'as.character(counts)',
            },
            visual: {
              kind: 'bars',
              values: 'chance',
              labels: 'counts',
              max: 65,
              caption: 'The chance of each count, in whole percent.',
            },
            takeaway:
              'Near the left end of the slider the chance piles up at zero and one, and the bars trail off to the right: a count cannot go below zero, so the distribution is lopsided. As λ grows the bars spread out and flatten, and the shape evens out. Whatever λ you pick, the mean and the variance R works out are the same number, λ itself. That is the assumption a Poisson model makes about your data, and the next lesson is about checking it.',
          },
        },
      ],
    },
    {
      id: 'the-log-link',
      title: 'The log link',
      blocks: [
        {
          kind: 'prose',
          body:
            'A Poisson regression does not model the mean count μ as a straight line. It models the **log** of the mean:\n\n' +
            'log(μ) = β₀ + β₁x\n\n' +
            'Undo the log and μ = exp(β₀ + β₁x). Whatever number the right-hand side comes to, `exp()` of it is above zero, so a predicted count can never be negative. This is the **log link**, and it is the link R\'s Poisson family uses unless you ask for another: `poisson()$link` says which.',
        },
        {
          kind: 'prose',
          body:
            'The `quakes` data is a set of earthquakes near Fiji, with each one\'s magnitude (`mag`) and the number of seismic stations that detected it (`stations`), which is a count. Fit a straight line and a Poisson model, then ask both about quakes down to magnitude 3, below the smallest in the data.',
        },
        {
          kind: 'compare',
          caption: 'The same question to both models: how many stations would detect a quake of magnitude 3, 4 or 5?',
          left: {
            label: 'A straight line',
            bad: true,
            code: 'fit <- lm(stations ~ mag, data = quakes)\npredict(fit, data.frame(mag = c(3, 4, 5)))\n',
          },
          right: {
            label: 'Poisson, log link',
            code: 'fit <- glm(stations ~ mag, family = poisson, data = quakes)\npredict(fit, data.frame(mag = c(3, 4, 5)), type = "response")\n',
          },
        },
        {
          kind: 'prose',
          body:
            'The log link changes what a coefficient does, too. Adding β₁ to log(μ) is the same as **multiplying** μ by exp(β₁). So each extra unit of `mag` multiplies the expected count by the same factor, rather than adding the same amount.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(stations ~ mag, family = poisson, data = quakes)',
            'poisson()$link',
            'mu <- predict(fit, data.frame(mag = c(4, 5, 6)), type = "response")',
            'mu',
            'mu[2] / mu[1]',
            'mu[3] / mu[2]',
            'exp(coef(fit)["mag"])',
          ],
          caption: 'Each step of one magnitude unit multiplies the expected number of stations by the same factor, and that factor is `exp()` of the coefficient.',
        },
        {
          kind: 'quiz',
          prompt: 'Why can a Poisson regression never predict a negative count, however far you go outside the data?',
          options: [
            { text: 'It predicts exp() of a linear predictor, and exp() of any number is above zero', correct: true, why: 'The straight line lives on the log scale, where it can go as low as it likes. Undoing the log with exp() always lands above zero.' },
            { text: 'R replaces any negative prediction with zero', why: 'Nothing is replaced. A straight line on the log scale, undone with exp(), cannot produce a negative number in the first place.' },
            { text: 'The quakes data has no negative counts in it', why: 'A linear model fitted to the same data had no negative counts either, and it still predicted some. The guarantee comes from the link, not the data.' },
          ],
        },
      ],
    },
    {
      id: 'fitting-the-model',
      title: 'Fitting it with glm()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`glm()` fits generalised linear models. The formula works exactly as it did for `lm()`. What is new is `family`, which says what kind of response this is: `family = poisson` means counts, a Poisson spread, and the log link.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\nsummary(fit)\n',
        },
        {
          kind: 'prose',
          body:
            'Much of this looks like the `lm()` summary. `spray` is a factor, so R has made its first level, A, the **baseline**: there is no row for spray A, and every other spray gets a coefficient comparing it with A. Every estimate is on the log scale. These are the parts that are new:',
        },
        {
          kind: 'table',
          caption: 'What the parts of a Poisson summary() mean, where they differ from lm().',
          head: ['Part', 'What it means'],
          rows: [
            ['Estimate', 'On the log scale: the intercept is the log of the baseline\'s mean count, and each spray\'s estimate is the log of a ratio of means'],
            ['z value', 'Estimate divided by its standard error, judged against a normal distribution rather than a t distribution'],
            ['Pr(>|z|)', 'The p-value for "this coefficient is really zero", which on the log scale means "this spray has the same mean count as the baseline"'],
            ['Dispersion parameter ... taken to be 1', 'The model assumes the variance equals the mean. The next lesson checks whether it does'],
            ['Null deviance', 'How badly a model with a single mean shared by all the plots fits'],
            ['Residual deviance', 'How badly this model fits. The drop from the null deviance is what the sprays account for'],
            ['AIC', 'For comparing models fitted to the same data; smaller is better'],
            ['Fisher Scoring iterations', 'How many rounds of fitting it took: glm() finds its estimates step by step rather than from a formula'],
          ],
        },
        {
          kind: 'compare',
          caption: 'The same formula with and without `family`. Look at the family and link each one reports, and at the coefficients.',
          left: {
            label: 'family left out',
            bad: true,
            code: 'fit <- glm(count ~ spray, data = InsectSprays)\nfamily(fit)\ncoef(fit)\n',
          },
          right: {
            label: 'family = poisson',
            code: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\nfamily(fit)\ncoef(fit)\n',
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Always say the family',
          body:
            'Without `family`, `glm()` fits a normal model with an identity link: the ordinary linear model, with every problem the first section listed. It runs without complaint, so the only sign is in the output. Check that `family(fit)` names the family you meant.',
        },
      ],
    },
    {
      id: 'rate-ratios',
      title: 'Coefficients as rate ratios',
      blocks: [
        {
          kind: 'prose',
          body:
            'On the log scale the model for spray A\'s plots is log(μ_A) = β₀, and for spray C\'s it is log(μ_C) = β₀ + β_C. Subtract one from the other:\n\n' +
            'β_C = log(μ_C) − log(μ_A) = log(μ_C / μ_A)\n\n' +
            'So each spray\'s coefficient is the **log of a ratio of mean counts**, that spray against the baseline, and `exp()` turns it back into the ratio itself: a **rate ratio**. A rate ratio above 1 means more insects than the baseline; below 1, fewer.',
        },
        {
          kind: 'predict',
          code: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\nexp(coef(fit)) > 1\n',
          ask: 'Which rate ratios are above 1? Use the signs of the estimates in `summary(fit)`, or the spray averages from the first section.',
          choices: [
            '(Intercept)      sprayB      sprayC      sprayD      sprayE      sprayF\n       TRUE        TRUE       FALSE       FALSE       FALSE        TRUE',
            '(Intercept)      sprayB      sprayC      sprayD      sprayE      sprayF\n       TRUE        TRUE        TRUE        TRUE        TRUE        TRUE',
            '(Intercept)      sprayB      sprayC      sprayD      sprayE      sprayF\n       TRUE       FALSE        TRUE        TRUE        TRUE       FALSE',
          ],
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
            'exp(coef(fit))',
            'means <- tapply(InsectSprays$count, InsectSprays$spray, mean)',
            'means / means[["A"]]',
            'exp(confint(fit))',
          ],
          caption: 'The rate ratios, then each spray\'s average divided by spray A\'s. `exp(confint(fit))` puts the 95% intervals on the same ratio scale, so a spray whose interval stays clear of 1 differs from spray A.',
        },
        {
          kind: 'prose',
          body:
            'Read a rate ratio as multiplication: "plots given spray C are expected to have this many times the insects of plots given spray A". The intercept is the exception: `exp()` of it is not a ratio but spray A\'s mean count itself, because A is what everything else is compared with.\n\n' +
            'Nothing about the data made A the baseline; R picked the first level. Pick a different one with `relevel()` and see what changes.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'choose-baseline',
            title: 'Which spray is the baseline?',
            intro: 'Choose the baseline spray. The model is refitted each time. Watch the rate ratios, and then the fitted mean for each spray and the residual deviance underneath them.',
            template:
              'sprays <- InsectSprays\n' +
              'sprays$spray <- relevel(sprays$spray, ref = "⟦ref⟧")\n' +
              'fit <- glm(count ~ spray, family = poisson, data = sprays)\n' +
              'cat("Baseline: spray", levels(sprays$spray)[1], "\\n\\n")\n' +
              'print(round(exp(coef(fit)), 3))\n' +
              'cat("\\nFitted mean count, spray by spray:\\n")\n' +
              'print(round(tapply(fitted(fit), as.character(sprays$spray), mean), 3))\n' +
              'cat("\\nResidual deviance:", round(deviance(fit), 2), "\\n")\n',
            knobs: [
              {
                id: 'ref',
                label: 'the baseline spray',
                choices: [
                  { value: 'A', caption: 'spray A (the default)' },
                  { value: 'C', caption: 'spray C' },
                  { value: 'F', caption: 'spray F' },
                ],
              },
            ],
            probes: {
              ratio: '{ r <- exp(coef(fit)); r[1] <- 1; names(r) <- levels(sprays$spray); unname(round(r[sort(names(r))], 2)) }',
              spray: 'sort(levels(sprays$spray))',
            },
            visual: {
              kind: 'bars',
              values: 'ratio',
              labels: 'spray',
              caption: 'Each spray\'s expected count as a multiple of the baseline\'s. The baseline\'s own bar is 1.',
            },
            takeaway:
              'Every coefficient changes when the baseline does, yet the fitted mean for each spray and the residual deviance stay exactly the same. It is one fit, described from a different starting point. Choose the baseline that makes the comparisons you care about, such as a control or the spray currently in use, and say which one it is whenever you quote a rate ratio.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'With spray A as the baseline, `exp()` of the `sprayC` coefficient is well below 1. Which sentence says what it means?',
          options: [
            { text: 'Plots given spray C are expected to have that fraction of the insects found on plots given spray A', correct: true, why: 'A rate ratio multiplies the baseline\'s mean. Below 1 means fewer insects than spray A, by that factor.' },
            { text: 'Plots given spray C are expected to have that many fewer insects than plots given spray A', why: 'That reads the ratio as a difference. With the log link, effects multiply: spray C\'s mean is spray A\'s mean times the ratio, not minus it.' },
            { text: 'Spray C kills that fraction of the insects on a plot', why: 'The model compares mean counts on plots given different sprays. It says nothing about how many insects a spray killed, only how many were found.' },
          ],
        },
      ],
    },
    {
      id: 'predictions',
      title: 'Predicted counts',
      blocks: [
        {
          kind: 'prose',
          body:
            '`predict()` on a Poisson model can answer on two scales: the log of the mean count, or the mean count itself. `type = "response"` asks for the count. Compare the three lines below.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
            'new <- data.frame(spray = c("A", "C"))',
            'predict(fit, new)',
            'exp(predict(fit, new))',
            'predict(fit, new, type = "response")',
          ],
          caption: 'Without `type`, `predict()` gives the linear predictor, which is on the log scale. `exp()` of it is the predicted count, which is what `type = "response"` gives directly.',
        },
        {
          kind: 'prose',
          body:
            'This model has one factor and nothing else, so it is worth putting its predicted count for each spray next to that spray\'s average count.',
        },
        {
          kind: 'code',
          code:
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
            'sprays <- data.frame(spray = levels(InsectSprays$spray))\n' +
            'predicted <- predict(fit, sprays, type = "response")\n' +
            'observed <- tapply(InsectSprays$count, InsectSprays$spray, mean)\n' +
            'cbind(observed, predicted)\n',
        },
        {
          kind: 'quiz',
          prompt: 'Why do the two columns agree?',
          options: [
            { text: 'Each spray has its own coefficient, so each spray\'s mean is free to fit its own twelve counts, and the Poisson fit for one group\'s mean is that group\'s average', correct: true, why: 'With one factor, the model has exactly one free mean per group. Maximum likelihood for a Poisson mean is the sample average, so the fitted means land on the group averages.' },
            { text: 'glm() works out group averages instead of fitting a model', why: 'It fits by maximum likelihood, the same way it would with any predictors. With a numeric predictor like `mag`, the fitted values are not averages of anything; they lie on a curve.' },
            { text: 'It is a coincidence of this data set', why: 'It happens for every Poisson model with one factor and an intercept, because every group has its own mean to fit. Add a second predictor and it generally stops happening.' },
          ],
        },
        {
          kind: 'match',
          ask: 'Match each expression to what it gives for a Poisson model.',
          pairs: [
            { left: 'coef(fit)', right: 'log rate ratios, and the log of the baseline mean' },
            { left: 'exp(coef(fit))', right: 'rate ratios, and the baseline mean' },
            { left: 'predict(fit, new)', right: 'the log of each predicted mean count' },
            { left: 'predict(fit, new, type = "response")', right: 'each predicted mean count' },
          ],
        },
      ],
    },
    {
      id: 'exposure',
      title: 'Counts over unequal time',
      blocks: [
        {
          kind: 'prose',
          body:
            'Counts often come from different amounts of watching. Here are six intersections, three with traffic signals and three with a roundabout, each watched for a different number of years; `count` is the crashes recorded in that time. A site watched for ten years can be expected to record more crashes than one watched for one, whatever its design, so raw counts compare the watching as much as the sites.',
        },
        {
          kind: 'code',
          code:
            'crashes <- data.frame(\n' +
            '  type = rep(c("roundabout", "signals"), each = 3),\n' +
            '  years = c(6, 8, 10, 1, 2, 3),\n' +
            '  count = c(13, 17, 24, 5, 9, 14)\n' +
            ')\n' +
            'crashes$per_year <- crashes$count / crashes$years\n' +
            'crashes\n',
          caption: 'The raw counts and the crashes per year can tell different stories.',
        },
        {
          kind: 'prose',
          body:
            'What you want to model is the **rate**, μ / t, where t is the time watched. On the log scale:\n\n' +
            'log(μ / t) = β₀ + β₁x, which rearranges to log(μ) = log(t) + β₀ + β₁x\n\n' +
            'log(t) is added to the model with its coefficient fixed at 1, so nothing is estimated for it. A term like that is an **offset**, and in a formula you write it as `offset(log(years))`.',
        },
        {
          kind: 'compare',
          caption: 'The same crashes, modelled as raw counts and as counts per year. Look at which side of 1 the `typesignals` ratio falls in each.',
          left: {
            label: 'Ignoring the years',
            bad: true,
            code:
              'crashes <- data.frame(\n' +
              '  type = rep(c("roundabout", "signals"), each = 3),\n' +
              '  years = c(6, 8, 10, 1, 2, 3),\n' +
              '  count = c(13, 17, 24, 5, 9, 14)\n' +
              ')\n' +
              'fit <- glm(count ~ type, family = poisson, data = crashes)\n' +
              'exp(coef(fit))\n',
          },
          right: {
            label: 'With an offset',
            code:
              'crashes <- data.frame(\n' +
              '  type = rep(c("roundabout", "signals"), each = 3),\n' +
              '  years = c(6, 8, 10, 1, 2, 3),\n' +
              '  count = c(13, 17, 24, 5, 9, 14)\n' +
              ')\n' +
              'fit <- glm(count ~ type + offset(log(years)), family = poisson, data = crashes)\n' +
              'exp(coef(fit))\n',
          },
        },
        {
          kind: 'prose',
          body:
            'With the offset, `exp()` of the intercept is the baseline\'s crashes **per year**, and the `typesignals` ratio compares rates rather than totals. A prediction now takes a value for `years` too, since the model predicts a count for however long you watch.',
        },
        {
          kind: 'shell',
          lines: [
            'crashes <- data.frame(type = rep(c("roundabout", "signals"), each = 3), years = c(6, 8, 10, 1, 2, 3), count = c(13, 17, 24, 5, 9, 14))',
            'fit <- glm(count ~ type + offset(log(years)), family = poisson, data = crashes)',
            'exp(coef(fit))',
            'tapply(crashes$count, crashes$type, sum) / tapply(crashes$years, crashes$type, sum)',
            'predict(fit, data.frame(type = "signals", years = c(1, 10)), type = "response")',
          ],
          caption: 'The roundabouts\' rate and the rate ratio for signals, then each design\'s total crashes over its total years watched, then the expected crashes at a signalled intersection over one year and over ten.',
        },
        {
          kind: 'quiz',
          prompt: 'Why write `offset(log(years))` rather than adding `log(years)` as an ordinary predictor?',
          options: [
            { text: 'An offset fixes its coefficient at 1, so twice the time means twice the expected count, and the other coefficients describe rates', correct: true, why: 'That is the assumption behind a rate: watch twice as long, expect twice as many. As a predictor, log(years) would get its own estimated coefficient, and the counts would no longer be read per year.' },
            { text: 'Because log() would fail if a site was watched for zero years', why: 'An offset takes the log too, and a site watched for no time at all has no count worth modelling. The difference is what happens to the coefficient, not the log.' },
            { text: 'An offset is estimated like any other term but left out of the output', why: 'Nothing is estimated for an offset. That is the whole point of it: its coefficient is fixed at 1 before the model is fitted.' },
          ],
        },
      ],
    },
    {
      id: 'your-turn',
      title: 'Your turn',
      blocks: [
        {
          kind: 'task',
          prompt:
            'Write a function `rate_ratio(fit, term)` that takes a fitted Poisson model and the name of one of its coefficients, such as `"sprayC"`, and returns that coefficient as a rate ratio: `exp()` of it, as a plain number.',
          run: 'function',
          fnName: 'rate_ratio',
          starter: 'rate_ratio <- function(fit, term) {\n  # pick out the coefficient called term and turn it into a rate ratio\n}\n',
          solution: 'rate_ratio <- function(fit, term) {\n  exp(coef(fit)[[term]])\n}\n',
          tests: [
            {
              id: 'spray-c', label: 'spray C against spray A', hidden: false,
              setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'rate_ratio(fit, "sprayC")',
              expect: 'mean(InsectSprays$count[InsectSprays$spray == "C"]) / mean(InsectSprays$count[InsectSprays$spray == "A"])',
              cmp: 'float',
            },
            {
              id: 'intercept', label: 'the intercept: spray A\'s own mean count', hidden: false,
              setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'rate_ratio(fit, "(Intercept)")',
              expect: 'mean(InsectSprays$count[InsectSprays$spray == "A"])',
              cmp: 'float',
            },
            {
              id: 'quakes', label: 'a numeric predictor in a different model', hidden: true,
              setup: 'quake_fit <- glm(stations ~ mag, family = poisson, data = quakes)',
              call: 'rate_ratio(quake_fit, "mag")',
              expect: 'exp(coef(glm(stations ~ mag, family = poisson, data = quakes))[["mag"]])',
              cmp: 'float',
            },
            {
              id: 'offset', label: 'a model with an offset', hidden: true,
              setup: 'crashes <- data.frame(type = rep(c("roundabout", "signals"), each = 3), years = c(6, 8, 10, 1, 2, 3), count = c(13, 17, 24, 5, 9, 14))\nrate_fit <- glm(count ~ type + offset(log(years)), family = poisson, data = crashes)',
              call: 'rate_ratio(rate_fit, "typesignals")',
              expect: '(28 / 6) / (54 / 24)',
              cmp: 'float',
            },
          ],
          hint: '`coef(fit)` is a named vector, so one coefficient can be picked out by its name. Double brackets, `[[ ]]`, give the number without the name.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'What the Poisson model is betting on',
          body:
            'Everything in this lesson rests on the Poisson assumption that each count\'s variance equals its mean. Look back at the table of means and variances in the first section with that in mind. Whether real counts live up to it, and what to do when they do not, is the next lesson.',
        },
      ],
    },
  ],
};

export default lesson;
