// Weibull lifetimes: how long a machine runs before it fails, with some machines still running.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types an estimate, a median or a time ratio. All the data are simulated pumps with rweibull(), so the
// truth is known and the reader can see how close each method comes to it. The first card draws the
// Weibull failure rate for a shape the reader chooses; the second fits three ways of handling pumps that
// are still running and compares each fit with the true curve.
import type { Lesson } from '../../lessonSchema.ts';

/** Ten pumps: when each would fail, and how long it had been installed when the records were pulled. */
const TEN_PUMPS =
  'set.seed(9)\n' +
  'life <- round(rweibull(10, shape = 2, scale = 5), 1)\n' +
  'inservice <- round(runif(10, 1, 9), 1)\n';

/** Forty pumps of a retired design, every one run until it failed: complete lifetimes. */
const RETIRED =
  'set.seed(1)\n' +
  'years <- rweibull(40, shape = 2, scale = 5)\n';

/** 120 pumps at a working site, 60 per seal design, installed 1 to 8 years ago; many still running. */
const PUMPS =
  'set.seed(3)\n' +
  'seal <- factor(rep(c("old", "new"), each = 60), levels = c("old", "new"))\n' +
  'life <- rweibull(120, shape = 2, scale = ifelse(seal == "old", 4, 6))\n' +
  'inservice <- runif(120, 1, 8)\n' +
  'pumps <- data.frame(seal, time = round(pmin(life, inservice), 2), status = as.numeric(life <= inservice))\n';

const PUMPS_FIT = 'fit <- survreg(Surv(time, status) ~ seal, data = pumps, dist = "weibull")\n';

/** Light bulbs with a falling failure rate, some still lit when the test stops: for a hidden test. */
const BULBS =
  'set.seed(8)\n' +
  'life <- rweibull(80, shape = 0.7, scale = 3)\n' +
  'limit <- runif(80, 0.5, 6)\n' +
  'bulbs <- data.frame(time = pmin(life, limit), status = as.numeric(life <= limit))\n';

/** A curve over ages 0 to 12 years, for the censoring card's picture. */
const survivalCurve = (shape: string, scale: string) =>
  `local({ age <- seq(0, 12, by = 0.25); cbind(age, pweibull(age, ${shape}, ${scale}, lower.tail = FALSE)) })`;

