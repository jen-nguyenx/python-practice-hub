// Binomial proportions: successes out of n trials, the grouped form of logistic regression.
//
// Builds on logistic-regression (one yes/no per row) by putting many trials in each row: beetles killed
// out of beetles exposed. The beetle numbers are Bliss's 1935 dose-response data, typed in as a small
// data frame; the germination counts in the last section are a classic overdispersed binomial data set.
// Every block rebuilds its own data, because every block starts from an empty workspace, and the prose
// points at what R printed rather than typing any number R worked out.
import type { Lesson } from '../../lessonSchema.ts';

/** The beetle data, rebuilt at the top of every block that needs it. */
const BEETLES =
  'beetles <- data.frame(\n' +
  '  dose = c(1.6907, 1.7242, 1.7552, 1.7842, 1.8113, 1.8369, 1.8610, 1.8839),\n' +
  '  n = c(59, 60, 62, 56, 63, 59, 62, 60),\n' +
  '  killed = c(6, 13, 18, 28, 52, 53, 61, 60)\n' +
  ')\n';

const FIT = 'fit <- glm(cbind(killed, n - killed) ~ dose, family = binomial, data = beetles)\n';

/** Germination on 21 plates: two seed varieties, two root extracts. */
const SEEDS =
  'seeds <- data.frame(\n' +
  '  seed = rep(c("O75", "O73"), c(11, 10)),\n' +
  '  extract = rep(c("bean", "cucumber", "bean", "cucumber"), c(5, 6, 5, 5)),\n' +
  '  germinated = c(10, 23, 23, 26, 17, 5, 53, 55, 32, 46, 10, 8, 10, 8, 23, 0, 3, 22, 15, 32, 3),\n' +
  '  sown = c(39, 62, 81, 51, 39, 6, 74, 72, 51, 79, 13, 16, 30, 28, 45, 4, 12, 41, 30, 51, 7)\n' +
  ')\n';

/** The fitted curve over the whole slider, for a plot series. */
const CURVE = 'cbind(seq(1.65, 1.9, by = 0.005), predict(fit, data.frame(dose = seq(1.65, 1.9, by = 0.005)), type = "response"))';

