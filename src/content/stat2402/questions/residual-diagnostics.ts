// Exam questions for "Checking a GLM: residuals, leverage and influence".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// residual, a hat value, a Cook's distance or which row is largest.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'rd-default-type',
    lessonId: 'residual-diagnostics',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code:
      'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\n' +
      'c(identical(residuals(fit), residuals(fit, type = "deviance")),\n' +
      '  isTRUE(all.equal(fit$residuals, residuals(fit, type = "deviance"))))\n',
    choices: [
      '[1]  TRUE FALSE',
      '[1] TRUE TRUE',
      '[1] FALSE  TRUE',
      '[1] FALSE FALSE',
    ],
    explain: 'With no `type`, `residuals()` on a GLM gives deviance residuals, so the first comparison is `TRUE`. `fit$residuals` is not the same thing: it holds the working residuals the fitting algorithm left behind, on the scale of the linear predictor, so the second is `FALSE`. Reach for `residuals(fit, type = ...)` rather than `fit$residuals`.',
  },
  {
    id: 'rd-pearson-by-hand',
    lessonId: 'residual-diagnostics',
    kind: 'number',
    marks: 3,
    prompt: 'Below are loom 5 of `warpbreaks` and its fitted value under a Poisson model. What is its Pearson residual? Give it to two decimal places.',
    code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\nwarpbreaks[5, ]\nfitted(fit)[5]\n',
    answer: 'round(residuals(fit, type = "pearson")[[5]], 2)',
    tol: 0.006,
    explain: 'A Pearson residual is (observed − fitted) / √fitted for a Poisson model: the gap measured in Poisson standard deviations, since a Poisson variance equals its mean. Here that is loom 5\'s `breaks` minus its fitted value, divided by the square root of the fitted value. `residuals(fit, type = "pearson")[5]` does the same sum.',
  },
  {
    id: 'rd-curve',
    lessonId: 'residual-diagnostics',
    kind: 'choice',
    marks: 3,
    prompt: '`quakes` records 1000 earthquakes near Fiji, with each one\'s magnitude (`mag`) and how many seismic stations reported it (`stations`). Below are the Pearson residuals of a Poisson model, averaged over the low, middle and high thirds of its linear predictor. What do they suggest?',
    code:
      'fit <- glm(stations ~ mag, family = poisson, data = quakes)\n' +
      'third <- cut(predict(fit), 3, labels = c("low", "middle", "high"))\n' +
      'round(tapply(residuals(fit, type = "pearson"), third, mean), 2)\n',
    options: [
      { text: 'The model for the mean is the wrong shape: try a squared term in mag, or another link, and check again', correct: true },
      { text: 'Nothing is wrong, because Pearson residuals always average close to zero overall' },
      { text: 'A single large earthquake is distorting the fit, so it should be removed' },
      { text: 'The standard errors are too small, so refit with family = quasipoisson' },
    ],
    explain: 'If the model for the mean were right, the residuals would average near zero in every part of the plot. Here the average changes sign from one third to the next, which is a curve: the log of the mean does not rise in a straight line with magnitude. The fix is to change the shape of the mean, with a term such as `I(mag^2)` or a different link, then look at the residuals again. An overall average near zero hides the pattern, a pattern running across whole thirds of the data is not one point\'s doing, and quasi-Poisson keeps exactly the same mean, so the curve would stay.',
  },
  {
    id: 'rd-fan',
    lessonId: 'residual-diagnostics',
    kind: 'choice',
    marks: 3,
    prompt: 'A Poisson model is fitted to 150 simulated counts. The first line below is the average Pearson residual in the low, middle and high thirds of the linear predictor; the second is their standard deviation. What is wrong with the model?',
    code:
      'set.seed(6)\n' +
      'x <- runif(150, 0, 3)\n' +
      'y <- rnbinom(150, mu = exp(1 + 0.8 * x), size = 4)\n' +
      'fit <- glm(y ~ x, family = poisson)\n' +
      'third <- cut(predict(fit), 3, labels = c("low", "middle", "high"))\n' +
      'r <- residuals(fit, type = "pearson")\n' +
      'round(tapply(r, third, mean), 2)\n' +
      'round(tapply(r, third, sd), 2)\n',
    options: [
      { text: 'The variance grows faster with the mean than a Poisson model allows', correct: true },
      { text: 'The model for the mean is missing a term' },
      { text: 'The link function is wrong' },
      { text: 'Nothing: Pearson residuals always spread out more as the fitted values grow' },
    ],
    explain: 'The averages stay near zero in all three thirds, so the mean has the right shape. The spread is the problem: a Pearson residual is already divided by the Poisson standard deviation, so if the variance function were right their spread would be about the same everywhere. A spread that widens along the plot is a fan, and it says the variance grows faster than the mean, as a negative binomial\'s does. That is the model these counts came from. A missing term or a wrong link would bend the averages, and it is response residuals, not Pearson ones, that fan out even when the model is right.',
  },
  {
    id: 'rd-standardised',
    lessonId: 'residual-diagnostics',
    kind: 'number',
    marks: 3,
    prompt: 'Below are the Pearson residual and the hat value of plot 39 in `InsectSprays`, under a Poisson model. Work out its standardised residual, r / √(1 − h), and give it to two decimal places.',
    code:
      'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
      'round(residuals(fit, type = "pearson")[39], 4)\n' +
      'round(hatvalues(fit)[39], 4)\n',
    answer: 'round(rstandard(fit, type = "pearson")[[39]], 2)',
    tol: 0.006,
    explain: 'A standardised residual divides the residual by √(φ(1 − h)), and a Poisson model fixes φ at 1. Dividing by √(1 − h) scales the residual back up to allow for the pull its own observation had on the fit. `rstandard(fit, type = "pearson")[39]` gives the same number.',
  },
  {
    id: 'rd-cutoff-count',
    lessonId: 'residual-diagnostics',
    kind: 'number',
    marks: 3,
    prompt: 'This model predicts a car\'s number of carburettors from its weight. The output shows the number of coefficients, the number of cars, and the six largest hat values. How many cars have a hat value above the 2p/n rule of thumb?',
    code:
      'fit <- glm(carb ~ wt, family = poisson, data = mtcars)\n' +
      'length(coef(fit))\n' +
      'nrow(mtcars)\n' +
      'round(sort(hatvalues(fit), decreasing = TRUE)[1:6], 3)\n',
    answer: 'sum(hatvalues(fit) > 2 * length(coef(fit)) / nrow(mtcars))',
    tol: 0.4,
    unit: 'cars',
    explain: 'The hat values add up to p, the number of coefficients, so their average is p/n; the rule of thumb flags anything above twice that, 2p/n. Work out 2p/n from the first two lines, then count the hat values above it. They are sorted, so you can stop at the first one below the line.',
  },
  {
    id: 'rd-leverage-not-influence',
    lessonId: 'residual-diagnostics',
    kind: 'choice',
    marks: 2,
    prompt: 'An observation has a hat value far above 2p/n, but its Cook\'s distance is tiny. What does that tell you?',
    options: [
      { text: 'Its predictor values are unusual, but its response is in line with the rest, so leaving it out would barely change the fit', correct: true },
      { text: 'It is an outlier, and should be removed before the model is reported' },
      { text: 'Something has gone wrong, because high leverage always means high influence' },
      { text: 'Its residual is large, but the model has absorbed it' },
    ],
    explain: 'Leverage is the power to move the fit, which comes from where the point sits among the predictors. Cook\'s distance measures whether the point uses that power: how far the coefficients move when it is left out. A high-leverage point whose response agrees with the others moves nothing, so its Cook\'s distance is small. Nothing here suggests an error or a large residual, and a point that agrees with the model is no reason to remove anything.',
  },
  {
    id: 'rd-refit',
    lessonId: 'residual-diagnostics',
    kind: 'choice',
    marks: 3,
    prompt: 'The code finds the observation with the largest Cook\'s distance and refits the model without it. What is the right reading?',
    code:
      'set.seed(12)\n' +
      'x <- c(runif(29, 0, 10), 18)\n' +
      'y <- c(rpois(29, exp(0.3 + 0.15 * x[1:29])), 1)\n' +
      'fit <- glm(y ~ x, family = poisson)\n' +
      'k <- which.max(cooks.distance(fit))\n' +
      'round(cooks.distance(fit)[k], 2)\n' +
      'round(rbind(with = coef(fit), without = coef(update(fit, subset = -k))), 3)\n',
    options: [
      { text: 'The slope rests heavily on one observation: check that point for an error or a reason it differs, and report the fit with and without it', correct: true },
      { text: 'The observation is an error and must be deleted, because it has the largest Cook\'s distance' },
      { text: 'Cook\'s distance is only meaningful for linear models, so it can be ignored for a GLM' },
      { text: 'The model should be refitted with family = quasipoisson, which removes the influence of single points' },
    ],
    explain: 'Leaving out one observation changes the `x` coefficient a great deal, so the conclusion about x depends on that single point. That calls for a closer look, not an automatic deletion: if the point is a recording error, fix or drop it and say so; if it is real, show both fits. Some observation always has the largest Cook\'s distance, which proves nothing on its own. Cook\'s distance is defined for GLMs as well, and quasi-Poisson changes the standard errors, not the fitted coefficients.',
  },
  {
    id: 'rd-qq-small',
    lessonId: 'residual-diagnostics',
    kind: 'choice',
    marks: 2,
    prompt: 'These 50 counts were drawn from exactly the Poisson model that was fitted. The table shows every value their deviance residuals take, and how often. A normal quantile plot of residuals like these can only be a few flat steps. What is the right conclusion?',
    code:
      'set.seed(1)\n' +
      'y <- rpois(50, 0.8)\n' +
      'fit <- glm(y ~ 1, family = poisson)\n' +
      'table(round(residuals(fit), 2))\n',
    options: [
      { text: 'The counts are too small for deviance residuals to look normal, so the plot says little about the fit', correct: true },
      { text: 'The Poisson model is wrong, because its residuals are not normal' },
      { text: 'The counts are overdispersed' },
      { text: 'Response residuals would give a straight plot instead' },
    ],
    explain: 'Each distinct count gives one residual value, so these small counts give only as many residual values as the table has columns, and no model can make a handful of values look normal. The model here is exactly right, so the steps come from the whole numbers, not from a bad fit. Overdispersion is judged with the Pearson dispersion, not a Q-Q plot, and response residuals take just as few values.',
  },
  {
    id: 'rd-write-influential',
    lessonId: 'residual-diagnostics',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function `most_influential(fit)` that takes a fitted `glm()` and returns the row number of the observation with the largest Cook\'s distance, as a single number. The tests accept it with or without a name.',
    run: 'function',
    fnName: 'most_influential',
    starter: 'most_influential <- function(fit) {\n  # find the largest Cook\'s distance and return its row number\n}\n',
    solution: 'most_influential <- function(fit) {\n  which.max(cooks.distance(fit))\n}\n',
    tests: [
      {
        id: 'far-point',
        label: 'one count far to the right of the rest',
        hidden: false,
        setup: 'set.seed(7); x <- c(runif(24, 0, 2), 4); y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), 3); fit <- glm(y ~ x, family = poisson)',
        call: 'most_influential(fit)',
        expect: 'local({ set.seed(7); x <- c(runif(24, 0, 2), 4); y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), 3); f <- glm(y ~ x, family = poisson); d <- cooks.distance(f); match(max(d), d) })',
      },
      {
        id: 'warpbreaks',
        label: 'warpbreaks, by wool and tension',
        hidden: false,
        setup: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
        call: 'most_influential(fit)',
        expect: 'local({ f <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); d <- cooks.distance(f); match(max(d), d) })',
      },
      {
        id: 'insects',
        label: 'InsectSprays, by spray',
        hidden: true,
        setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
        call: 'most_influential(fit)',
        expect: 'local({ f <- glm(count ~ spray, family = poisson, data = InsectSprays); d <- cooks.distance(f); match(max(d), d) })',
      },
      {
        id: 'logistic',
        label: 'a logistic model: gearbox by weight in mtcars',
        hidden: true,
        setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
        call: 'most_influential(fit)',
        expect: 'local({ f <- glm(am ~ wt, family = binomial, data = mtcars); d <- cooks.distance(f); match(max(d), d) })',
      },
    ],
    explain: '`cooks.distance(fit)` gives one value per observation, and `which.max()` gives the position of the largest, which is its row number. `which.max()` keeps the name R attaches; `unname()` drops it, though the tests accept either.',
  },
];

export default questions;
