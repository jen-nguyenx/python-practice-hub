// Exam questions for "When counts spread too far: overdispersion".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates. Datasets vary from the lesson's own
// warpbreaks/InsectSprays examples where they can: `Titanic`, flattened to one row per group with
// `as.data.frame(Titanic)`, gives a Poisson model with far more overdispersion than either of those,
// which is useful for showing what a large dispersion does to a fit.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'od-titanic-ratio',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 2,
    prompt: 'The ratio of residual deviance to its degrees of freedom is far above 1. What does that tell you?',
    code: 'fit <- glm(Freq ~ Class + Sex + Age + Survived, family = poisson, data = as.data.frame(Titanic))\ndeviance(fit) / df.residual(fit)\n',
    options: [
      { text: 'The counts vary far more than a Poisson model with these fitted means would allow: the model is heavily overdispersed', correct: true },
      { text: 'The model explains almost all of the variation in who survived' },
      { text: 'A ratio this large must be a coding mistake; real data never produce one' },
      { text: 'The 32 rows are too few for the ratio to be trustworthy' },
    ],
    explain: 'If the Poisson model were right, this ratio would sit near 1. Far above 1 is exactly the overdispersion signature from earlier in the lesson, just far more extreme than the warpbreaks example. It is not a claim about how much the model explains, and it is a routine outcome, not a sign of an error.',
  },
  {
    id: 'od-titanic-pearson-number',
    lessonId: 'overdispersion',
    kind: 'number',
    marks: 3,
    prompt: 'Work out the Pearson dispersion by hand: the sum of the squared Pearson residuals, divided by the residual degrees of freedom. Give it to the nearest whole number.',
    code: 'fit <- glm(Freq ~ Class + Sex + Age + Survived, family = poisson, data = as.data.frame(Titanic))\nsummary(fit)\n',
    answer: 'round(sum(residuals(fit, type = "pearson")^2) / df.residual(fit))',
    tol: 0.6,
    explain: '`residuals(fit, type = "pearson")` gives one Pearson residual per row; squaring, summing and dividing by `df.residual(fit)` is the same estimate `summary()` of a quasi-Poisson fit reports.',
  },
  {
    id: 'od-quasipoisson-se-compare',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 3,
    prompt: 'Compare the two `SexFemale` rows. What actually changed between them?',
    code:
      'titanic_df <- as.data.frame(Titanic)\n' +
      'fit <- glm(Freq ~ Class + Sex + Age + Survived, family = poisson, data = titanic_df)\n' +
      'qfit <- glm(Freq ~ Class + Sex + Age + Survived, family = quasipoisson, data = titanic_df)\n' +
      'summary(fit)$coefficients["SexFemale", ]\n' +
      'summary(qfit)$coefficients["SexFemale", ]\n',
    options: [
      { text: 'The estimate is the same in both, but the quasi-Poisson standard error is larger, since it allows for the extra spread in the counts', correct: true },
      { text: 'The estimate is smaller in the quasi-Poisson fit' },
      { text: 'The p-value is smaller (more significant) in the quasi-Poisson fit' },
      { text: 'Quasi-Poisson fits a completely different model for the mean number in each group' },
    ],
    explain: 'Quasi-Poisson keeps the same fitted means and the same estimates, and only rescales the standard errors by the estimated dispersion. A bigger standard error means a smaller test statistic and a bigger p-value, the opposite of "more significant".',
  },
  {
    id: 'od-aic-na-quasipoisson',
    lessonId: 'overdispersion',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code: 'qfit <- glm(Freq ~ Class + Sex + Age + Survived, family = quasipoisson, data = as.data.frame(Titanic))\nAIC(qfit)\n',
    choices: ['[1] NA', '[1] 1385.1', 'Error in AIC(qfit) : dispersion parameter not allowed', '[1] 0'],
    explain: 'Quasi-Poisson has no likelihood, only a mean and a way the variance grows with it, so there is nothing for AIC to be built from; R returns `NA` rather than raising an error.',
  },
  {
    id: 'od-warpbreaks-wool-ratio',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 2,
    prompt: 'Every loom given the same wool shares nothing else, so this splits the counts by wool alone rather than by wool and tension together. What does the table say?',
    code:
      'm <- with(warpbreaks, tapply(breaks, wool, mean))\n' +
      'v <- with(warpbreaks, tapply(breaks, wool, var))\n' +
      'round(rbind(mean = m, variance = v, ratio = v / m), 1)\n',
    options: [
      { text: 'Both wools show a variance well above their mean, so the overdispersion is not just a quirk of one tension setting', correct: true },
      { text: 'Wool A and wool B have the same variance-to-mean ratio, so wool does not matter' },
      { text: 'The Poisson promise holds for at least one of the two wools' },
      { text: 'The mean and the variance cannot be compared unless the groups are the same size' },
    ],
    explain: 'A ratio near 1 is what a good Poisson fit looks like; here both wools sit well above it, so the extra spread is not something splitting by tension alone hides or explains away. tapply() groups fine with unequal group sizes.',
  },
  {
    id: 'od-insectsprays-pearson-number',
    lessonId: 'overdispersion',
    kind: 'number',
    marks: 3,
    prompt: 'Fit the counts on spray, then compute the Pearson dispersion: the sum of the squared Pearson residuals divided by the residual degrees of freedom. Give it to two decimal places.',
    code: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\nsummary(fit)\n',
    answer: 'round(sum(residuals(fit, type = "pearson")^2) / df.residual(fit), 2)',
    tol: 0.006,
    explain: 'Square each Pearson residual, add them up, and divide by the residual degrees of freedom, exactly the calculation behind the dispersion line in a quasi-Poisson summary.',
  },
  {
    id: 'od-warpbreaks-tension-only',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 2,
    prompt: 'This model drops wool and keeps only tension. Judging by the ratio of deviance to degrees of freedom, what should you do next?',
    code: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)\ndeviance(fit) / df.residual(fit)\n',
    options: [
      { text: 'It is well above 1, so before trusting the standard errors, check for a missing predictor or refit with quasipoisson', correct: true },
      { text: 'It is near 1, so this Poisson fit and its standard errors can be trusted as they stand' },
      { text: 'It is below 1, which means the counts are less spread out than a Poisson model expects' },
      { text: 'The ratio cannot be judged without also fitting the model with wool included' },
    ],
    explain: 'A ratio well above 1 is the deviance-based version of the same check the Pearson dispersion makes: the model routine in this lesson says look for a cause first, then move to quasi-Poisson or a negative binomial if the extra spread remains.',
  },
  {
    id: 'od-poisson-se-too-small-consequence',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 2,
    prompt: 'A Poisson model is fitted to counts that are really overdispersed, and its standard errors are used anyway. What is the practical risk?',
    options: [
      { text: 'Standard errors that are too small make coefficients look more certain than they are, so unimportant predictors can appear statistically significant', correct: true },
      { text: 'The coefficient estimates themselves come out biased' },
      { text: 'The model refuses to converge' },
      { text: 'Predicted counts turn out to be systematically too high' },
    ],
    explain: 'Overdispersion does not change the estimates or where the fitting algorithm lands; it changes how much those estimates should be trusted. Standard errors built as if variance equalled the mean are too small when it does not, which pulls p-values down and can manufacture apparent significance.',
  },
  {
    id: 'od-negbin-not-just-more-params',
    lessonId: 'overdispersion',
    kind: 'choice',
    marks: 2,
    prompt: 'A colleague says a negative binomial model is always better than quasi-Poisson because it has an extra parameter. What is wrong with that reasoning?',
    options: [
      { text: 'Having more parameters does not by itself make a model better; the real choice is whether you need a likelihood (for AIC or likelihood-ratio tests) and whether the negative binomial\'s variance shape, mu + mu^2/theta, actually suits the data', correct: true },
      { text: 'Nothing is wrong; a model with more parameters always fits better' },
      { text: 'Quasi-Poisson cannot be fitted to the same data as a negative binomial' },
      { text: 'The negative binomial has no equivalent of quasi-Poisson\'s dispersion estimate' },
    ],
    explain: 'A negative binomial model does give you a likelihood, which quasi-Poisson lacks, but that is a reason grounded in what the analysis needs, not a rule that extra parameters are automatically an improvement. Both approaches can be fitted to the same counts.',
  },
  {
    id: 'od-is-overdispersed-fn',
    lessonId: 'overdispersion',
    kind: 'write',
    marks: 6,
    prompt: 'Write a function `is_overdispersed(fit, threshold = 2)` that takes a fitted Poisson `glm()` and returns `TRUE` if its Pearson dispersion (the sum of the squared Pearson residuals divided by the residual degrees of freedom) is greater than `threshold`, and `FALSE` otherwise.',
    run: 'function',
    fnName: 'is_overdispersed',
    starter:
      'is_overdispersed <- function(fit, threshold = 2) {\n' +
      '  # work out the Pearson dispersion, then compare it with threshold\n' +
      '}\n',
    solution:
      'is_overdispersed <- function(fit, threshold = 2) {\n' +
      '  r <- residuals(fit, type = "pearson")\n' +
      '  (sum(r^2) / df.residual(fit)) > threshold\n' +
      '}\n',
    tests: [
      {
        id: 'warpbreaks-default', label: 'warpbreaks, by wool and tension, default threshold', hidden: false,
        setup: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
        call: 'is_overdispersed(fit)',
        expect: 'local({ f <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); r <- residuals(f, type = "pearson"); (sum(r^2) / df.residual(f)) > 2 })',
        cmp: 'eq',
      },
      {
        id: 'warpbreaks-strict', label: 'warpbreaks, a stricter threshold', hidden: false,
        setup: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
        call: 'is_overdispersed(fit, 10)',
        expect: 'local({ f <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); r <- residuals(f, type = "pearson"); (sum(r^2) / df.residual(f)) > 10 })',
        cmp: 'eq',
      },
      {
        id: 'well-fitting', label: 'counts simulated from a true Poisson model', hidden: true,
        setup: 'set.seed(1)\ny <- rpois(200, lambda = 5)\nfit <- glm(y ~ 1, family = poisson)',
        call: 'is_overdispersed(fit)',
        expect: 'local({ set.seed(1); yy <- rpois(200, lambda = 5); f <- glm(yy ~ 1, family = poisson); r <- residuals(f, type = "pearson"); (sum(r^2) / df.residual(f)) > 2 })',
        cmp: 'eq',
      },
      {
        id: 'titanic-loose-threshold', label: 'a heavily overdispersed model, with a very loose threshold', hidden: true,
        setup: 'fit <- glm(Freq ~ Class + Sex + Age + Survived, family = poisson, data = as.data.frame(Titanic))',
        call: 'is_overdispersed(fit, 100)',
        expect: 'local({ f <- glm(Freq ~ Class + Sex + Age + Survived, family = poisson, data = as.data.frame(Titanic)); r <- residuals(f, type = "pearson"); (sum(r^2) / df.residual(f)) > 100 })',
        cmp: 'eq',
      },
    ],
    explain: '`residuals(fit, type = "pearson")` gives one Pearson residual per observation; squaring, summing and dividing by `df.residual(fit)` is the Pearson dispersion, compared here with `>` against `threshold`.',
  },
];

export default questions;