const lesson: Lesson = {
  id: 'binomial-proportions',
  title: 'Successes out of n: binomial proportions',
  summary: 'Counts of successes out of a known number of trials: fitting them with cbind() or weights, reading fitted proportions, finding the dose that kills half, trying other links and handling extra spread',
  track: 'stat2402',
  order: 10,
  prereqs: ['logistic-regression', 'comparing-models'],
  minutes: 18,
  outcomes: [
    'Recognise data recorded as successes out of a number of trials, with 0/1 data as the case n = 1',
    'Fit a binomial glm with `cbind(successes, failures)`, or with a proportion and `weights = n`',
    'Get fitted proportions and expected counts with `predict(type = "response")`',
    'Estimate the dose at which half respond as −b0 / b1, with a standard error from `MASS::dose.p()`',
    'Compare logit, probit and cloglog links by AIC, and refit overdispersed counts with `quasibinomial`',
  ],
  sections: [
    {
      id: 'counts-out-of-n',
      title: 'Successes out of n',
      blocks: [
        {
          kind: 'prose',
          body:
            'Plenty of experiments do not record one yes or no per row. They record a **number of successes out of a number of trials**: seeds that germinated out of seeds sown, insects killed out of insects exposed, people with a disease out of people examined. Each row is a group, and the response comes in two parts: how many said yes, and how many there were.\n\n' +
            'That count has a ceiling, the number of trials, which is what separates it from the counts in the Poisson lesson. If every trial in a group has the same chance p, the number of successes follows a **binomial distribution**, and `glm()` with `family = binomial` models how p changes with the predictors. It is the logistic regression you already know, with more than one trial in each row.\n\n' +
            'Presence/absence data is the special case **n = 1**: one trial per row, so the count of successes is 0 or 1. Everything in this lesson applies to the 0/1 responses of the logistic regression lesson too.',
        },
        {
          kind: 'prose',
          body:
            'The example is a classic from 1935. Groups of flour beetles were exposed to carbon disulphide gas for five hours, each group at a different concentration, and the dead were counted. `dose` is the log, base 10, of the concentration in milligrams per litre: dose–response data are usually analysed on a log scale, because equal steps in log dose are equal multiples of the concentration.',
        },
        {
          kind: 'code',
          code: BEETLES + 'beetles$prop <- beetles$killed / beetles$n\nbeetles\n',
          caption: '`n` is how many beetles were in each group and `killed` how many died. `prop` is the observed proportion killed. Nothing is fitted yet: these are the data.',
        },
        {
          kind: 'quiz',
          prompt: 'Which of these responses is a number of successes out of a known number of trials?',
          options: [
            { text: 'How many of the 20 seeds sown in each tray germinated', correct: true, why: 'Each seed is a trial with two outcomes, and each tray has a known total. The count can never pass 20.' },
            { text: 'How many cars pass through an intersection in an hour', why: 'A count with no fixed ceiling: there is no number of trials that some of the cars came out of. That is a Poisson-style count.' },
            { text: 'How many days each seed took to germinate', why: 'A time, not a count of successes. Times until something happens have models of their own.' },
            { text: 'The total weight of the seedlings in each tray', why: 'A continuous measurement. Nothing here is counted out of a total.' },
          ],
        },
      ],
    },
    {
      id: 'fitting',
      title: 'Fitting with cbind()',
      blocks: [
        {
          kind: 'prose',
          body:
            'Six dead out of 59 is not the same result as six dead out of 12, so `glm()` needs both parts of the response, and the usual way to give them is a two-column response built with `cbind()`: **successes in the first column, failures in the second**. For the beetles that is `cbind(killed, n - killed)`, the dead and the survivors.',
        },
        {
          kind: 'predict',
          code: BEETLES + 'dim(cbind(beetles$killed, beetles$n - beetles$killed))\n',
          ask: '`cbind()` binds its arguments together as columns, and `dim()` reports rows then columns. What shape is the response?',
          choices: ['[1] 8 2', '[1] 2 8', '[1] 16', '[1] 8 3'],
        },
        {
          kind: 'code',
          code: BEETLES + FIT + 'summary(fit)\n',
        },
        {
          kind: 'prose',
          body:
            'Read it the way you read a logistic regression: the coefficients are on the log-odds scale, here the log-odds that a beetle dies. The `dose` estimate is positive, so the higher the dose, the higher the chance of death.\n\n' +
            'One thing is new. The degrees of freedom count **groups, not beetles**: the null deviance has one fewer than the number of rows. Keep that in mind for the last section, where the residual deviance and its degrees of freedom are put side by side.',
        },
        {
          kind: 'compare',
          caption: 'Both run without a word of complaint from R. Only one is the model you meant.',
          left: {
            label: 'Second column: the group size',
            code: BEETLES + 'coef(glm(cbind(killed, n) ~ dose, family = binomial, data = beetles))\n',
            bad: true,
          },
          right: {
            label: 'Second column: the survivors',
            code: BEETLES + 'coef(glm(cbind(killed, n - killed) ~ dose, family = binomial, data = beetles))\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Why do the coefficients on the left differ from the ones on the right?',
          options: [
            { text: 'R reads the second column as failures, so on the left it thinks each group had `killed + n` beetles, and a smaller share of them died', correct: true, why: '`cbind()` only puts two columns side by side; R cannot know you meant a total. On the left, the proportion R sees in each group is killed / (killed + n), which can never be above one half.' },
            { text: 'R works out the failures from the total on both sides, but rounds differently', why: 'There is no working out: R takes whatever is in the second column as the number of failures. Give it the total and it models the wrong proportion.' },
            { text: 'The left-hand model uses a different link', why: 'Both use `family = binomial` with its default logit link. Only the response changed.' },
          ],
        },
      ],
    },
    {
      id: 'three-layouts',
      title: 'Three ways to write it',
      blocks: [
        {
          kind: 'prose',
          body:
            'There is a second way to give `glm()` the same information: make the **proportion** the response, and tell it how many trials each proportion is out of with `weights = n`.',
        },
        {
          kind: 'compare',
          caption: 'Different formulas, identical coefficients: two ways of saying the same thing to `glm()`.',
          left: {
            label: 'Successes and failures',
            code: BEETLES + FIT + 'formula(fit)\ncoef(fit)\n',
          },
          right: {
            label: 'Proportion, weighted by n',
            code: BEETLES + 'beetles$prop <- beetles$killed / beetles$n\nfit <- glm(prop ~ dose, weights = n, family = binomial, data = beetles)\nformula(fit)\ncoef(fit)\n',
          },
        },
        {
          kind: 'compare',
          caption: 'Leave the weights out and every group counts as a single trial, as if the whole experiment had eight beetles. R warns that a proportion is not a whole number of successes. The estimates shift a little, because the groups are no longer weighted by their size, and the standard errors balloon, because eight trials say far less than hundreds of beetles.',
          left: {
            label: 'Proportion, no weights',
            code: BEETLES + 'beetles$prop <- beetles$killed / beetles$n\nfit <- glm(prop ~ dose, family = binomial, data = beetles)\nsummary(fit)$coefficients\n',
            bad: true,
          },
          right: {
            label: 'Proportion, weights = n',
            code: BEETLES + 'beetles$prop <- beetles$killed / beetles$n\nfit <- glm(prop ~ dose, weights = n, family = binomial, data = beetles)\nsummary(fit)$coefficients\n',
          },
        },
        {
          kind: 'prose',
          body:
            'Presence/absence data sits at the other extreme, with one trial per row, and you can write the beetles that way too: one row per beetle, with `died` as 1 or 0. `rep()` repeats each group\'s dose once for every beetle that died, and once for every one that lived.',
        },
        {
          kind: 'compare',
          caption: 'The same coefficients either way, because a group of n is n single trials. The deviance and its degrees of freedom are another matter, and the last section explains why that matters.',
          left: {
            label: 'One row per group',
            code: BEETLES + FIT + 'nrow(beetles)\ncoef(fit)\ndeviance(fit)\ndf.residual(fit)\n',
          },
          right: {
            label: 'One row per beetle',
            code:
              BEETLES +
              'dead <- data.frame(dose = rep(beetles$dose, beetles$killed), died = 1)\n' +
              'alive <- data.frame(dose = rep(beetles$dose, beetles$n - beetles$killed), died = 0)\n' +
              'each <- rbind(dead, alive)\n' +
              'fit <- glm(died ~ dose, family = binomial, data = each)\n' +
              'nrow(each)\ncoef(fit)\ndeviance(fit)\ndf.residual(fit)\n',
          },
        },
      ],
    },
    {
      id: 'fitted-proportions',
      title: 'Fitted proportions',
      blocks: [
        {
          kind: 'prose',
          body:
            '`fitted(fit)` gives the model\'s fitted proportion for each group, on the same scale as `prop`. `predict(fit, type = "response")` gives the same thing, and with new data it answers for doses nobody tried. Multiply a fitted proportion by the group size and you have the number of deaths the model expects.',
        },
        {
          kind: 'predict',
          code: BEETLES + FIT + 'length(fitted(fit))\n',
          ask: 'How many fitted values does the model have: one per beetle, or one per group?',
          choices: ['[1] 8', '[1] 481', '[1] 2'],
        },
        {
          kind: 'code',
          code:
            BEETLES + FIT +
            'data.frame(dose = beetles$dose,\n' +
            '           observed = round(beetles$killed / beetles$n, 3),\n' +
            '           fitted = round(fitted(fit), 3),\n' +
            '           expected = round(fitted(fit) * beetles$n, 1))\n' +
            'all.equal(fitted(fit), predict(fit, type = "response"))\n' +
            'predict(fit, data.frame(dose = c(1.70, 1.80)), type = "response")\n',
          caption: '`expected` is the fitted proportion times the group size. The next line checks that `fitted()` and `predict(type = "response")` agree, and the last asks about two doses that were never tried.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'beetle-dose',
            title: 'Pick a dose',
            intro: 'Drag the **dose**. The curve is the fitted proportion killed at every dose, the grey dots are the observed proportions in the eight groups, and the coloured dot is the model\'s answer at the dose you chose.',
            template:
              BEETLES + FIT +
              'd <- ⟦dose⟧ / 100\n' +
              'p <- predict(fit, data.frame(dose = d), type = "response")\n' +
              'cat("dose:", d, "\\n")\n' +
              'cat("fitted proportion killed:", round(p, 3), "\\n")\n' +
              'cat("expected deaths in a group of 60:", round(60 * p, 1), "\\n")\n',
            knobs: [
              { id: 'dose', kind: 'range', label: 'dose, in hundredths', min: 165, max: 190, start: 172 },
            ],
            probes: {
              curve: CURVE,
              half: 'cbind(c(1.65, 1.9), c(0.5, 0.5))',
              data: 'cbind(beetles$dose, beetles$killed / beetles$n)',
              here: 'cbind(d, p)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'dose, log10 mg per litre',
              yLabel: 'proportion killed',
              caption: 'Each grey dot is one group of beetles. The flat line marks a proportion of one half.',
              series: [
                { probe: 'curve', label: 'fitted proportion' },
                { probe: 'half', label: 'half killed' },
              ],
              marker: 'here',
              points: 'data',
            },
            takeaway:
              'The curve gives an answer at every dose, including the ones nobody tried, and the dots scatter around it rather than sitting on it. The fitted proportion changes fastest where the curve crosses the half line and hardly at all near the two ends, so the same step in dose kills the most extra beetles in the middle. The dose where the curve crosses one half is the next section.',
          },
        },
      ],
    },
    {
      id: 'ld50',
      title: 'The dose that kills half',
      blocks: [
        {
          kind: 'prose',
          body:
            'A dose–response study often comes down to one number: the dose that kills half the insects, called the **LD50** (lethal dose, 50%). It falls straight out of the model. At a proportion of one half the odds are 1 and the log-odds are 0, so the LD50 is the dose where the straight line on the log-odds scale crosses zero:\n\n' +
            '**b0 + b1 × dose = 0**, so **dose = −b0 / b1**',
        },
        {
          kind: 'predict',
          code: BEETLES + FIT + 'ld <- -coef(fit)[[1]] / coef(fit)[[2]]\npredict(fit, data.frame(dose = ld), type = "response")\n',
          ask: 'Check the algebra. This asks for the fitted proportion at −b0 / b1. What does R print?',
          choices: ['1\n0', '  1\n0.5', '1\n1'],
        },
        {
          kind: 'shell',
          lines: [
            'dose <- c(1.6907, 1.7242, 1.7552, 1.7842, 1.8113, 1.8369, 1.8610, 1.8839)',
            'n <- c(59, 60, 62, 56, 63, 59, 62, 60)',
            'killed <- c(6, 13, 18, 28, 52, 53, 61, 60)',
            'fit <- glm(cbind(killed, n - killed) ~ dose, family = binomial)',
            'b <- coef(fit)',
            '-b[[1]] / b[[2]]',
            'library(MASS)',
            'dose.p(fit, p = c(0.5, 0.9))',
          ],
          caption: 'The data typed as three vectors, which `glm()` finds without a data frame. `dose.p()` comes from MASS; its `p` argument picks the proportion, so `0.9` asks for the dose that kills 90%.',
        },
        {
          kind: 'prose',
          body:
            'The two ways agree: `-b[[1]] / b[[2]]` prints the same dose as the `p = 0.5` row of the table. What `dose.p()` adds is the `SE` column. The LD50 is a ratio of two estimates, so how uncertain it is depends on both standard errors and on how b0 and b1 move together; `dose.p()` works that out for you (the method is called the **delta method**). Since `dose` is a log concentration, `10^` of an LD50 turns it back into milligrams per litre.',
        },
        {
          kind: 'quiz',
          prompt: 'What is the `SE` column from `dose.p()` for?',
          options: [
            { text: 'Saying how precisely the data pin the LD50 down, for instance with an approximate 95% interval of the estimate plus or minus two standard errors', correct: true, why: 'It measures how much the estimated LD50 would vary from one experiment to the next, exactly like the standard error of a coefficient. More beetles would shrink it.' },
            { text: 'Describing how much individual beetles differ in how much gas they can take', why: 'That spread is what the slope describes: a steep slope means the beetles are much alike. The SE is about the estimate, and it shrinks as you test more beetles, which the beetles\' differences would not.' },
            { text: 'Measuring the typical gap between the observed proportions and the curve', why: 'That is what residuals and the deviance measure. The SE is about the uncertainty in one estimated dose.' },
          ],
        },
      ],
    },
    {
      id: 'other-links',
      title: 'Probit and cloglog',
      blocks: [
        {
          kind: 'prose',
          body:
            'The logit is one way to bend a straight line into an S between 0 and 1, but not the only one. Two others are common with binomial data, and `glm()` takes either inside the family, as `binomial(link = "probit")` or `binomial(link = "cloglog")`.\n\n' +
            '- **probit** uses the normal distribution. Picture every beetle with its own tolerance, dying if the dose goes past it. If the tolerances follow a normal curve, the proportion dying at each dose is the normal distribution\'s cumulative probability, `pnorm()`.\n' +
            '- **cloglog**, the complementary log-log, is log(−log(1 − p)). Unlike the other two, its S is lopsided: it leaves 0 gradually and closes in on 1 fast.\n\n' +
            'The three models are not nested, since no setting of the coefficients turns one link into another, but they have the same response and data, so AIC can say which curve suits the data best.',
        },
        {
          kind: 'match',
          ask: 'Each link has an inverse that turns the straight line, eta, back into a proportion. Match them.',
          pairs: [
            { left: 'logit', right: 'plogis(eta)' },
            { left: 'probit', right: 'pnorm(eta)' },
            { left: 'cloglog', right: '1 - exp(-exp(eta))' },
          ],
        },
        {
          kind: 'code',
          code:
            BEETLES +
            'fit_logit <- glm(cbind(killed, n - killed) ~ dose, family = binomial, data = beetles)\n' +
            'fit_probit <- glm(cbind(killed, n - killed) ~ dose, family = binomial(link = "probit"), data = beetles)\n' +
            'fit_cloglog <- glm(cbind(killed, n - killed) ~ dose, family = binomial(link = "cloglog"), data = beetles)\n' +
            'AIC(fit_logit, fit_probit, fit_cloglog)\n' +
            'sapply(list(logit = fit_logit, probit = fit_probit, cloglog = fit_cloglog), deviance)\n' +
            'df.residual(fit_logit)\n',
          caption: '`AIC()` takes several models at once; its `df` column counts coefficients. The last two lines are each model\'s residual deviance and the residual degrees of freedom all three share.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'beetle-links',
            title: 'Three ways to bend the line',
            intro: 'Pick a **link**. The model is refitted with it: the first curve is its fitted proportion at every dose, the second is the logit fit for comparison, and the table puts the deaths the model expects beside the deaths there were.',
            template:
              BEETLES +
              'fit <- glm(cbind(killed, n - killed) ~ dose, family = binomial(link = ⟦link⟧), data = beetles)\n' +
              'fit_logit <- glm(cbind(killed, n - killed) ~ dose, family = binomial, data = beetles)\n' +
              'cat("AIC:", round(AIC(fit), 2), "\\n")\n' +
              'cat("residual deviance:", round(deviance(fit), 2), "on", df.residual(fit), "df\\n")\n' +
              'library(MASS)\n' +
              'print(dose.p(fit))\n' +
              'print(data.frame(dose = beetles$dose, killed = beetles$killed, expected = round(fitted(fit) * beetles$n, 1)))\n',
            knobs: [
              {
                id: 'link',
                label: 'link function',
                choices: [
                  { value: '"logit"', caption: 'logit' },
                  { value: '"probit"', caption: 'probit' },
                  { value: '"cloglog"', caption: 'complementary log-log' },
                ],
              },
            ],
            probes: {
              curve: CURVE,
              logit: 'cbind(seq(1.65, 1.9, by = 0.005), predict(fit_logit, data.frame(dose = seq(1.65, 1.9, by = 0.005)), type = "response"))',
              data: 'cbind(beetles$dose, beetles$killed / beetles$n)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'dose, log10 mg per litre',
              yLabel: 'proportion killed',
              caption: 'Each grey dot is one group of beetles.',
              series: [
                { probe: 'curve', label: 'chosen link' },
                { probe: 'logit', label: 'logit' },
              ],
              points: 'data',
            },
            notes: {
              '0': 'This is the model from the rest of the lesson, so the two curves lie on top of each other.',
              '1': 'Probit and logit give nearly the same curve here, and nearly the same AIC.',
              '2': 'Look at the two lowest doses in the table, then switch back to logit and look again.',
            },
            takeaway:
              'All three are S-shapes through the same dots, and the LD50 moves only a little from one link to the next. The complementary log-log has the lowest AIC of the three, it is the only one whose residual deviance is below its degrees of freedom, and its expected deaths at the lowest dose are much closer to what happened. For these beetles, the lopsided S fits better than the two symmetric ones.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'The complementary log-log model has the lowest AIC. What can you conclude?',
          options: [
            { text: 'Of these three curves, it describes these beetles best, allowing for the number of coefficients', correct: true, why: 'AIC compares models fitted to the same response, and lower is better. All three have two coefficients here, so AIC ranks them the same way the residual deviance does.' },
            { text: 'The logit and probit models are wrong, so their LD50s cannot be used', why: 'AIC only ranks the models you give it; it does not pass or fail any of them, and in the card the three LD50s are close. A lower AIC says which curve to prefer, not that the others are useless.' },
            { text: 'The dose effect is more significant in the cloglog model', why: 'AIC says nothing about any one coefficient\'s p-value. It measures how well the whole model fits, with a penalty for each coefficient.' },
          ],
        },
      ],
    },
    {
      id: 'extra-spread',
      title: 'Too much spread',
      blocks: [
        {
          kind: 'prose',
          body:
            'The binomial family makes a promise about spread: a group of n trials, each with chance p, has variance n p (1 − p). Nothing is left over to estimate, which is what the summary means when it says the dispersion is taken to be 1.\n\n' +
            'Real groups often break that promise. Seeds on one plate share that plate\'s conditions; insects from one batch share their batch\'s hardiness. When the trials within a group are alike, the counts vary **more** from group to group than the binomial allows. This is overdispersion, the same problem the overdispersion lesson met with counts, and the first check is the same: if the model is right, the residual deviance should be close to its degrees of freedom.',
        },
        {
          kind: 'prose',
          body:
            'These are germination counts from 21 plates of seeds of a parasitic plant: two varieties of seed, labelled O73 and O75, with each plate treated with an extract of bean or cucumber roots.',
        },
        {
          kind: 'code',
          code:
            SEEDS +
            'fit <- glm(cbind(germinated, sown - germinated) ~ seed + extract, family = binomial, data = seeds)\n' +
            'deviance(fit)\n' +
            'df.residual(fit)\n' +
            'sum(residuals(fit, type = "pearson")^2) / df.residual(fit)\n',
          caption: 'The residual deviance, its degrees of freedom, and the Pearson estimate of the dispersion: the squared Pearson residuals added up and divided by the residual degrees of freedom.',
        },
        {
          kind: 'prose',
          body:
            'The residual deviance is well above its degrees of freedom, and the Pearson estimate is well above 1: these plates vary more than a binomial model allows.\n\n' +
            'The check needs groups, though. With one trial per row the deviance says nothing about spread, because a single yes or no cannot vary more than p(1 − p) allows. Look back at the one-row-per-beetle model: the same coefficients as the grouped one, and a completely different deviance and degrees of freedom.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Check the curve first',
          body:
            'A model with the wrong shape leaves a big residual deviance too. In the three beetle fits in the last section, the logit and probit residual deviances are above their degrees of freedom and the cloglog one is below: the curve was the problem, not the beetles. Try a better link, or a missing predictor, before blaming the spread.',
        },
        {
          kind: 'compare',
          caption: 'Same estimates, bigger standard errors, and t tests in place of z. The last two lines on the right are the estimated dispersion, the same Pearson estimate as above, and its square root: each standard error on the right is the one on the left multiplied by that square root.',
          left: {
            label: 'Binomial: dispersion fixed at 1',
            code: SEEDS + 'fit <- glm(cbind(germinated, sown - germinated) ~ seed + extract, family = binomial, data = seeds)\nsignif(summary(fit)$coefficients, 3)\n',
            bad: true,
          },
          right: {
            label: 'Quasi-binomial: dispersion estimated',
            code: SEEDS + 'qfit <- glm(cbind(germinated, sown - germinated) ~ seed + extract, family = quasibinomial, data = seeds)\nsignif(summary(qfit)$coefficients, 3)\nsummary(qfit)$dispersion\nsqrt(summary(qfit)$dispersion)\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Look at the `seedO75` row in both tables. Why is its p-value so much bigger under quasi-binomial?',
          options: [
            { text: 'The binomial model treated the counts as more precise than they are, so its standard error was too small; allowing for the extra spread makes the seed effect much less certain', correct: true, why: 'The estimate did not change. Its standard error grew by the square root of the dispersion, so the t value shrank and the p-value grew.' },
            { text: 'Quasi-binomial estimates a smaller effect for the seed variety', why: 'The `Estimate` column is identical in both tables. Quasi-binomial fits the same curve and changes only how uncertain it says the estimates are.' },
            { text: 'The quasi-binomial model uses fewer plates', why: 'Both use all 21 plates. The whole difference is the dispersion: fixed at 1 on the left, estimated from the data on the right.' },
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
            'Write a function `ld50(fit)` that takes a binomial glm with the logit link and one predictor, and returns the value of the predictor at which the fitted proportion is one half, −b0 / b1, as a plain number. The tests compare your answer with `MASS::dose.p()` and with data where the answer is known.',
          run: 'function',
          fnName: 'ld50',
          starter: 'ld50 <- function(fit) {\n  # the dose where the fitted proportion is one half\n}\n',
          solution: 'ld50 <- function(fit) {\n  b <- coef(fit)\n  -b[[1]] / b[[2]]\n}\n',
          tests: [
            {
              id: 'beetles', label: 'the beetles, checked against dose.p()', hidden: false,
              setup: BEETLES + FIT,
              call: 'ld50(fit)',
              expect: 'local({\n' + BEETLES + FIT + 'as.numeric(MASS::dose.p(fit))\n})',
              cmp: 'float',
            },
            {
              id: 'symmetric', label: 'proportions 0.1 to 0.9 in even steps: half die at the middle dose', hidden: false,
              setup: 'sym <- data.frame(dose = 1:5, n = 10, killed = c(1, 3, 5, 7, 9))\nfit <- glm(cbind(killed, n - killed) ~ dose, family = binomial, data = sym)\n',
              call: 'ld50(fit)',
              expect: '3',
              cmp: 'float',
            },
            {
              id: 'gearbox', label: '0/1 data: the weight at which a manual gearbox is an even chance', hidden: true,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'ld50(fit)',
              expect: 'as.numeric(MASS::dose.p(glm(am ~ wt, family = binomial, data = mtcars)))',
              cmp: 'float',
            },
          ],
          hint: '`coef(fit)` holds b0 first and b1 second, and `[[ ]]` takes one out without its name.',
        },
      ],
    },
  ],
};

export default lesson;
