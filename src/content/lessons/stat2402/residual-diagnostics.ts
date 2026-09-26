// Checking a GLM: residuals, leverage and influence.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types a residual, a hat value or a Cook's distance. The cards use simulated counts, so what is wrong
// with each model is known: a missing term, the wrong link, the wrong variance, one far-out point, or
// counts too small for a normal quantile plot to mean much. This R draws no plots; every picture is
// drawn by the app from numbers R produced (qqnorm(..., plot.it = FALSE), lowess(), hatvalues()).
import type { Lesson } from '../../lessonSchema.ts';

/** Four ways the same Poisson fit can be right or wrong, each a single line of simulated counts. */
const TRUTH_CHOICES = [
  { value: 'y <- rpois(100, exp(1.5 + x))', caption: 'the right model' },
  { value: 'y <- rpois(100, exp(3 - 2.4 * x + 1.2 * x^2))', caption: 'a missing term (x squared)' },
  { value: 'y <- rpois(100, 1 + 12 * x)', caption: 'the wrong link' },
  { value: 'y <- rnbinom(100, mu = exp(1.5 + x), size = 3)', caption: 'the wrong variance' },
];

/** The fitted mean over a grid of x, for drawing a fitted curve. */
const curve = (model: string) =>
  `local({ g <- seq(0, 4, by = 0.1); cbind(g, predict(${model}, data.frame(x = g), type = "response")) })`;