const lesson: Lesson = {
  id: 'weibull-lifetimes',
  title: 'How long until it fails: Weibull lifetimes',
  summary: 'Lifetimes that are skewed and often censored, the Weibull shape and scale, and fitting them in R with fitdistr() and survreg()',
  track: 'stat2402',
  order: 14,
  prereqs: ['gamma-regression'],
  minutes: 18,
  outcomes: [
    'Say why lifetimes are positive, skewed and often censored, and what a censored time tells you',
    'Use `dweibull()`, `pweibull()` and `qweibull()`, and read the Weibull shape as a failure rate that falls, stays flat or rises with age',
    'Fit a Weibull to complete lifetimes with `fitdistr()` from MASS and read its estimates and standard errors',
    'Explain why leaving out censored units, or counting them as failures, makes lifetimes look too short',
    'Fit `survreg(Surv(time, status) ~ group, dist = "weibull")` and turn its output into a shape, a time ratio and predicted median lifetimes',
  ],
  sections: [
    {
      id: 'lifetimes',
      title: 'Lifetimes are different',
      blocks: [
        {
          kind: 'prose',
          body:
            'Think of the pumps at a mine site. Each one runs until something wears through, and the questions engineers ask are about how long that takes: by what age half of them have failed, how likely one is to fail next year, whether a new design lasts longer. The data are **lifetimes**, and they are awkward in three ways.\n\n' +
            'They are **positive**: nothing fails before it is installed. They are **skewed**: most pumps fail around some typical age, but a few keep going far longer. And they are usually **censored**: when you pull the records, some pumps are still running. For those you know how long they have lasted so far, not how long they will last.',
        },
        {
          kind: 'code',
          code:
            TEN_PUMPS +
            'data.frame(life, inservice, time = pmin(life, inservice), status = as.numeric(life <= inservice))\n',
          caption: 'Ten simulated pumps. `life` is the age at which each would fail, and `inservice` is how long it had been installed when the records were pulled. A real data set has only the last two columns.',
        },
        {
          kind: 'prose',
          body:
            '`time` is what the records show: the age at failure if the pump failed (`status` 1), or its age when the records were pulled if it is still running (`status` 0). A pump with `status` 0 is **censored**: its lifetime is *at least* `time`, and in every such row the simulation\'s `life` column shows it had longer to go.\n\n' +
            'Leaving those pumps out, or pretending they failed on the day the records were pulled, both change the answer. This lesson shows by how much, and how R uses a censored time for exactly what it is.',
        },
        {
          kind: 'quiz',
          prompt: 'A pump\'s record has `status` 0. What do you know about how long it will last?',
          options: [
            { text: 'At least as long as its `time`: it was still running when the records were pulled', correct: true, why: 'A censored time is a lower bound. The pump lasted that long and then the records stopped watching, so its true lifetime is that long or longer.' },
            { text: 'Exactly its `time`', why: 'That is what a `status` of 1 means: the pump failed at that age. A `status` of 0 says it had not failed yet.' },
            { text: 'Nothing useful, so it should be left out of the analysis', why: 'Knowing a pump lasted at least a certain time is real information, and the pumps still running tend to be the long-lived ones. Leaving them out tilts the data toward early failures, as a card later in this lesson shows.' },
          ],
        },
      ],
    },
    {
      id: 'the-weibull',
      title: 'The Weibull distribution',
      blocks: [
        {
          kind: 'prose',
          body:
            'The **Weibull distribution** is the usual first model for lifetimes. It has two parameters:\n\n' +
            '- the **shape** k, a number with no units, which sets the pattern of failures over a unit\'s life;\n' +
            '- the **scale** λ, in the units of the time, which sets how long units tend to last.\n\n' +
            'The chance a unit is still working at age t, its **survival function**, is S(t) = exp(−(t/λ)^k). R has the usual four functions, each taking `shape` and then `scale`: `dweibull()` for the density, `pweibull()` for the chance of failing by age t, `qweibull()` for the age by which a proportion p have failed, and `rweibull()` for random lifetimes, which is how every data set in this lesson is made.',
        },
        {
          kind: 'shell',
          lines: [
            'pweibull(3, shape = 2, scale = 5)',
            'pweibull(3, shape = 2, scale = 5, lower.tail = FALSE)',
            'exp(-(3 / 5)^2)',
            'qweibull(0.5, shape = 2, scale = 5)',
            'qweibull(0.1, shape = 2, scale = 5)',
          ],
          caption: 'For pumps with shape 2 and scale 5 years: the chance one has failed by age 3; the chance it is still working at age 3, which the survival formula gives too; the median lifetime; and the age by which a tenth have failed, which engineers call the B10 life.',
        },
        {
          kind: 'predict',
          code: 'pweibull(5, shape = c(0.5, 1, 3), scale = 5)\n',
          ask: 'Three kinds of pump, all with a scale of 5 years, with shapes 0.5, 1 and 3. What share of each kind has failed by age 5, the scale itself?',
          choices: [
            '[1] 0.6321206 0.6321206 0.6321206',
            '[1] 0.5 0.5 0.5',
            '[1] 0.3934693 0.6321206 0.8646647',
          ],
        },
        {
          kind: 'prose',
          body:
            'At age t = λ, (t/λ)^k is 1 whatever k is, so every Weibull has failed the same share by its scale: 1 − e^(−1). That is why the scale is also called the **characteristic life**. It is not the median: the median in the session above is shorter than the scale of 5 years.',
        },
      ],
    },
    {
      id: 'the-shape',
      title: 'What the shape says',
      blocks: [
        {
          kind: 'prose',
          body:
            'The density says when failures happen across a whole fleet. Engineers usually want something sharper: for a pump that has survived to age t, how likely is it to fail *now*? That is the **hazard**, or **failure rate**: h(t) = f(t) / S(t), the density divided by the chance of still working. For a Weibull it comes out as\n\n' +
            'h(t) = (k/λ)(t/λ)^(k−1)\n\n' +
            'and the shape decides its pattern through the power k − 1. The card draws it from R\'s own `dweibull()` and `pweibull()`, beside the **exponential**, which is the Weibull with k = 1. It also prints the mean lifetime, λ·Γ(1 + 1/k), where `gamma()` is R\'s Γ.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'weibull-shape',
            title: 'The shape and the failure rate',
            intro: 'Drag the **shape**, from 0.5 to 3, with the scale held at 5 years. Watch whether the failure rate falls, stays flat or climbs with age, and compare the rates R prints at ages 1 and 8. Switch to the density to see what the same shape does to the spread of lifetimes.',
            template:
              'k <- ⟦tenths⟧ / 10\n' +
              'age <- seq(0.25, 10, by = 0.25)\n' +
              'draw <- function(shape) ⟦view⟧\n' +
              'failure_rate <- function(t) dweibull(t, k, 5) / pweibull(t, k, 5, lower.tail = FALSE)\n' +
              'cat("Shape:", k, "  scale: 5 years\\n")\n' +
              'cat("Median lifetime:", round(qweibull(0.5, k, 5), 2), "years\\n")\n' +
              'cat("Mean lifetime:  ", round(5 * gamma(1 + 1 / k), 2), "years\\n")\n' +
              'cat("Failure rate at age 1:", round(failure_rate(1), 3), "per year\\n")\n' +
              'cat("Failure rate at age 8:", round(failure_rate(8), 3), "per year\\n")\n',
            knobs: [
              { id: 'tenths', kind: 'range', label: 'the shape k, in tenths', min: 5, max: 30, start: 15 },
              {
                id: 'view',
                label: 'what to draw',
                choices: [
                  { value: 'dweibull(age, shape, 5) / pweibull(age, shape, 5, lower.tail = FALSE)', caption: 'failure rate' },
                  { value: 'dweibull(age, shape, 5)', caption: 'density' },
                ],
              },
            ],
            probes: {
              yours: 'cbind(age, draw(k))',
              expo: 'cbind(age, draw(1))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'age, years',
              yLabel: 'per year',
              caption: 'Your Weibull beside the exponential, which has the same scale and a shape of exactly 1.',
              series: [
                { probe: 'yours', label: 'Weibull, your shape' },
                { probe: 'expo', label: 'exponential (shape 1)' },
              ],
            },
            takeaway:
              'Below 10 on the slider the shape is under 1 and the failure rate falls with age: the rate at age 1 is above the rate at age 8. That is the pattern of **early failures**, where a pump that gets through its first months is safer than a new one. At exactly 10 the Weibull *is* the exponential: the two curves lie on top of each other and the rate is the same at every age. Above 10 the rate climbs with age: **wear-out**. On the density view a small shape piles lifetimes up near zero with a long tail to the right, and a bigger shape gathers them into a hump. At every setting the mean is above the median, because a few long-lived pumps pull the mean up.',
          },
        },
        {
          kind: 'match',
          ask: 'Match each shape to the failure rate it gives, from h(t) = (k/λ)(t/λ)^(k−1).',
          pairs: [
            { left: 'shape below 1', right: 'falls with age: early failures' },
            { left: 'shape exactly 1', right: 'the same at every age: the exponential' },
            { left: 'shape exactly 2', right: 'rises in a straight line with age' },
            { left: 'shape above 2', right: 'climbs faster and faster: sharp wear-out' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A supplier\'s records say its bearings have a Weibull shape of about 0.6. Would replacing every bearing at a fixed age, before it fails, cut the number of failures?',
          options: [
            { text: 'No: with a shape below 1, a bearing that is still running is less likely to fail than a brand-new one, so swapping it for a new one raises the risk', correct: true, why: 'A falling failure rate means the weak bearings fail early and the survivors are the sound ones. Replacing on age only pays when the rate rises with age, a shape above 1.' },
            { text: 'Yes: replacing parts before they fail always cuts failures', why: 'Only when older parts are more likely to fail than new ones, which is a shape above 1. Below 1, a new part is the riskier one.' },
            { text: 'It makes no difference, because the failure rate is the same at every age', why: 'That is a shape of exactly 1, the exponential. At 0.6 the rate falls with age, so age does matter.' },
          ],
        },
      ],
    },
    {
      id: 'complete-lifetimes',
      title: 'Fitting complete lifetimes',
      blocks: [
        {
          kind: 'prose',
          body:
            'Sometimes every unit has failed. Say the mine retired an older pump design years ago, and all 40 of its pumps have a failure time. With no censoring the lifetimes are **complete**, and `fitdistr()` from the **MASS** package fits a Weibull by maximum likelihood: it finds the shape and scale under which these 40 lifetimes are most likely.',
        },
        {
          kind: 'code',
          code: 'library(MASS)\n' + RETIRED + 'fitdistr(years, "weibull")\n',
          caption: 'The simulation used a shape of 2 and a scale of 5 years, so you can see how close the estimates come.',
        },
        {
          kind: 'prose',
          body:
            'The top row holds the **estimates** and the bottom row, in brackets, their **standard errors**. They are maximum likelihood estimates like a glm\'s, so an estimate plus or minus about two standard errors gives an approximate 95% interval, and `confint()` works it out for you.',
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'set.seed(1)',
            'years <- rweibull(40, shape = 2, scale = 5)',
            'fit <- fitdistr(years, "weibull")',
            'fit$estimate',
            'fit$sd',
            'confint(fit)',
          ],
          caption: '`$estimate` and `$sd` pull the two rows out, for use in code; `confint()` gives the intervals.',
        },
        {
          kind: 'quiz',
          prompt: 'Look at the 95% interval for the shape. What does it say about how these pumps failed?',
          options: [
            { text: 'The whole interval is above 1, so the data point to a failure rate that rose with age: the pumps wore out', correct: true, why: 'A shape of 1 would mean a constant failure rate, and 1 is below the whole interval. Wear-out is what the simulation built in, with its shape of 2.' },
            { text: 'The interval contains 2, so the shape is exactly 2', why: 'It does contain 2, the value the simulation used, but it contains every other value inside it too. An interval tells you which values the data can live with, not which one is true.' },
            { text: 'The interval is wide, so the fit has failed', why: 'The width reflects having only 40 pumps. More pumps would narrow it; nothing about the fit is broken.' },
          ],
        },
      ],
    },
    {
      id: 'censored-lifetimes',
      title: 'Censored lifetimes',
      blocks: [
        {
          kind: 'prose',
          body:
            'At a working site, many pumps are still running. In R a lifetime with censoring is built with `Surv()` from the **survival** package: `Surv(time, status)` pairs each time with whether it ended in a failure. Printed, a censored time gets a `+`, for "at least this long".',
        },
        {
          kind: 'code',
          code:
            'library(survival)\n' +
            TEN_PUMPS +
            'Surv(pmin(life, inservice), as.numeric(life <= inservice))\n',
          caption: 'The same ten pumps as at the start. Every `+` is a pump still running when the records were pulled.',
        },
        {
          kind: 'prose',
          body:
            'There are two tempting shortcuts: leave the running pumps out, or count each one as failed at the age it had reached when the records were pulled. `survreg()`, also from **survival**, does neither. It fits a Weibull that uses each running pump for what it is, a lifetime of at least `time`. The card fits all three to pumps whose true lifetimes you know.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'censoring-shortcuts',
            title: 'Three ways to treat the pumps still running',
            intro: 'Five hundred simulated pumps whose lifetimes really are Weibull, with shape 2 and scale 5 years, installed at random times over the number of years you choose. Pick what to do with the pumps still running when the records are pulled, and compare the fitted curve with the true one. The two lines after the fit turn `survreg()`\'s output into a shape and a scale; the next section explains them.',
            template:
              'library(survival)\n' +
              'set.seed(4)\n' +
              'life <- rweibull(500, shape = 2, scale = 5)\n' +
              'inservice <- runif(500, 0, ⟦years⟧)\n' +
              'time <- pmin(life, inservice)\n' +
              'status <- as.numeric(life <= inservice)\n' +
              '⟦method⟧\n' +
              'k <- 1 / fit$scale\n' +
              'lambda <- exp(coef(fit)[[1]])\n' +
              'cat("Pumps still running:", sum(status == 0), "of 500\\n")\n' +
              'cat("Estimated shape:", round(k, 2), "  (true shape 2)\\n")\n' +
              'cat("Estimated scale:", round(lambda, 2), "years  (true scale 5)\\n")\n' +
              'cat("Estimated median lifetime:", round(qweibull(0.5, k, lambda), 2), "years\\n")\n' +
              'cat("True median lifetime:     ", round(qweibull(0.5, 2, 5), 2), "years\\n")\n',
            knobs: [
              {
                id: 'method',
                label: 'what to do with the pumps still running',
                choices: [
                  { value: 'fit <- survreg(Surv(time[status == 1]) ~ 1, dist = "weibull")', caption: 'leave them out' },
                  { value: 'fit <- survreg(Surv(time) ~ 1, dist = "weibull")', caption: 'count them as failed' },
                  { value: 'fit <- survreg(Surv(time, status) ~ 1, dist = "weibull")', caption: 'tell R they are still running' },
                ],
              },
              {
                id: 'years',
                label: 'the pumps were installed over the last',
                choices: [
                  { value: '4', caption: '4 years' },
                  { value: '8', caption: '8 years' },
                  { value: '16', caption: '16 years' },
                ],
              },
            ],
            probes: {
              truth: survivalCurve('2', '5'),
              fitted: survivalCurve('k', 'lambda'),
            },
            visual: {
              kind: 'plot',
              xLabel: 'age, years',
              yLabel: 'share of pumps still working',
              caption: 'The true survival curve the simulation used, and the one the chosen fit implies.',
              series: [
                { probe: 'truth', label: 'true curve' },
                { probe: 'fitted', label: 'fitted curve' },
              ],
            },
            takeaway:
              'Leaving the running pumps out, or counting them as failed, gives a curve that drops too early and a median lifetime short of the true one, at every setting. The fewer years the pumps were installed over, the more of them are still running and the worse the shortcuts get. Telling R which pumps are still running puts the fitted curve close to the true one each time, even when most of the pumps have not failed yet.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Why does leaving out the pumps still running make pumps look short-lived?',
          options: [
            { text: 'A pump is still running because it has not failed yet, so the ones left out are the ones that have lasted longest; what remains is tilted toward early failures', correct: true, why: 'Censoring is not a random sample of the pumps. A long-lived pump is far more likely to be running when the records are pulled, so dropping the running ones drops the long lives.' },
            { text: 'Fewer pumps means a smaller sample, and smaller samples give shorter lifetimes', why: 'A smaller random sample is less precise, not shorter on average. The trouble is *which* pumps are removed, not how many.' },
            { text: 'It does not; it only makes the standard errors bigger', why: 'The card shows the median falling short of the truth at every setting, and far short when most pumps are still running. That is a biased answer, not merely a less certain one.' },
          ],
        },
      ],
    },
    {
      id: 'reading-survreg',
      title: 'Reading survreg()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`survreg()` does not report the shape and scale that `dweibull()` takes. It treats the Weibull as a regression for the **log** of the lifetime:\n\n' +
            'log(T) = β₀ + σ·W\n\n' +
            'where W has a fixed distribution (the extreme value distribution) and σ is what `survreg()` calls **Scale**. Work through the algebra and β₀ = log(λ), the log of the Weibull scale, and σ = 1/k. Fit it to the retired pumps, where every lifetime is complete, and see.',
        },
        {
          kind: 'code',
          code: 'library(survival)\n' + RETIRED + 'sfit <- survreg(Surv(years) ~ 1, dist = "weibull")\nsfit\n',
          caption: '`Surv(years)` with no status says every lifetime ended in a failure.',
        },
        {
          kind: 'prose',
          body:
            'Two numbers matter: the `(Intercept)` and `Scale=`. The intercept is log(λ), so `exp()` of it is the Weibull scale, in years. `Scale` is 1/k, so the Weibull shape is `1 / sfit$scale`. Converted, they should match what `fitdistr()` found for the same 40 pumps.',
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'library(survival)',
            'set.seed(1)',
            'years <- rweibull(40, shape = 2, scale = 5)',
            'sfit <- survreg(Surv(years) ~ 1, dist = "weibull")',
            'c(shape = 1 / sfit$scale, scale = exp(coef(sfit)[[1]]))',
            'fitdistr(years, "weibull")$estimate',
          ],
          caption: 'The two pairs match except in the last digits, which differ because each function searches for the best values its own way and stops when it is close enough.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Two different scales',
          body:
            '`dweibull()`\'s `scale` is λ, a time in the units of the data. `survreg()`\'s `Scale` is σ = 1/k, a number with no units that describes the shape. They share a word and nothing else: `fit$scale` is survreg\'s, and the Weibull scale is `exp()` of the intercept.',
        },
        {
          kind: 'quiz',
          prompt: 'A Weibull `survreg()` fit to some light bulbs reports a `Scale` above 1. What does that say about the bulbs?',
          options: [
            { text: 'Their shape, 1 / Scale, is below 1, so the failure rate falls with age: early failures', correct: true, why: 'A Scale above 1 makes the shape below 1. Bulbs that survive their first hours are then safer than new ones.' },
            { text: 'They wear out, because a bigger scale means longer lives', why: 'That reads survreg\'s Scale as the Weibull scale λ. They are different things: how long the bulbs last is in the intercept, and Scale is about the shape.' },
            { text: 'They last more than one time unit on average', why: 'Scale has no units and says nothing about how long bulbs last. The intercept, through `exp()`, carries that.' },
          ],
        },
      ],
    },
    {
      id: 'two-designs',
      title: 'Comparing two designs',
      blocks: [
        {
          kind: 'prose',
          body:
            'Back to the working site, with a question engineers care about. Of its 120 pumps, 60 have an old seal design and 60 a new one. Each was installed between 1 and 8 years ago, and many are still running. The simulation gave both designs a shape of 2, and scales of 4 years for the old seal and 6 for the new, so in truth a new-seal pump lasts 1.5 times as long.',
        },
        {
          kind: 'code',
          code: PUMPS + 'head(pumps)\nwith(pumps, table(seal, status))\n',
          caption: '`status` is 1 for a failed pump and 0 for one still running. The new seal has more pumps still running, so leaving them out or counting them as failed would throw away more of what is known about it.',
        },
        {
          kind: 'code',
          code: 'library(survival)\n' + PUMPS + PUMPS_FIT + 'summary(fit)\n',
        },
        {
          kind: 'prose',
          body:
            'The `Value` column is on the **log-time** scale. `(Intercept)` is log(λ) for the baseline, old-seal pumps. `sealnew` is how much the new seal adds to log(λ); it is positive, so new-seal pumps last longer. The `Log(scale)` row is log(σ): its estimate is below 0, so σ is below 1 and the shape is above 1, and its test is of σ = 1, a shape of 1, the exponential.\n\n' +
            '`survreg()` fits **one** shape for both designs. It assumes the seal changes how long a pump lasts, not the pattern of its failures.',
        },
        {
          kind: 'code',
          code: 'library(survival)\n' + PUMPS + PUMPS_FIT + 'exp(coef(fit))\nexp(confint(fit))\n1 / fit$scale\n',
          caption: '`exp()` turns each coefficient into a multiplier on lifetime. The intercept\'s becomes the old seal\'s Weibull scale, in years, and `sealnew`\'s becomes the **time ratio**, with its 95% interval underneath. The last line is the shape.',
        },
        {
          kind: 'quiz',
          prompt: '`exp()` of the `sealnew` coefficient is the time ratio, and it is above 1. Which sentence says what it means?',
          options: [
            { text: 'A new-seal pump is expected to last that many times as long as an old-seal pump: its median, its B10 life, every age by which some share have failed, is multiplied by it', correct: true, why: 'On the log-time scale a coefficient adds; after `exp()` it multiplies. The whole lifetime distribution is stretched by the same factor, which is why this model is called an accelerated failure time model.' },
            { text: 'A new-seal pump lasts that many years longer than an old-seal pump', why: 'Effects on log time become multipliers, not additions. A ratio of 1.5 would mean half as long again, whether the old seal\'s lifetime is 2 years or 20.' },
            { text: 'A new-seal pump fails at that many times the rate of an old-seal pump', why: 'That would be a hazard ratio, a different quantity. A time ratio above 1 means longer lives, so the new seal\'s failure rate is lower, not higher.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'A time ratio is easiest to report beside the lifetimes themselves. `predict()` with `type = "quantile"` gives the age by which a proportion `p` of pumps have failed, for whatever new data you hand it, and `p = 0.5` is the predicted median lifetime.',
        },
        {
          kind: 'code',
          code:
            'library(survival)\n' + PUMPS + PUMPS_FIT +
            'seals <- data.frame(seal = c("old", "new"))\n' +
            'predict(fit, newdata = seals, type = "quantile", p = 0.5)\n' +
            'predict(fit, newdata = seals, type = "quantile", p = 0.1)\n' +
            'qweibull(0.5, shape = 2, scale = c(4, 6))\n',
          caption: 'The predicted median and B10 life for each design, old seal first. The last line is the true median for each design, from the shape and scales the simulation used.',
        },
        {
          kind: 'predict',
          code:
            'library(survival)\n' + PUMPS + PUMPS_FIT +
            'seals <- data.frame(seal = c("old", "new"))\n' +
            'q10 <- predict(fit, newdata = seals, type = "quantile", p = 0.1)\n' +
            'q50 <- predict(fit, newdata = seals, type = "quantile", p = 0.5)\n' +
            'round(unname(c(q10[2] / q10[1], q50[2] / q50[1])), 3)\n',
          ask: 'The new seal\'s predicted lifetime divided by the old seal\'s, first at the age by which a tenth have failed, then at the median. What does R print?',
          choices: [
            '[1] 1.531 1.531',
            '[1] 1.195 1.531',
            '[1] 2.343 1.531',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say it in lifetimes',
          body:
            '"The `sealnew` coefficient was significant" is not an interpretation. "New-seal pumps are estimated to last this many times as long as old-seal pumps (95% interval from here to there), a predicted median of this many years against that many" is. Name the time ratio, its interval and the lifetimes, in the units of the data.',
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
            'Write a function `weibull_params(fit)` that takes a Weibull `survreg()` fit with no predictors (a formula ending `~ 1`) and returns its shape and scale **the way `dweibull()` takes them**: the vector `c(shape, scale)`. The tests fit the models; your function only converts. One test checks your numbers against `fitdistr()` on complete lifetimes, and another hands them to `qweibull()` and compares with `survreg()`\'s own predicted median.',
          run: 'function',
          fnName: 'weibull_params',
          starter:
            'weibull_params <- function(fit) {\n' +
            '  # turn survreg\'s intercept and Scale into\n' +
            '  # the shape and scale dweibull() takes\n' +
            '}\n',
          solution:
            'weibull_params <- function(fit) {\n' +
            '  shape <- 1 / fit$scale\n' +
            '  scale <- exp(coef(fit)[[1]])\n' +
            '  c(shape = shape, scale = scale)\n' +
            '}\n',
          tests: [
            {
              id: 'retired',
              label: '40 pumps that all failed, against fitdistr()',
              hidden: false,
              setup: 'library(survival)\n' + RETIRED + 'fit <- survreg(Surv(years) ~ 1, dist = "weibull")',
              call: 'weibull_params(fit)',
              expect: 'local({ library(MASS); set.seed(1); years <- rweibull(40, shape = 2, scale = 5); fitdistr(years, "weibull")$estimate })',
              cmp: 'float',
              tol: 1e-4,
            },
            {
              id: 'pumps',
              label: '120 pumps, many still running: the median',
              hidden: false,
              setup: 'library(survival)\n' + PUMPS + 'fit <- survreg(Surv(time, status) ~ 1, data = pumps, dist = "weibull")',
              call: 'qweibull(0.5, weibull_params(fit)[1], weibull_params(fit)[2])',
              expect: `local({\n${PUMPS}f <- survreg(Surv(time, status) ~ 1, data = pumps, dist = "weibull")\npredict(f, newdata = data.frame(row = 1), type = "quantile", p = 0.5)\n})`,
              cmp: 'float',
            },
            {
              id: 'bulbs',
              label: 'light bulbs with early failures, some still lit: two quantiles',
              hidden: true,
              setup: 'library(survival)\n' + BULBS + 'fit <- survreg(Surv(time, status) ~ 1, data = bulbs, dist = "weibull")',
              call: 'qweibull(c(0.1, 0.9), weibull_params(fit)[1], weibull_params(fit)[2])',
              expect: `local({\n${BULBS}f <- survreg(Surv(time, status) ~ 1, data = bulbs, dist = "weibull")\nas.vector(predict(f, newdata = data.frame(row = 1), type = "quantile", p = c(0.1, 0.9)))\n})`,
              cmp: 'float',
            },
          ],
          hint: '`fit$scale` is survreg\'s Scale, which is 1 / shape. `coef(fit)[[1]]` is the intercept, which is log(scale), so `exp()` undoes it.',
        },
        {
          kind: 'steps',
          title: 'A routine for lifetime data',
          items: [
            'Build the response with `Surv(time, status)`: `status` 1 for a failure, 0 for a unit still running.',
            'Fit `survreg(Surv(time, status) ~ group, dist = "weibull")`. Never drop the censored units or count them as failures.',
            'Read the shape as `1 / fit$scale`: below 1 means early failures, 1 a constant failure rate, above 1 wear-out. The `Log(scale)` row tests a shape of 1.',
            'Turn coefficients into time ratios with `exp(coef(fit))` and `exp(confint(fit))`.',
            'Report predicted lifetimes with `predict(fit, newdata, type = "quantile", p = 0.5)`, in the units of the data.',
          ],
        },
      ],
    },
  ],
};

export default lesson;
