// Exam questions for "Positive and skewed: Gamma regression".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out.
import type { StatQuestion } from '../../statQuestionSchema.ts';

/** Simulated insurance claim amounts, mean rising with driver age, reused by several questions. */
const CLAIMS =
  'set.seed(21)\n' +
  'n <- 300\n' +
  'age <- round(runif(n, 18, 70))\n' +
  'mu <- exp(4 + 0.02 * age)\n' +
  'shape <- 5\n' +
  'claim <- rgamma(n, shape = shape, rate = shape / mu)\n' +
  'd <- data.frame(age, claim)\n';
const CLAIMS_FIT = 'fit <- glm(claim ~ age, family = Gamma(link = "log"), data = d)\n';

/** Simulated repair costs, mean rising with hours worked, reused by the dispersion and F-test questions. */
const REPAIRS =
  'set.seed(5)\n' +
  'n <- 250\n' +
  'hours <- round(runif(n, 1, 40), 1)\n' +
  'shape <- 8\n' +
  'mu <- exp(2 + 0.05 * hours)\n' +
  'cost <- rgamma(n, shape = shape, rate = shape / mu)\n' +
  'd <- data.frame(hours, cost)\n';
const REPAIRS_FIT = 'fit <- glm(cost ~ hours, family = Gamma(link = "log"), data = d)\n';