const lesson: Lesson = {
  id: 'residual-diagnostics',
  title: 'Checking a GLM: residuals, leverage and influence',
  summary: 'The four kinds of residual R gives for a GLM, the plots that show a wrong mean or a wrong variance, and how to find the points that steer a fit',
  track: 'stat2402',
  order: 8,
  prereqs: ['glm-theory'],
  minutes: 20,
  outcomes: [
    'Say why a GLM residual is scaled, and get the four kinds with `residuals(fit, type = ...)`',
    'Read residuals against fitted values for a curve (the wrong mean) or a fan (the wrong variance)',
    'Find high-leverage points with `hatvalues()` and the 2p/n rule, and standardise residuals with `rstandard()`, naming the type',
    'Measure influence with `cooks.distance()`, and refit without a point to see what changes',
    'Read a normal quantile plot of deviance residuals, and say why it misleads when counts are small',
  ],
  sections: [
    {
      id: 'why-check',
      title: 'Why check a model',
      blocks: [
        {
          kind: 'prose',
          body:
            '`glm()` always gives you an answer. Hand it a formula, some data and a family, and it returns estimates, standard errors and p-values whether or not the model describes the data. Every one of those numbers leans on things the output never checks: that the mean has the right shape (the right predictors, on the right link scale), that the variance grows with the mean the way the family says, and that no single observation is steering the fit.\n\n' +
            'The checks are built on **residuals**: how far each observation sits from what the model fitted. The overdispersion lesson used one kind to measure the spread. This lesson uses them to find out *where* a model goes wrong. First, why "observed minus fitted" is not enough on its own.',
        },
        {
          kind: 'quiz',
          prompt: 'A Poisson model expected a count of 1 and saw 3. Elsewhere it expected 101 and saw 103. Both counts are 2 above their fitted means. Which one should surprise you more?',
          options: [
            { text: 'The count of 3', correct: true, why: 'A Poisson count\'s standard deviation is the square root of its mean. A gap of 2 is two standard deviations when the mean is 1, and a small fraction of one when the mean is 101.' },
            { text: 'The count of 103', why: 'A bigger count is not a more surprising one. Counts with a bigger mean spread out more, so the same gap means less there.' },
            { text: 'Neither: the gap is the same', why: 'The raw gap is the same, but the spread the model expects is not. A residual has to be measured against the spread at that mean.' },
          ],
        },
        {
          kind: 'shell',
          lines: [
            'ppois(2, lambda = 1, lower.tail = FALSE)',
            'ppois(102, lambda = 101, lower.tail = FALSE)',
            '(3 - 1) / sqrt(1)',
            '(103 - 101) / sqrt(101)',
          ],
          caption: 'The first two lines are the chance of a count at least as big as the one seen: 3 or more when the mean is 1, and 103 or more when it is 101. The last two divide each gap by its Poisson standard deviation, the square root of the mean.',
        },
      ],
    },
    {
      id: 'four-residuals',
      title: 'Four kinds of residual',
      blocks: [
        {
          kind: 'prose',
          body:
            '`residuals(fit, type = ...)` gives four kinds of residual for a GLM. The data here is `InsectSprays`, which ships with R: the number of insects found on each of 72 plots, treated with one of six sprays, A to F. A Poisson model with `spray` as its predictor fits one mean count per spray, so every plot with the same spray shares a fitted value.',
        },
        {
          kind: 'code',
          code:
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
            'res <- cbind(count = InsectSprays$count, fitted = fitted(fit),\n' +
            '             response = residuals(fit, type = "response"),\n' +
            '             pearson = residuals(fit, type = "pearson"),\n' +
            '             deviance = residuals(fit, type = "deviance"),\n' +
            '             working = residuals(fit, type = "working"))\n' +
            'round(res[c(1:3, 25:27), ], 2)\n',
          caption: 'Rows 1 to 3 had spray A and rows 25 to 27 spray C. `fitted` is the model\'s mean count for that spray.',
        },
        {
          kind: 'prose',
          body:
            'With fitted mean μ̂, each column is worked out like this:\n\n' +
            '- **response**: y − μ̂, the gap in insects.\n' +
            '- **Pearson**: (y − μ̂) / √V(μ̂), the gap divided by the standard deviation the family expects. For Poisson, V(μ) = μ, so it is (y − μ̂) / √μ̂.\n' +
            '- **deviance**: the square root of the observation\'s share of the residual deviance, with the sign of y − μ̂.\n' +
            '- **working**: (y − μ̂) g′(μ̂), the gap on the scale of the linear predictor: the working response of iteratively reweighted least squares, minus the linear predictor. For the log link it is (y − μ̂) / μ̂.\n\n' +
            'Rows 3 and 27 show why the scaling matters. The `response` column puts them at much the same distance above their fitted means; the `pearson` column puts row 27 much further out, because spray C\'s fitted mean is much smaller.',
        },
        {
          kind: 'quiz',
          prompt: 'Compare the `pearson` and `deviance` columns. Where do they disagree most?',
          options: [
            { text: 'In rows 25 to 27, where the fitted mean is small', correct: true, why: 'Both are scaled versions of the same gap, and when the fitted mean is large they nearly agree. For small counts a Poisson distribution is lopsided, and the two scalings handle that differently: deviance residuals are less skewed, which is why they are the usual choice for a normal quantile plot.' },
            { text: 'In rows 1 to 3, where the counts are large', why: 'Look again: the two columns are much closer in rows 1 to 3 than in rows 25 and 27. Pearson and deviance residuals agree well when the fitted mean is large.' },
            { text: 'They are always equal; only the name differs', why: 'They are worked out differently, and the table shows different numbers in every row. They are close only when the counts are large.' },
          ],
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
            'all.equal(residuals(fit, type = "pearson"), (InsectSprays$count - fitted(fit)) / sqrt(fitted(fit)))',
            'sum(residuals(fit, type = "deviance")^2)',
            'deviance(fit)',
            'identical(residuals(fit), residuals(fit, type = "deviance"))',
            'all.equal(fit$residuals, residuals(fit, type = "working"))',
          ],
          caption: 'The squared deviance residuals add up to the residual deviance. With no `type`, `residuals()` gives deviance residuals, but `fit$residuals` is something else: the working residuals the fitting algorithm left behind.',
        },
        {
          kind: 'match',
          ask: 'Match each kind of residual to what it is.',
          pairs: [
            { left: 'response', right: 'a gap in the units of the data, such as insects' },
            { left: 'Pearson', right: 'the one whose squares build the dispersion estimate' },
            { left: 'deviance', right: 'what residuals(fit) gives when no type is named' },
            { left: 'working', right: 'what fit$residuals holds' },
          ],
        },
      ],
    },
    {
      id: 'residual-plot',
      title: 'Residuals against fitted values',
      blocks: [
        {
          kind: 'prose',
          body:
            'The most useful single check is a plot of residuals against the fitted values, or against the **linear predictor**, which for a log link is the log of the fitted mean and spreads the points out more evenly. Use Pearson or deviance residuals. When the model is right, the points form a band of even width around zero, with no pattern. Two patterns matter:\n\n' +
            '- a **curve**, with the middle of the band bending away from zero, says the model for the mean is the wrong shape: a missing term, or the wrong link;\n' +
            '- a **fan**, with the band widening as the fitted values grow, says the variance grows faster than the family\'s variance function V(μ) allows.\n\n' +
            'The card draws that plot from numbers R produced. The line through the dots is a smooth made by `lowess()`, which follows the average residual from left to right.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'residuals-against-fitted',
            title: 'What a residual plot shows',
            intro: 'The same Poisson model, `glm(y ~ x, family = poisson)`, fitted to four sets of 100 simulated counts. Pick what is wrong with it, then pick the kind of residual, and watch the smooth and the width of the band.',
            template:
              'set.seed(21)\n' +
              'x <- runif(100, 0, 2)\n' +
              '⟦truth⟧\n' +
              'fit <- glm(y ~ x, family = poisson)\n' +
              'eta <- predict(fit)\n' +
              'r <- residuals(fit, type = "⟦type⟧")\n' +
              'third <- cut(eta, 3, labels = c("low", "middle", "high"))\n' +
              'cat("Average residual in the low, middle, high third:", round(tapply(r, third, mean), 2), "\\n")\n' +
              'cat("Spread (SD) in the low, middle, high third:     ", round(tapply(r, third, sd), 2), "\\n")\n',
            knobs: [
              { id: 'truth', label: 'what is wrong with the model', choices: TRUTH_CHOICES },
              {
                id: 'type',
                label: 'which residual',
                choices: [
                  { value: 'pearson', caption: 'Pearson' },
                  { value: 'deviance', caption: 'deviance' },
                  { value: 'response', caption: 'response (y minus fitted)' },
                ],
              },
            ],
            probes: {
              resid: 'cbind(eta, r)',
              smooth: 'local({ s <- lowess(eta, r, iter = 0); cbind(s$x, s$y) })',
              zero: 'cbind(range(eta), 0)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'linear predictor (log of the fitted mean)',
              yLabel: 'residual',
              caption: 'Each grey dot is one count. The smooth follows the average residual; the flat line is zero.',
              series: [
                { probe: 'smooth', label: 'smooth through the residuals' },
                { probe: 'zero', label: 'zero' },
              ],
              points: 'resid',
            },
            takeaway:
              'With Pearson or deviance residuals, the right model gives a smooth that hugs zero and a band of much the same width all the way along. A missing term and the wrong link both bend the smooth: a curve says the mean is the wrong shape, though not which fix it needs. The wrong variance leaves the smooth roughly flat but widens the band as the fitted values grow. Switch to response residuals and even the right model fans out, because a Poisson count spreads more as its mean grows. That is why the checks use the scaled residuals.',
          },
        },
        {
          kind: 'prose',
          body:
            'A curve tells you the mean is wrong, not how to fix it. The way to find out is to try a fix and look again. Here are the counts from the "missing term" setting, fitted with and without a squared term.',
        },
        {
          kind: 'compare',
          caption: 'Each line is the average deviance residual in the low, middle and high thirds of the linear predictor. `I(x^2)` is how a formula asks for x squared: inside a formula, `^` on its own means something else.',
          left: {
            label: 'A straight line on the log scale: y ~ x',
            code:
              'set.seed(21)\n' +
              'x <- runif(100, 0, 2)\n' +
              'y <- rpois(100, exp(3 - 2.4 * x + 1.2 * x^2))\n' +
              'fit <- glm(y ~ x, family = poisson)\n' +
              'third <- cut(predict(fit), 3, labels = c("low", "middle", "high"))\n' +
              'round(tapply(residuals(fit), third, mean), 2)\n',
            bad: true,
          },
          right: {
            label: 'With a squared term: y ~ x + I(x^2)',
            code:
              'set.seed(21)\n' +
              'x <- runif(100, 0, 2)\n' +
              'y <- rpois(100, exp(3 - 2.4 * x + 1.2 * x^2))\n' +
              'fit <- glm(y ~ x + I(x^2), family = poisson)\n' +
              'third <- cut(predict(fit), 3, labels = c("low", "middle", "high"))\n' +
              'round(tapply(residuals(fit), third, mean), 2)\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'The smooth through a Poisson model\'s deviance residuals bends into a clear U. What should you try first?',
          options: [
            { text: 'Let the mean bend: add a term such as x squared, or try another link, then look at the plot again', correct: true, why: 'A curve says the model for the mean is the wrong shape. Changing that shape is the fix, and the residual plot is how you check whether it worked.' },
            { text: 'Refit with family = quasipoisson', why: 'Quasi-Poisson fits exactly the same mean and only widens the standard errors, so the U would still be there. It answers extra spread, not a wrong shape.' },
            { text: 'Remove the points at both ends of the plot', why: 'The points are telling you the truth about the model. A pattern shared by many observations is the model\'s fault, not theirs.' },
            { text: 'Nothing, as long as the residuals average zero overall', why: 'With an intercept in the model, the residuals nearly always average close to zero overall. What matters is whether they average zero everywhere along the plot.' },
          ],
        },
      ],
    },
    {
      id: 'leverage',
      title: 'Leverage and standardised residuals',
      blocks: [
        {
          kind: 'prose',
          body:
            'Not every observation has the same say in a fit. One whose predictor values sit far from the rest pulls the fitted curve towards itself, so its residual comes out smaller than its real disagreement with the other points. That pull is its **leverage**, measured by its **hat value**, `hatvalues(fit)`: a number between 0 and 1, bigger for more pull. In a GLM each observation is also weighted by how much information it carries (for a Poisson count, its fitted mean), so a hat value depends on the fitted mean as well as on the predictors.',
        },
        {
          kind: 'predict',
          code: 'fit <- glm(carb ~ hp, family = poisson, data = mtcars)\nround(sum(hatvalues(fit)), 6)\n',
          ask: 'This model has two coefficients, an intercept and a slope, and 32 cars, each with a different hat value. What do the hat values add up to?',
          choices: ['[1] 2', '[1] 1', '[1] 32'],
        },
        {
          kind: 'prose',
          body:
            'So the average hat value is p/n, the number of coefficients over the number of observations, and the usual rule of thumb flags an observation whose hat value is more than twice the average: **2p/n**. In `mtcars`, `carb` is a car\'s number of carburettors and `hp` its horsepower.',
        },
        {
          kind: 'code',
          code:
            'fit <- glm(carb ~ hp, family = poisson, data = mtcars)\n' +
            'p <- length(coef(fit))\n' +
            'n <- nrow(mtcars)\n' +
            '2 * p / n\n' +
            'round(sort(hatvalues(fit), decreasing = TRUE)[1:5], 3)\n' +
            'mtcars[order(hatvalues(fit), decreasing = TRUE)[1:5], c("hp", "carb")]\n',
          caption: 'The five cars with the biggest hat values, and their horsepower. Compare each hat value with the 2p/n line above it.',
        },
        {
          kind: 'prose',
          body:
            'Leverage also changes how to read a residual. Because a high-leverage point drags the fit towards itself, its residual is squeezed. `rstandard(fit)` undoes that: it divides each residual by √(φ(1 − h)), where h is the observation\'s hat value and φ the dispersion, which a Poisson model fixes at 1. When counts are not small, standardised residuals are roughly standard normal, so values beyond ±2 deserve a look and values beyond ±3 should be rare.',
        },
        {
          kind: 'shell',
          lines: [
            'R.version.string',
            'fit <- glm(carb ~ hp, family = poisson, data = mtcars)',
            'h <- hatvalues(fit)',
            'all.equal(rstandard(fit), residuals(fit, type = "pearson") / sqrt(1 - h))',
            'all.equal(rstandard(fit, type = "deviance"), residuals(fit, type = "deviance") / sqrt(1 - h))',
            'round(range(rstandard(fit)), 2)',
          ],
          caption: 'The first line names the version of R running here. The two `all.equal()` lines check the formula against `rstandard()`, which standardises the Pearson residual unless you ask for `type = "deviance"`. The last line gives the smallest and largest standardised residuals.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Name the type',
          body:
            'From R 4.6, `rstandard()` on a GLM standardises the Pearson residual by default. Versions of R before 4.6 standardised the deviance residual, so if the R in your lab is older than the one above, the same call can give different numbers. Write `rstandard(fit, type = "pearson")` or `type = "deviance"` and your code means the same thing everywhere.',
        },
        {
          kind: 'quiz',
          prompt: 'What gives an observation high leverage?',
          options: [
            { text: 'Predictor values far from the rest of the data, and in a GLM a large weight', correct: true, why: 'Leverage is about where a point sits among the predictors, and so how hard it can pull the fit. In a GLM the weight (for Poisson, the fitted mean) adds to that.' },
            { text: 'A response far from its fitted value', why: 'That is a large residual. A high-leverage point can have a tiny residual, precisely because it has pulled the fit onto itself.' },
            { text: 'A large Cook\'s distance', why: 'Cook\'s distance measures influence, the next section. Leverage is one of its two ingredients, not the same thing.' },
          ],
        },
      ],
    },
    {
      id: 'influence',
      title: 'Influence and Cook\'s distance',
      blocks: [
        {
          kind: 'prose',
          body:
            'Leverage is the power to move a fit; **influence** is whether a point uses it. A high-leverage point whose response agrees with the rest changes little when you leave it out. One whose response disagrees drags the whole curve towards itself. **Cook\'s distance**, `cooks.distance(fit)`, measures this: how far the fitted coefficients move when that one observation is left out, scaled so observations can be compared. It combines the two ingredients: with r the standardised residual, h the hat value and p the number of coefficients, D = r² h / (p (1 − h)). A point needs some of each, and as h nears 1, even a modest residual gives a large D. No cut-off suits every data set; look for values that stand well clear of the rest (common rules of thumb flag values above 1, or above 4/n).',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(carb ~ hp, family = poisson, data = mtcars)',
            'h <- hatvalues(fit)',
            'p <- length(coef(fit))',
            'all.equal(cooks.distance(fit), rstandard(fit)^2 * h / (p * (1 - h)))',
          ],
          caption: 'The formula checked against `cooks.distance()`, with the Pearson standardised residuals `rstandard()` gives by default.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'one-far-point',
            title: 'One point far to the right',
            intro: 'Twenty-four counts with x between 0 and 2, plus one more at x = 4, far to the right of the others. Drag that last count up and down and compare the two curves: the Poisson fit with the point, and the fit without it.',
            template:
              'set.seed(7)\n' +
              'x <- c(runif(24, 0, 2), 4)\n' +
              'y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), ⟦last⟧)\n' +
              'fit <- glm(y ~ x, family = poisson)\n' +
              'without <- update(fit, subset = -25)\n' +
              'cat("Last point: hat value", round(hatvalues(fit)[25], 2), "  (2p/n is", 2 * length(coef(fit)) / length(y), ")\\n")\n' +
              'cat("Last point: standardised residual", round(rstandard(fit)[25], 2), "\\n")\n' +
              'cat("Last point: Cook\'s distance", round(cooks.distance(fit)[25], 2), "\\n")\n' +
              'cat("Largest Cook\'s distance of the other 24:", round(max(cooks.distance(fit)[-25]), 2), "\\n")\n' +
              'cat("Slope with it:", round(coef(fit)[2], 3), "  without it:", round(coef(without)[2], 3), "\\n")\n',
            knobs: [
              { id: 'last', kind: 'range', label: 'the last point\'s count', min: 0, max: 40, start: 22 },
            ],
            probes: {
              data: 'cbind(x[-25], y[-25])',
              last: 'cbind(x[25], y[25])',
              'with-it': curve('fit'),
              'without-it': curve('without'),
            },
            visual: {
              kind: 'plot',
              xLabel: 'x',
              yLabel: 'count',
              caption: 'The grey dots are the first 24 counts; the coloured dot is the one you are dragging.',
              series: [
                { probe: 'with-it', label: 'fit with the last point' },
                { probe: 'without-it', label: 'fit without it' },
              ],
              marker: 'last',
              points: 'data',
            },
            takeaway:
              'The last point\'s hat value is far above 2p/n wherever you put it: sitting far out along x gives it leverage. (The hat value also rises with the count, because a Poisson observation is weighted by its fitted mean.) Whether it has influence depends on its count. Near the curve the other points would draw anyway, the two fits almost agree and Cook\'s distance is small. Drag it well away in either direction and the curve with it bends towards it, the slope moves, and Cook\'s distance climbs far above the other 24. Notice too that its standardised residual can stay modest while its Cook\'s distance is large: the fit has been pulled onto it, which is exactly why a residual alone can miss an influential point.',
          },
        },
        {
          kind: 'prose',
          body:
            'In practice you find the most influential point, refit without it, and compare. `update()` refits a model with one thing changed; `subset = -k` leaves out row k.',
        },
        {
          kind: 'shell',
          lines: [
            'set.seed(7)',
            'x <- c(runif(24, 0, 2), 4)',
            'y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), 3)',
            'fit <- glm(y ~ x, family = poisson)',
            'k <- which.max(cooks.distance(fit))',
            'k',
            'rbind(with = coef(fit), without = coef(update(fit, subset = -k)))',
          ],
          caption: 'The card\'s data with the last count set to 3. `which.max()` gives the position of the largest Cook\'s distance, with its name above it.',
        },
        {
          kind: 'quiz',
          prompt: 'Leaving out one observation changes a slope a lot. What should you do?',
          options: [
            { text: 'Check that observation for a recording error or a reason it differs, and report how much the conclusions depend on it', correct: true, why: 'Influence is a reason to look harder, not a verdict. If the point is a mistake, fix or drop it and say so; if it is real, the honest report shows the fit with and without it.' },
            { text: 'Delete it and report the fit without it', why: 'Dropping a point because it disagrees with the model hides evidence. It may be the most informative observation you have, for instance the only one at large x.' },
            { text: 'Keep it and say nothing, since every observation counts', why: 'Keeping it may be right, but a reader deserves to know that a conclusion rests on one point.' },
          ],
        },
      ],
    },
    {
      id: 'normal-quantiles',
      title: 'A normal quantile check',
      blocks: [
        {
          kind: 'prose',
          body:
            'When a model fits and the counts are not small, its deviance residuals should look roughly like a sample from a normal distribution. A **normal quantile plot** (a Q-Q plot) checks this: sort the residuals and plot each one against the value a normal sample of the same size would be expected to have in that position. Points near a straight line look normal. `qqnorm(r, plot.it = FALSE)` works out those pairs without drawing anything: `x` holds the normal quantiles and `y` the residuals.\n\n' +
            'The catch is that counts are whole numbers. With small counts there are only a few possible residuals, and no model, however right, makes a handful of values look normal.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'qq-small-counts',
            title: 'A Q-Q plot for counts',
            intro: 'Sixty counts drawn from a Poisson distribution, fitted with a model that has no predictors. The model is exactly right every time. Pick how large the counts are and watch the plot.',
            template:
              'set.seed(5)\n' +
              'y <- rpois(60, ⟦mean⟧)\n' +
              'fit <- glm(y ~ 1, family = poisson)\n' +
              'r <- residuals(fit, type = "deviance")\n' +
              'q <- qqnorm(r, plot.it = FALSE)\n' +
              'cat("Average count:", round(mean(y), 1), "\\n")\n' +
              'cat("Different values among the 60 residuals:", length(unique(round(r, 8))), "\\n")\n' +
              'cat("Correlation of the plotted points (1 is a perfect line):", round(cor(q$x, q$y), 3), "\\n")\n',
            knobs: [
              {
                id: 'mean',
                label: 'the mean count',
                choices: [
                  { value: '0.5', caption: 'about 0.5' },
                  { value: '2', caption: 'about 2' },
                  { value: '8', caption: 'about 8' },
                  { value: '40', caption: 'about 40' },
                ],
              },
            ],
            probes: {
              qq: 'cbind(q$x, q$y)',
              line: 'cbind(c(-2.5, 2.5), c(-2.5, 2.5))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'normal quantile',
              yLabel: 'deviance residual',
              caption: 'Each grey dot is one residual against its normal quantile. The line is where standard normal residuals would fall.',
              series: [{ probe: 'line', label: 'standard normal' }],
              points: 'qq',
            },
            takeaway:
              'With a mean of about 0.5 the residuals take only a few values, the plot is a staircase of flat steps, and the points are far from the line, although the model is exactly right. As the counts grow, the residuals take more values and the points settle onto the line. A Q-Q plot of deviance residuals is a fair check for large counts; for small ones its steps and bends say more about whole numbers than about the model.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A Poisson model is fitted to counts that are mostly 0, 1 and 2. The Q-Q plot of its deviance residuals is a few flat steps that bend away from the line. What should you conclude?',
          options: [
            { text: 'Very little: counts that small give residuals that cannot look normal, even when the model is right', correct: true, why: 'Each distinct count gives its own band of residuals, which is what the steps are. Lean on the residual plot and on checks of the mean and spread instead.' },
            { text: 'The Poisson model is wrong and should be replaced', why: 'The card showed the same staircase for counts drawn from exactly the fitted model. The shape comes from the whole numbers, not from a wrong model.' },
            { text: 'The counts are overdispersed', why: 'A Q-Q plot of small counts looks stepped whatever the spread. Overdispersion is judged with the Pearson dispersion, as in the overdispersion lesson.' },
          ],
        },
      ],
    },
    {
      id: 'putting-it-together',
      title: 'Putting it together',
      blocks: [
        {
          kind: 'steps',
          title: 'A routine for checking a GLM',
          items: [
            'Plot Pearson or deviance residuals against the fitted values or the linear predictor. A curve means the mean is the wrong shape: add a term or change the link.',
            'In the same plot, look at the width of the band. A fan means the variance function is wrong: think about quasi-Poisson, a negative binomial, or another family.',
            'Find the high-leverage points with `hatvalues()` and 2p/n, and look at `rstandard()` for residuals beyond ±2.',
            'Find the influential points with `cooks.distance()`, refit without the largest, and see whether any conclusion changes.',
            'If the counts are not small, check a normal quantile plot of the deviance residuals.',
          ],
        },
        {
          kind: 'task',
          prompt:
            'Write a function `high_leverage(fit)` that takes a fitted `glm()` and returns the row numbers of the observations whose hat values are more than 2p/n, where p is the number of coefficients and n the number of observations. The tests accept the row numbers with or without names.',
          run: 'function',
          fnName: 'high_leverage',
          starter:
            'high_leverage <- function(fit) {\n' +
            '  # compare each hat value with 2p/n\n' +
            '  # and return the rows that are above it\n' +
            '}\n',
          solution:
            'high_leverage <- function(fit) {\n' +
            '  h <- hatvalues(fit)\n' +
            '  p <- length(coef(fit))\n' +
            '  n <- length(h)\n' +
            '  which(h > 2 * p / n)\n' +
            '}\n',
          tests: [
            {
              id: 'far-point',
              label: 'the card\'s counts, with one point far to the right',
              hidden: false,
              setup: 'set.seed(7); x <- c(runif(24, 0, 2), 4); y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), 22); fit <- glm(y ~ x, family = poisson)',
              call: 'high_leverage(fit)',
              expect: 'local({ set.seed(7); x <- c(runif(24, 0, 2), 4); y <- c(rpois(24, exp(0.5 + 0.6 * x[1:24])), 22); f <- glm(y ~ x, family = poisson); h <- hatvalues(f); seq_along(h)[h > 2 * mean(h)] })',
            },
            {
              id: 'mtcars',
              label: 'carburettors by horsepower in mtcars',
              hidden: false,
              setup: 'fit <- glm(carb ~ hp, family = poisson, data = mtcars)',
              call: 'high_leverage(fit)',
              expect: 'local({ f <- glm(carb ~ hp, family = poisson, data = mtcars); h <- hatvalues(f); seq_along(h)[h > 2 * mean(h)] })',
            },
            {
              id: 'balanced',
              label: 'warpbreaks, by wool and tension',
              hidden: true,
              setup: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
              call: 'high_leverage(fit)',
              expect: 'local({ f <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); h <- hatvalues(f); seq_along(h)[h > 2 * mean(h)] })',
            },
            {
              id: 'logistic',
              label: 'a logistic model: gearbox by weight in mtcars',
              hidden: true,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'high_leverage(fit)',
              expect: 'local({ f <- glm(am ~ wt, family = binomial, data = mtcars); h <- hatvalues(f); seq_along(h)[h > 2 * mean(h)] })',
            },
          ],
          hint: '`hatvalues(fit)` gives one hat value per observation and `length(coef(fit))` is p. `which()` turns a vector of TRUE and FALSE into the positions of the TRUEs.',
        },
      ],
    },
  ],
};

export default lesson;
