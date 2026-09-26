// Exam questions for "Saying what the model found, to someone who is not a statistician", the capstone
// STAT2402 lesson. It ranges across every model family the track covers, so this bank does too: a
// quasi-Poisson count model, a negative binomial one, a logistic one and a Gamma one, on data the lesson
// itself never used (InsectSprays, MASS::quine, mtcars$vs, trees, attenu), so the scenarios are fresh
// while the reporting mistakes are the same ones the lesson names.
//
// Every output shown with a question was printed by R when the verifier ran it, and every number question's
// answer is an R expression the verifier evaluates: no option, prompt or explanation states a number R
// computed.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'rr-pct-scale',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 2,
    prompt:
      'This quasi-Poisson model compares the mean insect count under five sprays with spray A. The `sprayC` estimate is negative. What is the right way to turn it into something a grower can use?',
    code: 'fit <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)\nsummary(fit)$coefficients\n',
    options: [
      {
        text: 'Exponentiate it and subtract 1, then multiply by 100, to get the percentage change in the mean count compared with spray A',
        correct: true,
      },
      { text: 'Multiply it by 100 directly, since a coefficient from a count model is already a proportion' },
      { text: 'It already is the percentage change in the mean count, read straight off the table' },
      { text: 'It is the change in the probability that a single insect survives the spray' },
    ],
    explain:
      'A quasi-Poisson model has a log link, so a coefficient b multiplies the mean count by exp(b). `100 * (exp(b) - 1)` turns that multiplier into a percentage change. Reading the log-scale number straight off the table, or treating it as already a percentage, skips the exponentiation the log link demands. It is a count that changes, not a probability, so it is not a chance of survival either.',
  },
  {
    id: 'rr-pct-number',
    lessonId: 'reporting-results',
    kind: 'number',
    marks: 3,
    prompt:
      'Using the coefficients below, what percentage change in the mean insect count does the `sprayC` estimate imply, compared with spray A? Give it to one decimal place.',
    code: 'fit <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)\nsummary(fit)$coefficients\n',
    answer: 'round(100 * (exp(coef(fit)[["sprayC"]]) - 1), 1)',
    tol: 0.06,
    unit: '%',
    explain:
      'The percentage change on a log link is `100 * (exp(b) - 1)`, with b the `sprayC` estimate. The estimate is negative, so the multiplier is below 1 and the percentage change is negative too: fewer breaks under spray C than under spray A.',
  },
  {
    id: 'rr-ci-both-ends',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 3,
    prompt:
      'This negative binomial model of school absences compares ethnicity N with the baseline, ethnicity A, holding sex fixed. You want a 95% interval for the percentage change in mean days absent that the `EthN` row implies. Which is the correct way to build it?',
    code:
      'library(MASS)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex, data = quine)\n' +
      'suppressMessages(confint(nb))\n',
    options: [
      {
        text: 'Exponentiate each end of the interval for the coefficient separately, then convert each of those two ratios to a percentage with 100 × (ratio − 1)',
        correct: true,
      },
      { text: 'Convert the estimate to a percentage first, then add and subtract 1.96 times the standard error in percentage-point units' },
      { text: 'Exponentiate the estimate to get the ratio, then add and subtract 1.96 standard errors on that ratio scale' },
      { text: 'Use only the upper end of the interval for the coefficient, since a negative estimate already means fewer absences' },
    ],
    explain:
      'The interval is built on the log scale, where the standard error applies, and only then transformed. Exponentiating both ends and converting each one separately keeps whatever was inside the log-scale interval inside the transformed one. Working in percentage-point units, or adding standard errors after exponentiating, mixes a log-scale spread with a ratio- or percentage-scale number; dropping an end throws away half the interval for no reason.',
  },
  {
    id: 'rr-ci-lower-number',
    lessonId: 'reporting-results',
    kind: 'number',
    marks: 3,
    prompt:
      'The output gives a 95% interval, built on the link scale, for the predicted mean number of days absent for an ethnicity N, sex M child. What is the lower end of that interval? Give it to one decimal place.',
    code:
      'library(MASS)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex, data = quine)\n' +
      'p <- predict(nb, data.frame(Eth = "N", Sex = "M"), type = "link", se.fit = TRUE)\n' +
      'ci <- exp(p$fit + c(-1.96, 0, 1.96) * p$se.fit)\n' +
      'names(ci) <- c("lower", "estimate", "upper")\n' +
      'ci\n',
    answer: 'round(ci[["lower"]], 1)',
    tol: 0.06,
    unit: 'days',
    explain:
      'The interval is read straight from the printed table: the value under `lower`. It was built by taking the prediction on the log scale minus 1.96 standard errors, then undoing the log link with `exp()`.',
  },
  {
    id: 'rr-predict-scale',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 3,
    prompt:
      'Both lines below give a 95% interval for the chance of a straight engine (`vs`) in a 300 hp car, built two different ways. Which is the right one to report?',
    code:
      'fit <- glm(vs ~ hp, family = binomial, data = mtcars)\n' +
      'p_link <- predict(fit, data.frame(hp = 300), type = "link", se.fit = TRUE)\n' +
      'p_resp <- predict(fit, data.frame(hp = 300), type = "response", se.fit = TRUE)\n' +
      'plogis(p_link$fit + c(-1.96, 1.96) * p_link$se.fit)\n' +
      'p_resp$fit + c(-1.96, 1.96) * p_resp$se.fit\n',
    options: [
      {
        text: 'The first: predict on the log-odds scale with its standard error, then transform both ends with `plogis()`, which always lands between 0 and 1',
        correct: true,
      },
      { text: 'The second, because a standard error should always be added on the scale you plan to report' },
      { text: 'Either one, since both come from the same fitted model and the same standard error of prediction' },
      { text: 'Neither: once `predict()` gives a chance, no interval is needed around it' },
      { text: 'The second, because it is quicker to read straight off `type = "response"` without transforming anything' },
    ],
    explain:
      'The model is a straight line on the log-odds scale, so that is where the standard error applies; `plogis()` undoes the logit link on both ends without ever leaving 0 to 1. Look at what the second line actually printed: one end sits below zero, a chance that cannot exist, because it was built by adding a log-odds-sized spread directly to a probability near the edge of its range.',
  },
  {
    id: 'rr-predicted-prob-number',
    lessonId: 'reporting-results',
    kind: 'number',
    marks: 2,
    prompt:
      'What percentage chance does the model give a 120 hp car of having a straight engine? Give a whole number.',
    code: 'fit <- glm(vs ~ hp, family = binomial, data = mtcars)\npredict(fit, data.frame(hp = 120), type = "response")\n',
    answer: 'round(100 * predict(fit, data.frame(hp = 120), type = "response")[[1]])',
    tol: 0.6,
    unit: '%',
    explain:
      '`type = "response"` undoes the logit link, so `predict()` returns a chance directly. Multiply by 100 for a percentage.',
  },
  {
    id: 'rr-odds-vs-probability',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 3,
    prompt: 'This is the odds ratio for an extra 10 hp. Which sentence reports it correctly?',
    code: 'fit <- glm(vs ~ hp, family = binomial, data = mtcars)\nexp(10 * coef(fit)[["hp"]])\n',
    options: [
      {
        text: 'Each extra 10 hp multiplies the odds of a straight engine by the ratio shown; that is not the same as saying the chance changes by that factor',
        correct: true,
      },
      { text: 'Each extra 10 hp makes a straight engine that many times as likely' },
      { text: 'Each extra 10 hp lowers the chance of a straight engine by the same fixed amount, whatever the starting horsepower' },
      { text: 'The ratio is below 1 because horsepower explains most of the variation in engine shape' },
    ],
    explain:
      'A coefficient on a logit link multiplies odds, not chances: "times as likely" describes probabilities, and the two only agree when the chance in question is tiny. The predicted-chance questions elsewhere in this bank show the chance moving by a different amount from 120 hp to a heavier car, even though the odds ratio for 10 hp never changes. How much of the variation a model explains is a separate question the odds ratio does not answer.',
  },
  {
    id: 'rr-extrapolation',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 2,
    prompt:
      'A girth of 30 inches is nowhere near the widest tree measured. What is wrong with reporting the predicted volume below as a real prediction?',
    code: 'fit <- lm(Volume ~ Girth, data = trees)\nrange(trees$Girth)\npredict(fit, data.frame(Girth = 30))\n',
    options: [
      {
        text: 'The straight line was fitted only across the girths in the data; nothing supports it continuing to hold for a girth this far outside that range',
        correct: true,
      },
      { text: 'Nothing: a fitted line can be evaluated at any input, so the prediction is as trustworthy as any other' },
      { text: 'The prediction is meaningless because R would refuse to compute it for a girth outside the data' },
      { text: 'The problem is the units: convert girth to centimetres first and the prediction becomes valid' },
    ],
    explain:
      'A fitted line describes the relationship only where there is data to check it against. `range()` shows how far outside that span 30 inches falls, so a real tree that size might not follow the same line at all — the trunk could taper differently, or the relationship could bend. R happily computes a number either way; that number being computable is not the same as it being trustworthy, and no change of units fixes an extrapolation.',
  },
  {
    id: 'rr-not-significant',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 2,
    prompt: "The `mag` row's p-value is well above 0.05. Which conclusion is right?",
    code: 'gfit <- glm(accel ~ mag, family = Gamma(link = "log"), data = attenu)\nsummary(gfit)$coefficients\n',
    options: [
      {
        text: 'The data cannot rule out no relationship between magnitude and peak acceleration here, and cannot rule out a real one either — look at the interval, not just the p-value',
        correct: true,
      },
      { text: 'Earthquake magnitude has no effect on peak ground acceleration' },
      { text: 'The p-value is the probability that magnitude has no effect on peak ground acceleration' },
      { text: 'The estimate must be pure measurement error, since it did not reach significance' },
    ],
    explain:
      'A large p-value means the data are not surprising under "no relationship"; it does not make "no relationship" true, and it says nothing about the probability of that claim. The honest report is the interval: whatever it spans is what the data leave open, which can include both no effect and a sizeable one.',
  },
  {
    id: 'rr-causation',
    lessonId: 'reporting-results',
    kind: 'choice',
    marks: 3,
    prompt:
      "A colleague wants to write: \"Lowering a car's horsepower would increase the chance it has a straight engine.\" What is wrong with that sentence, even though the `hp` row below is significant?",
    code: 'fit <- glm(vs ~ hp, family = binomial, data = mtcars)\nsummary(fit)$coefficients\n',
    options: [
      {
        text: 'The cars were not randomly assigned an engine shape or a horsepower; both come from how each car was designed, so the association does not show that changing one would change the other',
        correct: true,
      },
      { text: 'The p-value is not small enough to support any claim about horsepower at all' },
      { text: "Horsepower should have been measured in kilowatts for a causal claim to be valid" },
      { text: 'The model needs more predictors before it can say anything about horsepower' },
    ],
    explain:
      'These are observed cars, not an experiment where horsepower was set and engine shape measured afterwards: a manufacturer\'s choice of engine shape and the horsepower that goes with it are decided together. A significant coefficient is still just an association in data like this — it says the two move together, not that changing one causes the other to change. Neither the size of the p-value nor the choice of units nor adding more predictors turns an observational association into evidence of cause.',
  },
  {
    id: 'rr-nb-coef-names',
    lessonId: 'reporting-results',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code: 'library(MASS)\nnb <- glm.nb(Days ~ Eth + Sex, data = quine)\nnames(coef(nb))\n',
    choices: [
      '[1] "(Intercept)" "EthN"        "SexM"       ',
      '[1] "EthN" "SexM"',
      '[1] "(Intercept)" "EthA"        "SexF"       ',
      '[1] "Eth" "Sex"',
    ],
    explain:
      'A negative binomial model, like any glm, has one coefficient per predictor level beyond the baseline, plus the intercept. `Eth` has two levels, so only the non-baseline one, `EthN`, gets a row; the baseline level is absorbed into `(Intercept)`, not printed by its own name. The predictor names themselves, `Eth` and `Sex`, are not coefficients.',
  },
  {
    id: 'rr-write-pct-change',
    lessonId: 'reporting-results',
    kind: 'write',
    marks: 5,
    prompt:
      'Write a function `pct_change(fit, term)` that takes a fitted glm and the name of one of its coefficients (a string) and returns, as a plain number rounded to 1 decimal place, the percentage change that coefficient implies on the response\'s mean — or, for a binomial model, on the odds.',
    run: 'function',
    fnName: 'pct_change',
    starter:
      'pct_change <- function(fit, term) {\n' +
      '  # 1. get the coefficient named `term`\n' +
      '  # 2. exponentiate it and turn it into a percentage change\n' +
      '  # 3. round to 1 decimal place\n' +
      '}\n',
    solution:
      'pct_change <- function(fit, term) {\n' +
      '  round(100 * (exp(coef(fit)[[term]]) - 1), 1)\n' +
      '}\n',
    tests: [
      {
        id: 'quasipoisson-sprayc',
        label: 'a quasi-Poisson count model, sprayC',
        hidden: false,
        setup: 'fitq <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)',
        call: 'pct_change(fitq, "sprayC")',
        expect: 'local({ f <- glm(count ~ spray, family = quasipoisson, data = InsectSprays); round(100 * (exp(coef(f)[["sprayC"]]) - 1), 1) })',
        cmp: 'float',
      },
      {
        id: 'negbin-ethn',
        label: 'a negative binomial model, EthN',
        hidden: false,
        setup: 'library(MASS)\nnb <- glm.nb(Days ~ Eth + Sex, data = quine)',
        call: 'pct_change(nb, "EthN")',
        expect: 'local({ library(MASS); f <- glm.nb(Days ~ Eth + Sex, data = quine); round(100 * (exp(coef(f)[["EthN"]]) - 1), 1) })',
        cmp: 'float',
      },
      {
        id: 'logistic-hp',
        label: 'a logistic model, hp (percentage change in the odds)',
        hidden: true,
        setup: 'fit2 <- glm(vs ~ hp, family = binomial, data = mtcars)',
        call: 'pct_change(fit2, "hp")',
        expect: 'local({ f <- glm(vs ~ hp, family = binomial, data = mtcars); round(100 * (exp(coef(f)[["hp"]]) - 1), 1) })',
        cmp: 'float',
      },
      {
        id: 'gamma-mag',
        label: 'a Gamma model with a log link, mag',
        hidden: true,
        setup: 'gfit <- glm(accel ~ mag, family = Gamma(link = "log"), data = attenu)',
        call: 'pct_change(gfit, "mag")',
        expect: 'local({ f <- glm(accel ~ mag, family = Gamma(link = "log"), data = attenu); round(100 * (exp(coef(f)[["mag"]]) - 1), 1) })',
        cmp: 'float',
      },
    ],
    explain:
      '`coef(fit)[[term]]` picks out one coefficient by name, on the log or logit scale. `exp()` turns it into a multiplier on the mean (or, for a binomial model, on the odds), and `100 * (multiplier - 1)` turns that into a percentage change. The same function works for every family here because each one uses a link where a coefficient multiplies something on the response side once you exponentiate it.',
  },
];

export default questions;