const questions: StatQuestion[] = [
  {
    id: 'gam-variance-mean-squared',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'The second sample below has the same shape as the first, but a scale four times as big, so its mean is four times as big too. What happens to `sd / mean` and to the variance?',
    code:
      'set.seed(3)\n' +
      'small <- rgamma(80000, shape = 6, scale = 2)\n' +
      'big <- rgamma(80000, shape = 6, scale = 8)\n' +
      'round(c(mean(small), mean(big)), 1)\n' +
      'round(c(sd(small) / mean(small), sd(big) / mean(big)), 2)\n' +
      'round(c(var(small), var(big)), 1)\n',
    options: [
      { text: 'sd / mean stays about the same, and the variance is about sixteen times as big (four squared)', correct: true },
      { text: 'sd / mean stays about the same, and the variance is about four times as big' },
      { text: 'sd / mean is about four times as big, and the variance is about four times as big' },
      { text: 'sd / mean is about four times as big, and the variance is about sixteen times as big' },
    ],
    explain:
      'The Gamma variance is mean^2 / shape. With the shape held fixed, multiplying the mean by four multiplies the variance by four squared, sixteen. Dividing by the mean twice (once in var, implicitly, and once more to get sd / mean) leaves the shape alone, so the coefficient of variation, 1 / sqrt(shape), does not move.',
  },
  {
    id: 'gam-log-link-meaning',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'This model predicts a simulated insurance claim amount from the driver\'s age. What does the `age` estimate tell you?',
    code: `${CLAIMS}${CLAIMS_FIT}summary(fit)\nexp(coef(fit))\n`,
    options: [
      { text: 'How many times the expected claim amount is multiplied for each extra year of age, from `exp()` of the estimate', correct: true },
      { text: 'How many dollars the expected claim amount rises for each extra year of age' },
      { text: 'The share of the variation in claim amount that age explains' },
      { text: 'How many years older a driver needs to be for the claim amount to double' },
    ],
    explain:
      'With a log link, the estimate is a change in log(mean); `exp()` of it turns that into a multiplier on the mean itself, shown in the second block. A change measured directly in dollars is how an ordinary `lm()` slope reads, not a log-link glm\'s. A share of variation explained is R-squared, and doubling time would need `log(2)` divided by the estimate, not the estimate alone.',
  },
  {
    id: 'gam-percent-change-number',
    lessonId: 'gamma-regression',
    kind: 'number',
    marks: 3,
    prompt: 'From the output, each extra year of age multiplies the expected claim amount by `exp(coef(fit)["age"])`. What percentage change is that? Give it to one decimal place.',
    code: `${CLAIMS}${CLAIMS_FIT}exp(coef(fit))\n`,
    answer: 'round(100 * (exp(coef(fit)[["age"]]) - 1), 1)',
    tol: 0.06,
    unit: '%',
    explain: 'A multiplier m is a percentage change of 100 x (m - 1): above zero for a rise, below zero for a fall. Read the `age` multiplier from `exp(coef(fit))` and convert it.',
  },
  {
    id: 'gam-inverse-vs-log-default',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 3,
    prompt:
      'Two models for the same simulated claim amounts, predicting at ages older than any driver in the data. The first uses `family = Gamma`, R\'s default inverse link; the second uses `family = Gamma(link = "log")`. What do the predictions show?',
    code:
      `${CLAIMS}` +
      'inv <- glm(claim ~ age, family = Gamma, data = d)\n' +
      'logf <- glm(claim ~ age, family = Gamma(link = "log"), data = d)\n' +
      'predict(inv, data.frame(age = c(60, 80, 100, 120)), type = "response")\n' +
      'predict(logf, data.frame(age = c(60, 80, 100, 120)), type = "response")\n',
    options: [
      { text: 'The inverse-link model\'s predicted claim amount turns negative at the oldest ages, while the log-link model stays positive throughout', correct: true },
      { text: 'Both models give almost the same predictions at every age' },
      { text: 'The log-link model\'s predicted claim amount turns negative, while the inverse-link model stays positive' },
      { text: 'Both predicted claim amounts turn negative at the oldest ages' },
    ],
    explain:
      'The inverse link models 1/mean as a straight line in age; once that line crosses zero, `predict()` returns a negative mean claim, which is exactly what happens at the oldest ages here. `exp()` of anything is positive, so the log-link model cannot do that at any age. Extrapolating this far beyond the data is risky either way, but only the inverse-link model breaks its own promise that a claim amount cannot be negative.',
  },
  {
    id: 'gam-dispersion-cv-number',
    lessonId: 'gamma-regression',
    kind: 'number',
    marks: 3,
    prompt: 'This model\'s estimated dispersion is shown above. What is the estimated coefficient of variation of repair cost around its fitted mean? Give it to 2 decimal places.',
    code: `${REPAIRS}${REPAIRS_FIT}summary(fit)$dispersion\n`,
    answer: 'round(sqrt(summary(fit)$dispersion), 2)',
    tol: 0.006,
    explain: 'The dispersion plays the part of 1 / shape in the Gamma variance formula, mean^2 / shape, so its square root is the coefficient of variation: the standard deviation as a fraction of the mean.',
  },
  {
    id: 'gam-f-test-reason',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 2,
    prompt: 'Why does this comparison use `test = "F"` rather than `test = "Chisq"`?',
    code:
      'set.seed(5)\n' +
      'n <- 250\n' +
      'hours <- round(runif(n, 1, 40), 1)\n' +
      'machine_age <- round(runif(n, 0, 15), 1)\n' +
      'shape <- 8\n' +
      'mu <- exp(2 + 0.05 * hours + 0.01 * machine_age)\n' +
      'cost <- rgamma(n, shape = shape, rate = shape / mu)\n' +
      'd <- data.frame(hours, machine_age, cost)\n' +
      'fit1 <- glm(cost ~ hours, family = Gamma(link = "log"), data = d)\n' +
      'fit2 <- glm(cost ~ hours + machine_age, family = Gamma(link = "log"), data = d)\n' +
      'anova(fit1, fit2, test = "F")\n',
    options: [
      { text: 'The drop in deviance has to be scaled by a dispersion estimated from the data, and the F test allows for the uncertainty in that estimate', correct: true },
      { text: 'Because the response, repair cost, is continuous rather than a count' },
      { text: 'Because the chi-squared test only compares models with exactly one predictor' },
      { text: 'Because F tests are always used when a model has more than one predictor' },
    ],
    explain:
      'A chi-squared test treats the dispersion as known, which is true for Poisson counts but not for a Gamma fit. Here the dispersion is estimated from the same data, so F is the honest comparison, the same way t replaces z in the coefficient table. What matters is whether the dispersion is fixed or estimated, not whether the response is a count, and both tests work with any number of predictors.',
  },
  {
    id: 'gam-lm-log-vs-gamma',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 3,
    prompt: 'Why do the `lm_log` predictions and the `lm_log` average both sit below the `gamma` ones?',
    code:
      `${CLAIMS}` +
      'lfit <- lm(log(claim) ~ age, data = d)\n' +
      'gfit <- glm(claim ~ age, family = Gamma(link = "log"), data = d)\n' +
      'new <- data.frame(age = c(30, 50, 65))\n' +
      'rbind(lm_log = exp(predict(lfit, new)), gamma = predict(gfit, new, type = "response"))\n' +
      'c(data = mean(d$claim), gamma = mean(fitted(gfit)), lm_log = mean(exp(fitted(lfit))))\n',
    options: [
      { text: '`exp()` of an average log claim is a geometric mean, and for right-skewed amounts that sits below the ordinary mean the Gamma model predicts', correct: true },
      { text: 'The linear model on log(claim) fits the data worse than the Gamma model' },
      { text: '`exp()` loses accuracy on the size of numbers involved here' },
      { text: 'The two models use different numbers of claims' },
    ],
    explain:
      'Taking logs pulls in the long right tail before averaging, and `exp()` afterwards cannot put it back: the result is a geometric mean, smaller than the ordinary mean for skewed data. The last line shows the gap directly: the Gamma fitted values average close to the data\'s mean claim, and the lm_log ones fall short, at every age and on average. Both models use the same 300 simulated claims, and `exp()` is accurate here.',
  },
  {
    id: 'gam-residual-narrowing',
    lessonId: 'gamma-regression',
    kind: 'choice',
    marks: 3,
    prompt:
      'These amounts were simulated with the same spread at every fitted value (not growing with the mean), then fitted with a Gamma GLM anyway. `f` is the fitted values split into three equal-sized groups, and `r` the deviance residuals. What does the pattern below say?',
    code:
      'set.seed(31)\n' +
      'n <- 240\n' +
      'x <- runif(n, 10, 60)\n' +
      'mu <- exp(0.6 + 0.03 * x)\n' +
      'y <- pmax(mu + rnorm(n, sd = 3), 0.1)\n' +
      'fit <- glm(y ~ x, family = Gamma(link = "log"))\n' +
      'f <- fitted(fit)\n' +
      'r <- residuals(fit)\n' +
      'third <- cut(f, quantile(f, 0:3 / 3), include.lowest = TRUE, labels = c("low", "mid", "high"))\n' +
      'round(tapply(r, third, sd), 2)\n',
    options: [
      { text: 'The Gamma model expected more spread at the high end than the data really has, so the band of residuals narrows there', correct: true },
      { text: 'The model fits better at the high end, because its residuals are smaller there' },
      { text: 'Nothing meaningful: a Gamma model\'s residual spread always narrows like this' },
      { text: 'The mean model itself must be wrong, because the spread changes across the thirds' },
    ],
    explain:
      'Deviance residuals are scaled by the spread the model expects. Here the true spread is constant but a Gamma model always expects the spread to grow with the mean, so at the high end it divides real (unchanged) scatter by a bigger expected spread, shrinking the scaled residuals. Smaller residuals there are a sign of a mismatched variance assumption, not a better fit for the mean, and this pattern is specific to fitting a Gamma model to data whose spread does not really grow with the mean.',
  },
  {
    id: 'gam-cv-predict',
    lessonId: 'gamma-regression',
    kind: 'predict',
    marks: 2,
    prompt: 'Two samples with the same shape, 9. The second has a scale four times the first. What do the last two lines print?',
    code:
      'set.seed(60)\n' +
      'small <- rgamma(60000, shape = 9, scale = 4)\n' +
      'big <- rgamma(60000, shape = 9, scale = 16)\n' +
      'round(c(mean(small), mean(big)))\n' +
      'round(c(sd(small) / mean(small), sd(big) / mean(big)), 2)\n',
    choices: [
      '[1]  36 144\n[1] 0.33 0.33',
      '[1]  36 144\n[1] 0.33 0.08',
      '[1]  36 144\n[1] 1.32 1.32',
    ],
    explain:
      'The coefficient of variation of a Gamma distribution is 1 / sqrt(shape); it does not depend on the scale at all, so both samples give about the same value even though their means are four times apart. Dividing by 4 or multiplying by 4 both come from forgetting that `sd` grows in step with the mean, so the ratio `sd / mean` cancels the scale out.',
  },
  {
    id: 'gam-multiplier-write',
    lessonId: 'gamma-regression',
    kind: 'write',
    marks: 5,
    prompt:
      'Write a function `multiplier(fit, predictor, delta)` that takes a Gamma `glm()` fitted with a log link, the name of one of its predictors as a string, and a change `delta` in that predictor. Return the factor by which the expected mean is multiplied for a change of `delta` in `predictor`, holding everything else fixed.',
    run: 'function',
    fnName: 'multiplier',
    starter: 'multiplier <- function(fit, predictor, delta) {\n  # exp() of delta times that predictor\'s coefficient\n}\n',
    solution: 'multiplier <- function(fit, predictor, delta) {\n  exp(delta * coef(fit)[[predictor]])\n}\n',
    tests: [
      {
        id: 'ozone-ten-degrees',
        label: 'ozone by temperature, a rise of 10 degrees',
        hidden: false,
        setup: 'aq <- subset(airquality, !is.na(Ozone))\nfit <- glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq)',
        call: 'multiplier(fit, "Temp", 10)',
        expect: 'local({ aq <- subset(airquality, !is.na(Ozone)); f <- glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq); exp(10 * coef(f)[["Temp"]]) })',
        cmp: 'float',
      },
      {
        id: 'repair-five-hours',
        label: 'simulated repair cost, a rise of 5 hours',
        hidden: false,
        setup: `${REPAIRS}${REPAIRS_FIT}`,
        call: 'multiplier(fit, "hours", 5)',
        expect: `local({ ${REPAIRS}${REPAIRS_FIT}exp(5 * coef(fit)[["hours"]]) })`,
        cmp: 'float',
      },
      {
        id: 'claim-younger',
        label: 'simulated claim amount, 10 years younger',
        hidden: true,
        setup: `${CLAIMS}${CLAIMS_FIT}`,
        call: 'multiplier(fit, "age", -10)',
        expect: `local({ ${CLAIMS}${CLAIMS_FIT}exp(-10 * coef(fit)[["age"]]) })`,
        cmp: 'float',
      },
      {
        id: 'no-change',
        label: 'a change of 0 always multiplies by 1',
        hidden: true,
        setup: `${CLAIMS}${CLAIMS_FIT}`,
        call: 'multiplier(fit, "age", 0)',
        expect: '1',
        cmp: 'float',
      },
    ],
    explain: 'On the log scale a coefficient adds `delta * coefficient` to the linear predictor; `exp()` turns that addition into the multiplier on the mean itself.',
  },
];

export default questions;
