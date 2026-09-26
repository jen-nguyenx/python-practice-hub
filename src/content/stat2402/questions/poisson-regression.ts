// Exam questions for "Counting things: Poisson regression".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates. Datasets vary from the lesson's own
// InsectSprays/quakes/crashes examples where they can (quakes/depth, warpbreaks, a fresh offset example)
// so a question tests the idea rather than a memorised output.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'pois-quakes-negative-slope',
    lessonId: 'poisson-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'The `depth` coefficient is negative and its p-value is tiny. Which reading is right?',
    code: 'fit <- glm(stations ~ depth, family = poisson, data = quakes)\nsummary(fit)\n',
    options: [
      { text: 'Deeper earthquakes tend to be detected by fewer seismic stations, and a slope this far from zero would be unlikely if depth made no difference', correct: true },
      { text: 'Deeper earthquakes are detected by that many fewer stations' },
      { text: 'depth explains all of the variation in the number of stations' },
      { text: 'A slope this size means the Poisson model is not appropriate here' },
    ],
    explain: 'The sign of a log-scale coefficient carries through: negative means the expected count falls. Reading it as "that many fewer" treats a multiplicative effect as additive, and a small p-value is about whether the effect is real, not about how much variation is explained.',
  },
  {
    id: 'pois-rate-ratio-depth',
    lessonId: 'poisson-regression',
    kind: 'number',
    marks: 3,
    prompt: 'What is the rate ratio for an increase of 100 km in depth? Give your answer to two decimal places.',
    code: 'fit <- glm(stations ~ depth, family = poisson, data = quakes)\ncoef(fit)\n',
    answer: 'round(exp(100 * coef(fit)[["depth"]]), 2)',
    tol: 0.006,
    explain: 'A rate ratio for a step of 100 is `exp()` of 100 times the slope, since the change in the log of the rate is 100 times as large as it is for one unit.',
  },
  {
    id: 'pois-predicted-count-depth',
    lessonId: 'poisson-regression',
    kind: 'number',
    marks: 3,
    prompt: 'Using the coefficients above, what count does the model predict for an earthquake at 300 km depth? Give your answer to one decimal place.',
    code: 'fit <- glm(stations ~ depth, family = poisson, data = quakes)\ncoef(fit)\n',
    answer: 'round(predict(fit, data.frame(depth = 300), type = "response"), 1)',
    tol: 0.06,
    unit: 'stations',
    explain: 'The predicted count is exp() of the intercept plus the slope times 300. `predict(fit, newdata, type = "response")` does that sum for you.',
  },
  {
    id: 'pois-baseline-level',
    lessonId: 'poisson-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'Which tension level is the baseline that `tensionM` and `tensionH` are compared against?',
    code: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)\nsummary(fit)\n',
    options: [
      { text: 'L', correct: true },
      { text: 'M' },
      { text: 'H' },
      { text: 'There is no baseline; each level gets its own independent coefficient' },
    ],
    explain: 'R makes a factor\'s first level the baseline and gives every other level its own coefficient against it. `tension` has levels L, M and H in that order, so L has no row of its own; the intercept is its log mean count.',
  },
  {
    id: 'pois-oddsratio-below-one',
    lessonId: 'poisson-regression',
    kind: 'choice',
    marks: 3,
    prompt: 'The rate ratio for `tensionH` is below 1. What does that mean?',
    code: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)\nexp(coef(fit))\n',
    options: [
      { text: 'Looms run at high tension are expected to have that fraction of the breaks of looms run at low tension', correct: true },
      { text: 'Looms run at high tension have that many fewer breaks than looms run at low tension' },
      { text: 'High tension causes that fraction of all breaks across the whole experiment' },
      { text: 'High tension looms broke less often than expected, so the model does not fit' },
    ],
    explain: 'A rate ratio multiplies the baseline mean; below 1 means fewer breaks, by that factor. Reading it as a difference confuses the log link\'s multiplication with subtraction, and a rate ratio below 1 is an ordinary, well-fitting result, not a sign of a problem.',
  },
  {
    id: 'pois-family-default-link',
    lessonId: 'poisson-regression',
    kind: 'predict',
    marks: 2,
    prompt: 'Someone fits this model without setting `family`. What does the link turn out to be?',
    code: 'fit <- glm(count ~ spray, data = InsectSprays)\nfamily(fit)$link\n',
    choices: ['[1] "identity"', '[1] "log"', '[1] "logit"', '[1] "poisson"'],
    explain: 'Leaving `family` out fits the default gaussian family, whose link is the identity: an ordinary straight line with none of the guarantees a count model gives. `family(fit)` is exactly how you would catch this before trusting the output.',
  },
  {
    id: 'pois-predict-no-type',
    lessonId: 'poisson-regression',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)\nnew <- data.frame(tension = "H")\npredict(fit, new)\n',
    choices: ['       1 \n3.075775', '       1 \n21.66667', '[1] 3.075775', '       1 \n-3.075775'],
    explain: '`predict()` without `type` gives the linear predictor, which is on the log scale, named by the row of `new` it came from. `type = "response"` would undo the log and give the count itself.',
  },
  {
    id: 'pois-offset-interpretation',
    lessonId: 'poisson-regression',
    kind: 'choice',
    marks: 3,
    prompt: 'A council records cable faults at two kinds of site, watched for different numbers of months. What does the `regionsouth` rate ratio tell you?',
    code:
      'sites <- data.frame(\n' +
      '  region = rep(c("north", "south"), each = 3),\n' +
      '  months = c(4, 6, 9, 2, 5, 7),\n' +
      '  faults = c(9, 15, 20, 3, 10, 12)\n' +
      ')\n' +
      'fit <- glm(faults ~ region + offset(log(months)), family = poisson, data = sites)\n' +
      'exp(coef(fit))\n',
    options: [
      { text: 'It multiplies the north sites\' expected faults per month by that factor to get the south sites\' expected faults per month', correct: true },
      { text: 'It multiplies the total number of faults recorded at south sites by that factor' },
      { text: 'It is the extra number of months south sites were watched, compared with north' },
      { text: 'It has no scale, since `months` was never given a coefficient of its own' },
    ],
    explain: 'The offset fixes `log(months)`\'s coefficient at 1, so the model is for the rate per month, and every other coefficient compares rates rather than raw totals. The ratio is still a multiplier on a rate, exactly like an ordinary rate ratio, not a count of months.',
  },
  {
    id: 'pois-overdispersion-preview',
    lessonId: 'poisson-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'In the `count ~ spray` model, the dispersion line reads "taken to be 1". What does that mean?',
    code: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\nsummary(fit)\n',
    options: [
      { text: 'The Poisson family assumes the variance equals the mean, so nothing about the spread was estimated from the data', correct: true },
      { text: 'R checked the data and found the variance really does equal the mean' },
      { text: 'Every spray has the same average insect count' },
      { text: 'The model has only one parameter left to estimate' },
    ],
    explain: 'A Poisson model builds the variance = mean assumption in by fixing the dispersion at 1, whatever the data look like. Whether that assumption actually holds has to be checked separately, which is the next lesson\'s subject.',
  },
  {
    id: 'pois-predicted-count-fn',
    lessonId: 'poisson-regression',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function `predicted_count(fit, newdata)` that takes a fitted Poisson regression and a data frame of new rows, and returns the predicted counts as plain numbers (no names).',
    run: 'function',
    fnName: 'predicted_count',
    starter: 'predicted_count <- function(fit, newdata) {\n  # use predict() with the right type to get a count\n}\n',
    solution: 'predicted_count <- function(fit, newdata) {\n  unname(predict(fit, newdata, type = "response"))\n}\n',
    tests: [
      {
        id: 'quakes-depth', label: 'stations detecting one quake', hidden: false,
        setup: 'fit <- glm(stations ~ depth, family = poisson, data = quakes)',
        call: 'predicted_count(fit, data.frame(depth = 200))',
        expect: 'unname(predict(glm(stations ~ depth, family = poisson, data = quakes), data.frame(depth = 200), type = "response"))',
        cmp: 'float',
      },
      {
        id: 'warpbreaks-tension', label: 'breaks at one tension level', hidden: false,
        setup: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)',
        call: 'predicted_count(fit, data.frame(tension = "M"))',
        expect: 'unname(predict(glm(breaks ~ tension, family = poisson, data = warpbreaks), data.frame(tension = "M"), type = "response"))',
        cmp: 'float',
      },
      {
        id: 'several-depths', label: 'several depths at once', hidden: true,
        setup: 'fit <- glm(stations ~ depth, family = poisson, data = quakes)',
        call: 'predicted_count(fit, data.frame(depth = c(100, 300, 500)))',
        expect: 'unname(predict(glm(stations ~ depth, family = poisson, data = quakes), data.frame(depth = c(100, 300, 500)), type = "response"))',
        cmp: 'float',
      },
      {
        id: 'with-offset', label: 'a model with an offset', hidden: true,
        setup:
          'sites <- data.frame(region = rep(c("north", "south"), each = 3), months = c(4, 6, 9, 2, 5, 7), faults = c(9, 15, 20, 3, 10, 12))\n' +
          'fit <- glm(faults ~ region + offset(log(months)), family = poisson, data = sites)',
        call: 'predicted_count(fit, data.frame(region = "south", months = 12))',
        expect:
          'unname(predict(glm(faults ~ region + offset(log(months)), family = poisson, ' +
          'data = data.frame(region = rep(c("north", "south"), each = 3), months = c(4, 6, 9, 2, 5, 7), faults = c(9, 15, 20, 3, 10, 12))), data.frame(region = "south", months = 12), type = "response"))',
        cmp: 'float',
      },
    ],
    explain: '`predict()` needs `type = "response"` to undo the log link and return a count; for a model with an offset, `newdata` must include a value for the offset variable too, here `months`.',
  },
];

export default questions;
