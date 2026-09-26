// Too many zeros: zero-inflated and hurdle models for counts.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types a count of zeros, a coefficient, an AIC or a probability. The first card builds zero-inflated
// counts from a Poisson with a known mean, so the reader can watch a plain Poisson fit fall behind as
// structural zeros are added. The second card reads one fitted model from both sides: the chance of a
// structural zero, and the counts everyone else would produce.
import type { Lesson } from '../../lessonSchema.ts';

/** The zero-inflated negative binomial model most of the later blocks refit, as one line of R. */
const ZINB =
  'zinb <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin")';
const ZIP =
  'zip <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "poisson")';
const PSCL = 'suppressPackageStartupMessages(library(pscl))';
const DATA = 'data("bioChemists", package = "pscl")';

const lesson: Lesson = {
  id: 'zero-inflated',
  title: 'Too many zeros: zero-inflated models',
  summary: 'When counts have more zeros than a Poisson or negative binomial model expects: counting them, the two-process idea, and fitting zero-inflated and hurdle models with pscl',
  track: 'stat2402',
  order: 12,
  prereqs: ['negative-binomial'],
  minutes: 20,
  outcomes: [
    'Compare the zeros in the data with the zeros a fitted Poisson or negative binomial model expects',
    'Explain the difference between a structural zero and a zero that happened by chance',
    'Fit zero-inflated Poisson and negative binomial models with `zeroinfl()`, and read both parts of the summary',
    'Predict the mean count and the chance of a structural zero with `predict()`',
    'Compare the models with AIC, and say how a hurdle model treats zeros differently',
  ],
  sections: [
    {
      id: 'too-many-zeros',
      title: 'More zeros than a count allows',
      blocks: [
        {
          kind: 'prose',
          body:
            'A park asks each group of visitors how many fish they caught. Plenty of groups say none. Some of them fished all afternoon and had no luck; others came for the picnic and never put a line in the water. Both answers are 0, but they are different kinds of 0: one is a small count, and the other comes from a visitor who was never going to catch anything.\n\n' +
            'The same thing happens wherever part of the population cannot produce a count at all. A PhD student who is not going to publish during the degree writes no articles, however long you wait. A plant that is immune to a disease shows no lesions, whatever the weather. Mix those units in with the rest and you can end up with **more zeros than a count model allows**.',
        },
        {
          kind: 'prose',
          body:
            'The data for most of this lesson is `bioChemists`, from the **pscl** package: biochemistry PhD students, with the number of articles each one published in the last three years of the PhD (`art`), their gender (`fem`), whether they are married (`mar`), how many children they have aged five or under (`kid5`), the prestige of their PhD department (`phd`), and the number of articles their mentor published over the same three years (`ment`).',
        },
        {
          kind: 'code',
          code: `${PSCL}\n${DATA}\nnrow(bioChemists)\nhead(bioChemists)\ntable(bioChemists$art)\n`,
          caption:
            'pscl prints a few lines of credits when it is attached; wrapping `library(pscl)` in `suppressPackageStartupMessages()` keeps them out of the output and changes nothing else. In the table, the top row is a number of articles and the row under it is how many students published that many.',
        },
      ],
    },
    {
      id: 'expected-zeros',
      title: 'How many zeros to expect',
      blocks: [
        {
          kind: 'prose',
          body:
            'A pile of zeros is only *too many* if it is more than the model expects. A Poisson model leaves you no say in that: once it knows a count\'s mean μ, the chance of a zero is fixed at e^−μ, which R gives as `dpois(0, mu)`. There is no separate setting for zeros.',
        },
        {
          kind: 'predict',
          code: 'round(dpois(0, c(0.5, 1, 2, 4)), 3)\n',
          ask: 'The chance of a zero for Poisson counts whose means are 0.5, 1, 2 and 4, rounded to three places. Which line does R print?',
          choices: [
            '[1] 0.607 0.368 0.135 0.018',
            '[1] 0.393 0.632 0.865 0.982',
            '[1] 0.018 0.135 0.368 0.607',
          ],
        },
        {
          kind: 'prose',
          body:
            'A fitted model gives every student their own mean, `fitted(fit)`, so every student has their own chance of a zero. Add those chances up and you have the **number of zeros the model expects**. Put it beside the number there really are.',
        },
        {
          kind: 'shell',
          lines: [
            PSCL,
            DATA,
            'fit <- glm(art ~ fem + mar + kid5 + phd + ment, family = poisson, data = bioChemists)',
            'sum(bioChemists$art == 0)',
            'sum(dpois(0, fitted(fit)))',
          ],
          caption: 'The zeros in the data, then the zeros the Poisson fit expects.',
        },
        {
          kind: 'prose',
          body:
            'The Poisson fit comes up short. But you have met another way a Poisson model goes wrong with counts: extra spread. A negative binomial count with the same mean spreads further, and that includes spreading down onto 0. `glm.nb()` from **MASS** fits one, and `dnbinom()` gives its chance of a zero from the fitted means and the fitted θ, which `glm.nb()` stores as `theta`.',
        },
        {
          kind: 'shell',
          lines: [
            'c(poisson = dpois(0, 2), negbin = dnbinom(0, mu = 2, size = 2))',
            'library(MASS)',
            PSCL,
            DATA,
            'nb <- glm.nb(art ~ fem + mar + kid5 + phd + ment, data = bioChemists)',
            'sum(bioChemists$art == 0)',
            'sum(dnbinom(0, mu = fitted(nb), size = nb$theta))',
          ],
          caption: 'The first line compares the chance of a zero for a Poisson count and a negative binomial count, both with mean 2. The last two compare the zeros in the data with the zeros the negative binomial fit expects.',
        },
        {
          kind: 'quiz',
          prompt: 'The Poisson fit expects far fewer zeros than there are; the negative binomial fit expects about as many as there are. What is the fair conclusion?',
          options: [
            { text: 'The extra zeros could be nothing more than extra spread, so the pile of zeros alone does not prove that some students never publish', correct: true, why: 'A negative binomial with no special treatment of zeros already expects about as many as there are. Zeros beyond what a Poisson expects say something is wrong, but extra spread and a group of structural zeros can both produce them. Telling the two apart takes the models in the rest of this lesson.' },
            { text: 'The data have too many zeros for any ordinary count model, so the negative binomial is wrong too', why: 'The negative binomial\'s expected number of zeros is close to the real one, so the zeros alone make no case against it.' },
            { text: 'The Poisson model is fine after all, because the negative binomial gets the zeros right', why: 'The Poisson fit\'s expected zeros fall well short of the real number. That is a problem with the Poisson model whatever the negative binomial does.' },
          ],
        },
      ],
    },
    {
      id: 'measuring-the-excess',
      title: 'Measuring the excess',
      blocks: [
        {
          kind: 'prose',
          body:
            'To see what structural zeros do to a Poisson fit, make some. The card below draws 400 counts from a Poisson distribution with mean exp(0.6 + x), then turns a share of them, picked at random, into structural zeros, and fits an ordinary Poisson `glm()` to the result. The counts that are not picked are left alone, so some of them are zeros by chance.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'structural-zeros-share',
            title: 'Adding structural zeros',
            intro: 'Drag the share of counts that are made structural zeros. The picture shows how often each count from 0 to 10 turns up in the data, against how often the Poisson fit expects it. Watch the point at 0, and the small counts next to it.',
            template:
              'set.seed(8)\n' +
              'x <- runif(400)\n' +
              'counts <- rpois(400, exp(0.6 + x))\n' +
              'structural <- runif(400) < ⟦share⟧ / 100\n' +
              'y <- ifelse(structural, 0, counts)\n' +
              'fit <- glm(y ~ x, family = poisson)\n' +
              'k <- 0:10\n' +
              'observed <- sapply(k, function(j) mean(y == j))\n' +
              'expected <- sapply(k, function(j) mean(dpois(j, fitted(fit))))\n' +
              'cat("Zeros in the data:        ", sum(y == 0), "\\n")\n' +
              'cat("Zeros the Poisson expects:", round(sum(dpois(0, fitted(fit))), 1), "\\n")\n' +
              'cat("Excess zeros:             ", round(sum(y == 0) - sum(dpois(0, fitted(fit))), 1), "\\n")\n' +
              'cat("Pearson dispersion:       ", round(sum(residuals(fit, type = "pearson")^2) / df.residual(fit), 2), "\\n")\n',
            knobs: [
              { id: 'share', kind: 'range', label: 'structural zeros, in percent', min: 0, max: 50, start: 0 },
            ],
            probes: {
              observed: 'cbind(k, observed)',
              expected: 'cbind(k, expected)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'count',
              yLabel: 'share of the 400 counts',
              caption: 'How often each count turns up in the data, and how often the Poisson fit expects it.',
              series: [
                { probe: 'observed', label: 'in the data' },
                { probe: 'expected', label: 'the Poisson fit expects' },
              ],
            },
            takeaway:
              'With no structural zeros the Poisson fit expects roughly as many zeros as there are. Drag right and the zeros in the data pile up much faster than the fit\'s expectation. The fit has one lever, its mean: to make more room for zeros it lowers the mean, which puts too much weight on the small counts next to 0 and still leaves it short at 0. The Pearson dispersion climbs across the slider as well, so a pile of structural zeros also looks like extra spread.',
          },
        },
        {
          kind: 'task',
          prompt:
            'The card\'s third line is the check from the last section written as one number: **observed zeros minus expected zeros**. For a model that has the zeros right it sits near 0, compared with the number of counts; a large positive number means zeros the model cannot account for.\n\n' +
            'Write a function `excess_zeros(fit)` that takes a fitted Poisson `glm()` and returns the number of zeros in the counts it was fitted to, minus the number of zeros the model expects. The tests fit the models; your function only has to measure them.',
          run: 'function',
          fnName: 'excess_zeros',
          starter:
            'excess_zeros <- function(fit) {\n' +
            '  # count the zeros in the data the model was fitted to,\n' +
            '  # then take away the zeros the model expects\n' +
            '}\n',
          solution:
            'excess_zeros <- function(fit) {\n' +
            '  observed <- sum(fit$y == 0)\n' +
            '  expected <- sum(dpois(0, fitted(fit)))\n' +
            '  observed - expected\n' +
            '}\n',
          tests: [
            {
              id: 'biochemists',
              label: 'bioChemists, articles by PhD students',
              hidden: false,
              setup: 'fit <- glm(art ~ fem + mar + kid5 + phd + ment, family = poisson, data = pscl::bioChemists)',
              call: 'excess_zeros(fit)',
              expect: 'local({ d <- pscl::bioChemists; f <- glm(art ~ fem + mar + kid5 + phd + ment, family = poisson, data = d); sum(d$art == 0) - sum(dpois(0, fitted(f))) })',
              cmp: 'float',
            },
            {
              id: 'insects',
              label: 'InsectSprays, insect counts by spray',
              hidden: false,
              setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'excess_zeros(fit)',
              expect: 'local({ f <- glm(count ~ spray, family = poisson, data = InsectSprays); sum(InsectSprays$count == 0) - sum(dpois(0, fitted(f))) })',
              cmp: 'float',
            },
            {
              id: 'simulated',
              label: 'simulated counts with a quarter made structural zeros',
              hidden: true,
              setup: 'set.seed(1); x <- runif(200); y <- ifelse(runif(200) < 0.25, 0, rpois(200, exp(1 + x))); fit <- glm(y ~ x, family = poisson)',
              call: 'excess_zeros(fit)',
              expect: 'local({ set.seed(1); x <- runif(200); y <- ifelse(runif(200) < 0.25, 0, rpois(200, exp(1 + x))); f <- glm(y ~ x, family = poisson); sum(y == 0) - sum(dpois(0, fitted(f))) })',
              cmp: 'float',
            },
          ],
          hint: '`fit$y` holds the counts the model was fitted to, and `fitted(fit)` their fitted means. `sum(fit$y == 0)` counts the zeros; `dpois(0, fitted(fit))` gives each count\'s chance of a zero.',
        },
      ],
    },
    {
      id: 'two-processes',
      title: 'Two ways to get a zero',
      blocks: [
        {
          kind: 'prose',
          body:
            'A **zero-inflated** model writes the park story down as two steps. First, each unit is a **structural zero** with some chance π: the visitor who never fished, the student who will not publish, the immune plant. Otherwise its count comes from an ordinary count model, Poisson or negative binomial, with mean μ, and that count can still be 0 by chance.\n\n' +
            'So a zero can arrive by either route, and its chance is **π + (1 − π) × (the count model\'s chance of 0)**. Every other count can only come from the second step, so its chance is (1 − π) times the count model\'s.',
        },
        {
          kind: 'predict',
          code: 'y <- ifelse(runif(10000) < 0.3, 0, rpois(10000, lambda = 1))\nround(mean(y == 0), 2)\n',
          ask: 'Each of these 10,000 counts is made a structural zero with chance 0.3; the rest come from a Poisson with mean 1, whose chance of a zero you saw in the `dpois()` line earlier. Roughly what share of all the counts are zero?',
          choices: ['[1] 0.3', '[1] 0.37', '[1] 0.56', '[1] 0.67'],
        },
        {
          kind: 'shell',
          lines: ['0.3 + 0.7 * dpois(0, 1)'],
          caption: 'The formula for the same share: the structural zeros, plus the chance zeros among the other 70%.',
        },
        {
          kind: 'quiz',
          prompt: 'In a study of a plant disease, one plant has no lesions at all. Which kind of zero is it?',
          options: [
            { text: 'There is no telling from the zero itself; a model can only give the chance that it is structural', correct: true, why: 'A structural zero and a chance zero look the same in the data: both are a 0. A zero-inflated model uses the plant\'s predictors to say how likely each route is, and `predict()` will report that chance, as you will see shortly.' },
            { text: 'A structural zero: a plant with no lesions must be immune', why: 'A susceptible plant can also escape with no lesions, by luck. That is the (1 − π) × (chance of 0) part of the formula.' },
            { text: 'A chance zero, because every plant could have caught the disease', why: 'That is what a plain Poisson model assumes. A zero-inflated model exists for data where some units may never produce a count.' },
          ],
        },
      ],
    },
    {
      id: 'fitting-zeroinfl',
      title: 'Fitting it with zeroinfl()',
      blocks: [
        {
          kind: 'prose',
          body:
            'Both parts can depend on predictors: μ through a log link, as in Poisson regression, and π through a logit link, as in logistic regression. `zeroinfl()` from pscl fits the two together. Its formula has two right-hand sides, separated by a bar:\n\n' +
            '`art ~ fem + mar + kid5 + phd + ment | ment`\n\n' +
            'Left of the bar are the predictors of the **count part**, μ; right of it are the predictors of the **zero part**, π. Here all five predictors go into the count part, and the zero part uses `ment` alone, on the idea that a student whose mentor publishes little may be the kind of student who never publishes. Writing `| 1` instead would give every student the same π. `dist = "poisson"` makes the count part Poisson.',
        },
        {
          kind: 'code',
          code: `${PSCL}\n${DATA}\n${ZIP}\nsummary(zip)\n`,
        },
        {
          kind: 'prose',
          body:
            'There are two coefficient tables. **Count model coefficients** is read like a Poisson regression, on the log scale, but it describes only the students who are not structural zeros. **Zero-inflation model coefficients** is a logistic regression for π, on the log-odds scale: a positive estimate makes a structural zero more likely, a negative one less likely. The bottom line gives a log-likelihood rather than deviances, because `zeroinfl()` is fitted by maximising the likelihood directly.',
        },
        {
          kind: 'match',
          ask: 'Match each piece of a zero-inflated model to what it describes.',
          pairs: [
            { left: 'Count model coefficients', right: 'the log of the mean count, for units that are not structural zeros' },
            { left: 'Zero-inflation model coefficients', right: 'the log-odds of being a structural zero' },
            { left: 'left of the bar in the formula', right: 'the predictors of the count part' },
            { left: 'right of the bar in the formula', right: 'the predictors of the zero part' },
            { left: 'dist = "negbin"', right: 'a count part that can spread further than a Poisson' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'In the zero-inflation table above, the estimate for `ment` is negative. What does that say?',
          options: [
            { text: 'Students whose mentors published more are less likely to be structural zeros', correct: true, why: 'The zero part models the log-odds of being a structural zero. A negative slope means each extra article by the mentor lowers those odds.' },
            { text: 'Students whose mentors published more write fewer articles', why: 'That would be a claim about the count table, which is about how many articles are written by students who are not structural zeros. The zero table is only about the chance of being a structural zero.' },
            { text: 'More articles by the mentor make a structural zero more likely', why: 'That is the reading for a positive estimate. A negative one points the other way: more articles by the mentor, lower odds of a structural zero.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'For a negative binomial count part, change `dist`. The count part gains a θ for its spread, the same kind of θ as `glm.nb()`\'s, stored as `theta`. `summary()` keeps its two tables in a list, as `count` and `zero`.',
        },
        {
          kind: 'shell',
          lines: [PSCL, DATA, ZINB, 'summary(zinb)$coefficients$zero', 'zinb$theta'],
          caption: 'The zero part of the zero-inflated negative binomial model, then its θ.',
        },
      ],
    },
    {
      id: 'predictions',
      title: 'Predictions from both parts',
      blocks: [
        {
          kind: 'prose',
          body:
            'A zero-inflated model makes more than one kind of prediction, and `predict()` picks one with `type`:\n\n' +
            '- `type = "zero"`: π, the chance of being a structural zero.\n' +
            '- `type = "count"`: μ, the mean of the count part, for a unit that is not a structural zero.\n' +
            '- `type = "response"`, the default: the overall mean, (1 − π) × μ, because a structural zero adds nothing.\n' +
            '- `type = "prob"`: the chance of each count, 0, 1, 2 and so on, one column per count.\n\n' +
            'Here are the first three for four students who are women, single, with no young children and a department prestige score of 3, whose mentors published 0, 5, 10 and 20 articles.',
        },
        {
          kind: 'shell',
          lines: [
            PSCL,
            DATA,
            ZINB,
            'new <- data.frame(fem = "Women", mar = "Single", kid5 = 0, phd = 3, ment = c(0, 5, 10, 20))',
            'round(predict(zinb, new, type = "zero"), 3)',
            'round(predict(zinb, new, type = "count"), 2)',
            'round(predict(zinb, new, type = "response"), 2)',
            'all.equal(predict(zinb, new, type = "response"), (1 - predict(zinb, new, type = "zero")) * predict(zinb, new, type = "count"))',
          ],
          caption: 'One number per student in each line. The last line checks that the overall mean is (1 − π) × μ.',
        },
        {
          kind: 'quiz',
          prompt: 'For the student whose mentor published nothing, the overall mean is well below the mean of the count part. Why?',
          options: [
            { text: 'Her chance of being a structural zero is sizeable, and a structural zero adds nothing, so the count part\'s mean is scaled down by (1 − π)', correct: true, why: 'The overall mean is (1 − π) × μ. For the students whose mentors published more, π is small and the two means are almost the same.' },
            { text: 'The count part ignores `ment`, so its mean is wrong for her', why: '`ment` is on both sides of the bar in this model, so it is in the count part too. The gap comes from π.' },
            { text: 'The overall mean is rounded differently from the count part\'s', why: 'Both are rounded to two places. The gap is real: it is the share of her predicted distribution taken up by structural zeros.' },
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'one-student-two-parts',
            title: 'One student, two parts',
            intro: 'The same student as above: a single woman with no young children, from a department with a prestige score of 3. Drag how many articles her mentor published and compare the model\'s chance of each count with what the count part alone would give.',
            template:
              `${PSCL}\n` +
              `${DATA}\n` +
              `${ZINB}\n` +
              'student <- data.frame(fem = "Women", mar = "Single", kid5 = 0, phd = 3, ment = ⟦ment⟧)\n' +
              'p_zero <- predict(zinb, student, type = "zero")\n' +
              'mu <- predict(zinb, student, type = "count")\n' +
              'k <- 0:8\n' +
              'cat("Chance she is a structural zero:  ", signif(p_zero, 3), "\\n")\n' +
              'cat("Mean of the count part:           ", round(mu, 2), "\\n")\n' +
              'cat("Predicted mean number of articles:", round(predict(zinb, student, type = "response"), 2), "\\n")\n',
            knobs: [
              { id: 'ment', kind: 'range', label: 'articles her mentor published', min: 0, max: 20, start: 0 },
            ],
            probes: {
              model: 'cbind(k, predict(zinb, student, type = "prob")[1, k + 1])',
              countpart: 'cbind(k, dnbinom(k, mu = mu, size = zinb$theta))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'number of articles',
              yLabel: 'chance',
              caption: 'The zero-inflated model\'s chance of each count for this student, against the negative binomial count part on its own.',
              series: [
                { probe: 'model', label: 'zero-inflated model' },
                { probe: 'countpart', label: 'count part alone' },
              ],
            },
            takeaway:
              'At the left end the model\'s chance of a zero sits well above the count part\'s, and every other count sits below it. That is π at work: the model moves a share π of her chances off the counts and onto 0. Drag right and π shrinks fast, until the two curves lie on top of each other and the zero part has nothing left to add. Watch the two means as well: early on, most of the rise in her predicted mean comes from π falling; further right it comes from the count part.',
          },
        },
        {
          kind: 'prose',
          body:
            'The two zero-inflated models can tell different stories about the same zeros. Add up every student\'s chance of a zero, from `type = "prob"`, and you get the zeros a model expects in all. Add up every student\'s π and you get how many of those it puts down to structural zeros.',
        },
        {
          kind: 'shell',
          lines: [
            PSCL,
            DATA,
            ZIP,
            ZINB,
            'sum(bioChemists$art == 0)',
            'c(zip = sum(predict(zip, type = "prob")[, 1]), zinb = sum(predict(zinb, type = "prob")[, 1]))',
            'c(zip = sum(predict(zip, type = "zero")), zinb = sum(predict(zinb, type = "zero")))',
          ],
          caption: 'The real zeros; the zeros each model expects in all; and how many of them each model thinks are structural.',
        },
        {
          kind: 'prose',
          body:
            'Both models expect about as many zeros as there are, far closer than the plain Poisson fit. But the zero-inflated Poisson puts many more of them down to structural zeros. Its count part cannot spread out, so the only way it can make a pile of zeros is to call them structural; a negative binomial count part lands on 0 by chance more often, and needs fewer structural zeros. **What counts as a structural zero depends on the count model it is paired with.**',
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Choosing a model',
      blocks: [
        {
          kind: 'prose',
          body:
            'Every model in this lesson has a likelihood, so AIC can compare them on the same data: AIC = −2 × log-likelihood + 2 × the number of parameters, and **lower is better**. The `df` column that `AIC()` prints is the number of parameters each model used.',
        },
        {
          kind: 'code',
          code:
            `library(MASS)\n${PSCL}\n${DATA}\n` +
            'fit <- glm(art ~ fem + mar + kid5 + phd + ment, family = poisson, data = bioChemists)\n' +
            'nb <- glm.nb(art ~ fem + mar + kid5 + phd + ment, data = bioChemists)\n' +
            `${ZIP}\n${ZINB}\n` +
            'AIC(fit, nb, zip, zinb)\n',
          caption: 'The Poisson and negative binomial models from the start of the lesson, and their zero-inflated versions.',
        },
        {
          kind: 'quiz',
          prompt: 'What does the AIC table say?',
          options: [
            { text: 'Allowing for extra spread matters most: both negative binomial models are far ahead of both Poisson ones, and the zero part adds much less on top', correct: true, why: 'Read the gaps. The step from Poisson to negative binomial lowers the AIC by far more than the step from the negative binomial to its zero-inflated version, which fits the zero counts you saw earlier: the negative binomial already expected about as many zeros as there are.' },
            { text: 'The zero-inflated Poisson is the best model, because it deals with the zeros', why: 'Its AIC is well below the plain Poisson\'s, but well above both negative binomial models. Dealing with the zeros is not enough when the counts also spread further than a Poisson allows.' },
            { text: 'The models cannot be compared, because they have different numbers of parameters', why: 'That is what AIC is for: it charges 2 for every parameter, so a model has to earn each one. The `df` column shows how many each used.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'pscl also has `vuong()`, a test that compares two models fitted to the same data. For each student it works out the log of the ratio of the two models\' probabilities for that student\'s count, then asks whether the average of those log ratios is far from 0. The first model you give it is `model1` and the second `model2`; a z-statistic well above 0 favours model1 and one well below 0 favours model2. The `H_A` column says which way the statistic points, and the p-value how surprising it would be if the two models fitted equally well. The three rows are the raw test and two versions that charge for extra parameters, the way AIC and BIC do.',
        },
        {
          kind: 'code',
          code: `library(MASS)\n${PSCL}\n${DATA}\nnb <- glm.nb(art ~ fem + mar + kid5 + phd + ment, data = bioChemists)\n${ZINB}\nvuong(nb, zinb)\n`,
          caption: 'The plain negative binomial is model1, the zero-inflated one model2. "indistinguishible" is spelled that way in pscl\'s own output.',
        },
        {
          kind: 'prose',
          body:
            'The three rows do not agree. The raw test favours the zero-inflated model; the corrected versions, which charge it for its extra parameters, are much less sure, and the BIC version, which charges most, finds no clear difference at all. Evidence that shifts with how you count parameters is weak evidence.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Use vuong() with care',
          body:
            'The test was built for two models where neither is a special case of the other. A zero-inflated model turns back into its plain version when π is 0, so the two are not really separate, and this use of the test has been criticised for exactly that reason. Treat its p-value as one piece of evidence beside AIC and, above all, beside whether a group that can never produce a count makes sense for your data.',
        },
      ],
    },
    {
      id: 'hurdle',
      title: 'Hurdle models',
      blocks: [
        {
          kind: 'prose',
          body:
            'A **hurdle** model also has two parts, but it splits the zeros differently. The first part is a logistic regression for whether a count is 0 or not: whether the unit clears the hurdle. The second is a count model for how many, given at least one: a Poisson or negative binomial with the zero cut off (*truncated*), so it cannot produce a 0. **Every zero comes from the first part**, and there are no chance zeros. `hurdle()` in pscl takes the same formula, bar and `dist` as `zeroinfl()`.',
        },
        {
          kind: 'code',
          code: `${PSCL}\n${DATA}\nh <- hurdle(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin")\nsummary(h)\n`,
        },
        {
          kind: 'prose',
          body:
            'The count table now says `truncated negbin`, and the second table is **Zero hurdle model coefficients**. Which way round is that second table: the chance of a zero, or the chance of clearing the hurdle? Fit the logistic regression yourself and see.',
        },
        {
          kind: 'shell',
          lines: [
            PSCL,
            DATA,
            'h <- hurdle(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin")',
            'coef(h, model = "zero")',
            'coef(glm(art > 0 ~ ment, family = binomial, data = bioChemists))',
            'sum(predict(h, type = "prob")[, 1])',
            'sum(bioChemists$art == 0)',
          ],
          caption: 'The hurdle model\'s zero part beside a logistic regression for "published at least one article". Then the zeros the hurdle model expects, and the zeros there are: a logistic regression with an intercept expects exactly as many of each answer as there are, so a hurdle model always gets the number of zeros right.',
        },
        {
          kind: 'quiz',
          prompt: 'The `ment` estimate is positive in the hurdle model\'s zero table, and it was negative in `zeroinfl()`\'s. Do the two models disagree about mentors?',
          options: [
            { text: 'No: the hurdle part is the chance of publishing at least once, and the zeroinfl part is the chance of being a structural zero, so the same story gives opposite signs', correct: true, why: 'The shell above shows the hurdle part is a logistic regression for a count above 0. More articles by the mentor means a better chance of clearing the hurdle in one model, and a smaller chance of being a never-publisher in the other. Check which way round a zero part is before you read its sign.' },
            { text: 'Yes: one of the two models must be wrong about mentors', why: 'They model opposite events. A positive effect on "at least one article" and a negative effect on "never publishes" point the same way.' },
            { text: 'No, because the sign of a logit coefficient does not matter', why: 'The sign is the direction of the effect, so it matters a great deal. The point is that the two tables model opposite events.' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which of these suits a hurdle model better than a zero-inflated one?',
          options: [
            { text: 'Visits to a museum in a year: deciding whether to go at all is one choice, and anyone who went has been at least once', correct: true, why: 'Every zero is someone who chose not to go, and every visitor has at least one visit. That is a hurdle: one process for zero or not, another for how many.' },
            { text: 'Fish caught by park visitors: some never fished, and some fished and caught nothing', why: 'The zeros come by two routes here, including chance zeros among the groups who fished. That is the zero-inflated story.' },
            { text: 'Lesions on plants: immune plants have none, and a susceptible plant can escape by luck', why: 'Two routes to a zero again, structural and chance. That is zero-inflated.' },
          ],
        },
        {
          kind: 'steps',
          title: 'A routine for a pile of zeros',
          items: [
            'Fit the Poisson model and compare the zeros it expects with the zeros there are.',
            'Do the same for a negative binomial: extra spread alone may account for the zeros.',
            'Ask what the zeros mean. A group that can never produce a count points to a zero-inflated model; a yes-or-no decision before any count points to a hurdle.',
            'Fit with `zeroinfl()` or `hurdle()`, with each part\'s predictors on its own side of the bar.',
            'Compare the models with AIC, read each zero part the right way round, and report both parts.',
          ],
        },
      ],
    },
  ],
};

export default lesson;
