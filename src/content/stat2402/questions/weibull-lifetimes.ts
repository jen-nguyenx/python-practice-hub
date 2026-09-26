// Exam questions for "How long until it fails: Weibull lifetimes".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out.
import type { StatQuestion } from '../../statQuestionSchema.ts';

/** 400 simulated laptop batteries, many still working when the test ended: censoring shortcuts. */
const BATTERIES =
  'library(survival)\n' +
  'set.seed(12)\n' +
  'life <- rweibull(400, shape = 1.8, scale = 600)\n' +
  'limit <- runif(400, 0, 900)\n' +
  'time <- pmin(life, limit)\n' +
  'status <- as.numeric(life <= limit)\n';

/** 140 simulated brake pads of two designs, many still on the car when the records were pulled. */
const BRAKES =
  'library(survival)\n' +
  'set.seed(15)\n' +
  'pad <- factor(rep(c("organic", "ceramic"), each = 70), levels = c("organic", "ceramic"))\n' +
  'life <- rweibull(140, shape = 2.2, scale = ifelse(pad == "organic", 25000, 40000))\n' +
  'inservice <- runif(140, 5000, 45000)\n' +
  'brakes <- data.frame(pad, time = round(pmin(life, inservice)), status = as.numeric(life <= inservice))\n';
const BRAKES_FIT = 'fit <- survreg(Surv(time, status) ~ pad, data = brakes, dist = "weibull")\n';

const questions: StatQuestion[] = [
  {
    id: 'wb-hazard-reading',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 3,
    prompt:
      'A batch of sensors has Weibull lifetimes with scale 6 years. The lines below give the failure rate (density divided by the chance of still working) at age 2 and age 10, first for shape 0.8, then for shape 2.5. What do the two batches show?',
    code:
      'dweibull(c(2, 10), shape = 0.8, scale = 6) / pweibull(c(2, 10), shape = 0.8, scale = 6, lower.tail = FALSE)\n' +
      'dweibull(c(2, 10), shape = 2.5, scale = 6) / pweibull(c(2, 10), shape = 2.5, scale = 6, lower.tail = FALSE)\n',
    options: [
      { text: 'The shape-0.8 batch\'s failure rate falls with age (early failures); the shape-2.5 batch\'s rises sharply (wear-out)', correct: true },
      { text: 'Both batches show a failure rate that rises with age, just at different speeds' },
      { text: 'Both batches show a failure rate that falls with age' },
      { text: 'The shape-0.8 batch wears out and the shape-2.5 batch shows early failures' },
    ],
    explain:
      'The first line\'s two numbers fall from age 2 to age 10: a shape below 1 gives a falling hazard, the pattern of early failures. The second line\'s numbers climb sharply: a shape above 1 gives a rising hazard, wear-out. The two batches show opposite patterns, not the same one at different speeds.',
  },
  {
    id: 'wb-b10-life',
    lessonId: 'weibull-lifetimes',
    kind: 'number',
    marks: 3,
    prompt:
      'A batch of bearings has Weibull shape 3 and scale 12,000 hours (both chosen for this question). The line above confirms every Weibull has failed this same share by its own scale. By what age, in hours, have a tenth of the bearings failed (the B10 life)? Round to the nearest 10 hours.',
    code: 'shape <- 3\nscale <- 12000\nround(pweibull(scale, shape, scale), 3)\n',
    answer: 'round(qweibull(0.1, shape, scale), -1)',
    tol: 5,
    unit: 'hours',
    explain: '`qweibull(p, shape, scale)` is the age by which a proportion `p` have failed. The line above uses `p = pweibull(scale, ...)`, the share failed by the scale itself; here `p` is 0.1 instead, with the same shape and scale.',
  },
  {
    id: 'wb-censoring-meaning',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 2,
    prompt:
      'A durability test runs 200 light bulbs for 1000 hours and then switches off. A bulb still lit when the test ends is recorded with status 0. What do you know about that bulb\'s true lifetime?',
    options: [
      { text: 'It is at least 1000 hours: the test stopped watching before the bulb failed', correct: true },
      { text: 'It is exactly 1000 hours' },
      { text: 'Nothing useful, so the bulb should be dropped from the analysis' },
      { text: 'It failed earlier, but the test only recorded it at the 1000-hour mark' },
    ],
    explain:
      'A censored time is a lower bound: the bulb lasted at least as long as recorded, and might have run for much longer had the test continued. It did not fail at 1000 hours, or earlier; the test simply stopped observing it. Bulbs still lit tend to be the long-lived ones, so dropping them is real information lost, not noise removed.',
  },
  {
    id: 'wb-fitdistr-reading',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 3,
    prompt: '35 bearings ran until every one failed, so these lifetimes are complete. What does the 95% interval for the shape say about how they failed?',
    code: 'library(MASS)\nset.seed(6)\nhours <- rweibull(35, shape = 1.5, scale = 800)\nfit <- fitdistr(hours, "weibull")\nfit\nconfint(fit)\n',
    options: [
      { text: 'The whole interval sits above 1, so these bearings\' failure rate rose with age: they wore out', correct: true },
      { text: 'The interval contains 1.5, so the true shape must be exactly 1.5' },
      { text: 'The interval is wide, so the fit has failed and cannot be trusted' },
      { text: 'The bearings show early failures, since the estimate is close to 1' },
    ],
    explain:
      'A shape of exactly 1 means a constant failure rate; the interval sits entirely above 1, so a constant rate is not consistent with these 35 lifetimes, and wear-out is the reading. An interval says which values the data can live with, not which single value is true, and its width here just reflects having only 35 bearings.',
  },
  {
    id: 'wb-censoring-bias',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 3,
    prompt:
      '400 simulated laptop batteries, many still working when the test ended. `drop_fit` leaves those batteries out; `full_fit` tells `survreg()` which ones are censored. Why does the first predicted median fall so far short of the second?',
    code:
      `${BATTERIES}` +
      'sum(status == 0)\n' +
      'drop_fit <- survreg(Surv(time[status == 1]) ~ 1, dist = "weibull")\n' +
      'full_fit <- survreg(Surv(time, status) ~ 1, dist = "weibull")\n' +
      'round(predict(drop_fit, newdata = data.frame(row = 1), type = "quantile", p = 0.5))\n' +
      'round(predict(full_fit, newdata = data.frame(row = 1), type = "quantile", p = 0.5))\n',
    options: [
      { text: 'A battery still working has not failed yet, so the ones dropped are exactly the longest-lived; what remains is tilted toward early failures', correct: true },
      { text: 'Fewer batteries means a smaller sample, and smaller samples give shorter lifetimes' },
      { text: 'It does not really fall short; the two medians should come out about the same' },
      { text: 'The censored batteries were unusually short-lived, so removing them should raise the median' },
    ],
    explain:
      'Censoring is not a random sample of the batteries: a battery is still running precisely because it has lasted this long, so the running ones are the long-lived ones. Dropping them leaves a data set tilted toward the batteries that already failed, mostly the early ones, which drags the fitted median down. A smaller sample is less precise, not systematically shorter, and the running batteries are the long-lived ones, not the short-lived ones.',
  },
  {
    id: 'wb-scale-shape-reading',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 2,
    prompt: 'This `survreg()` fit\'s printed Scale is below 1. What does that say about how these batteries fail?',
    code: `${BATTERIES}fit <- survreg(Surv(time, status) ~ 1, dist = "weibull")\nsummary(fit)\n`,
    options: [
      { text: '1 / Scale, the shape, is above 1, so the failure rate rises with age: the batteries wear out', correct: true },
      { text: 'Scale is the Weibull scale itself, so a typical battery fails before 1 unit of time' },
      { text: 'A Scale below 1 always means the model failed to fit properly' },
      { text: '1 / Scale is below 1, so the failure rate falls with age: early failures' },
    ],
    explain:
      '`survreg()`\'s `Scale` is 1 / shape, a different quantity from the Weibull scale that `dweibull()` takes (that one is `exp()` of the intercept, in the units of the data). A `Scale` below 1 makes the shape above 1, which is a rising failure rate: wear-out. It says nothing about the model failing, and nothing about typical lifetime, which lives in the intercept.',
  },
  {
    id: 'wb-time-ratio-meaning',
    lessonId: 'weibull-lifetimes',
    kind: 'choice',
    marks: 3,
    prompt: '`exp()` of the `padceramic` coefficient is the time ratio between the two pad designs. Which sentence says what it means?',
    code: `${BRAKES}${BRAKES_FIT}summary(fit)\nexp(coef(fit))\n`,
    options: [
      { text: 'A ceramic-pad brake is expected to last that many times as long as an organic-pad one: its median, its B10 life, every quantile is multiplied by it', correct: true },
      { text: 'A ceramic-pad brake lasts that many kilometres longer than an organic-pad one' },
      { text: 'A ceramic-pad brake fails at that many times the rate of an organic-pad one' },
      { text: 'The time ratio only applies to the median lifetime, not to other quantiles' },
    ],
    explain:
      'On the log-time scale a coefficient adds; `exp()` of it multiplies, and that multiplier stretches the whole lifetime distribution by the same factor, which is why this is called an accelerated failure time model. It is not an amount of extra distance, and a higher time ratio means a lower failure rate, not a higher one, since the pads last longer.',
  },
  {
    id: 'wb-predicted-median',
    lessonId: 'weibull-lifetimes',
    kind: 'number',
    marks: 3,
    prompt: 'What is the predicted median lifetime, in kilometres, for the ceramic pads? Round to the nearest 100.',
    code: `${BRAKES}${BRAKES_FIT}pads <- data.frame(pad = c("organic", "ceramic"))\nround(predict(fit, newdata = pads, type = "quantile", p = 0.5))\n`,
    answer: 'round(predict(fit, newdata = pads, type = "quantile", p = 0.5)[[2]], -2)',
    tol: 55,
    unit: 'km',
    explain: '`pads` lists organic first and ceramic second, so the second entry of `predict(..., type = "quantile", p = 0.5)` is the predicted median for ceramic pads.',
  },
  {
    id: 'wb-surv-print',
    lessonId: 'weibull-lifetimes',
    kind: 'predict',
    marks: 2,
    prompt: 'Four components: the first and third failed, the second and fourth were still running when the records were pulled. What does this print?',
    code: 'library(survival)\ntime <- c(5, 8, 3, 10)\nstatus <- c(1, 0, 1, 0)\nSurv(time, status)\n',
    choices: [
      '[1]  5   8+  3  10+',
      '[1]  5+  8   3+ 10 ',
      '[1] 5 8 3 10',
      '[1]  5   8   3  10+',
    ],
    explain:
      '`Surv()` marks a censored time, `status` 0, with a `+`. Here that is the second and fourth entries, 8 and 10; the first and third, 5 and 3, are complete failure times and print with no mark at all.',
  },
  {
    id: 'wb-time-ratios-write',
    lessonId: 'weibull-lifetimes',
    kind: 'write',
    marks: 5,
    prompt:
      'Write a function `time_ratios(fit)` that takes a `survreg()` Weibull fit and returns the time ratio for every predictor in the model: `exp()` of every coefficient except the intercept, as a vector.',
    run: 'function',
    fnName: 'time_ratios',
    starter: 'time_ratios <- function(fit) {\n  # exp() of every coefficient except the intercept\n}\n',
    solution: 'time_ratios <- function(fit) {\n  exp(coef(fit)[-1])\n}\n',
    tests: [
      {
        id: 'pumps',
        label: 'pump seals, one predictor',
        hidden: false,
        setup:
          'library(survival)\nset.seed(3)\nseal <- factor(rep(c("old", "new"), each = 60), levels = c("old", "new"))\nlife <- rweibull(120, shape = 2, scale = ifelse(seal == "old", 4, 6))\ninservice <- runif(120, 1, 8)\npumps <- data.frame(seal, time = round(pmin(life, inservice), 2), status = as.numeric(life <= inservice))\nfit <- survreg(Surv(time, status) ~ seal, data = pumps, dist = "weibull")',
        call: 'time_ratios(fit)',
        expect:
          'local({ library(survival); set.seed(3); seal <- factor(rep(c("old", "new"), each = 60), levels = c("old", "new")); life <- rweibull(120, shape = 2, scale = ifelse(seal == "old", 4, 6)); inservice <- runif(120, 1, 8); pumps <- data.frame(seal, time = round(pmin(life, inservice), 2), status = as.numeric(life <= inservice)); f <- survreg(Surv(time, status) ~ seal, data = pumps, dist = "weibull"); exp(coef(f)[-1]) })',
        cmp: 'float',
      },
      {
        id: 'brakes',
        label: 'brake pads, one predictor',
        hidden: false,
        setup: `${BRAKES}${BRAKES_FIT}`,
        call: 'time_ratios(fit)',
        expect: `local({ ${BRAKES}${BRAKES_FIT}exp(coef(fit)[-1]) })`,
        cmp: 'float',
      },
      {
        id: 'no-predictors',
        label: 'a model with no predictors at all',
        hidden: true,
        setup: `${BRAKES}fit <- survreg(Surv(time, status) ~ 1, data = brakes, dist = "weibull")`,
        call: 'time_ratios(fit)',
        expect: `local({ ${BRAKES}f <- survreg(Surv(time, status) ~ 1, data = brakes, dist = "weibull"); exp(coef(f)[-1]) })`,
        cmp: 'float',
      },
      {
        id: 'two-predictors',
        label: 'two predictors together',
        hidden: true,
        setup:
          'library(survival)\nset.seed(9)\nn <- 150\nspeed <- runif(n, 5, 25)\nload <- factor(rep(c("light", "heavy"), length.out = n))\nlife <- rweibull(n, shape = 2, scale = exp(4 - 0.03 * speed + ifelse(load == "heavy", -0.4, 0)))\nlimit <- runif(n, 10, 120)\nbelts <- data.frame(speed, load, time = pmin(life, limit), status = as.numeric(life <= limit))\nfit <- survreg(Surv(time, status) ~ speed + load, data = belts, dist = "weibull")',
        call: 'time_ratios(fit)',
        expect:
          'local({ library(survival); set.seed(9); n <- 150; speed <- runif(n, 5, 25); load <- factor(rep(c("light", "heavy"), length.out = n)); life <- rweibull(n, shape = 2, scale = exp(4 - 0.03 * speed + ifelse(load == "heavy", -0.4, 0))); limit <- runif(n, 10, 120); belts <- data.frame(speed, load, time = pmin(life, limit), status = as.numeric(life <= limit)); f <- survreg(Surv(time, status) ~ speed + load, data = belts, dist = "weibull"); exp(coef(f)[-1]) })',
        cmp: 'float',
      },
    ],
    explain: '`coef(fit)` starts with the intercept; `[-1]` drops it, leaving one coefficient per predictor. `exp()` turns each into a time ratio.',
  },
];

export default questions;
