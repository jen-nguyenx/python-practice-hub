// Gamma regression: amounts that are always positive and spread more as they grow.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types a coefficient, a dispersion, a prediction or a p-value. The thread is airquality's ozone, which is
// positive, right-skewed and more spread out on warmer days. The first card draws Gamma densities from R's
// own dgamma() and integrate(), so the reader can watch the variance follow the square of the mean while
// the coefficient of variation stays put. The second uses amounts simulated with a known spread, because a
// residual plot only teaches cleanly when you know what the answer should be.
import type { Lesson } from '../../lessonSchema.ts';

/** The ozone data every airquality block starts from: only the days that have an ozone reading. */
const AQ = 'aq <- subset(airquality, !is.na(Ozone))\n';
const GFIT = 'fit <- glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq)\n';

/**
 * A Gamma model's estimated coefficient of variation, from a model refitted here: `expect` runs on its own
 * and cannot see the fit the test's setup made. The tolerance on the tests also accepts an answer that
 * works the Pearson estimate out by hand, which differs from summary()'s in the last digits (summary()
 * builds it from the final iteration's working residuals).
 */
const cvOf = (fit: string, data = '') => `local({ ${data}f <- ${fit}; sqrt(summary(f)$dispersion) })`;

const lesson: Lesson = {
  id: 'gamma-regression',
  title: 'Positive and skewed: Gamma regression',
  summary: 'Amounts that are never negative and spread out more as they grow: the Gamma distribution, glm() with a log link, the estimated dispersion, and how it differs from logging the response',
  track: 'stat2402',
  order: 13,
  prereqs: ['regression-in-r', 'comparing-models'],
  minutes: 18,
  outcomes: [
    'Say why a normal model with one constant spread suits positive, right-skewed amounts badly',
    'Describe a Gamma distribution by its shape and mean, and explain why its variance grows with the square of the mean',
    'Fit `glm(y ~ x, family = Gamma(link = "log"))` and read each coefficient as a multiplier on the mean with `exp()`',
    'Read the estimated dispersion in `summary()` and compare nested fits with `anova(..., test = "F")`',
    'Explain how the Gamma GLM differs from `lm(log(y) ~ x)`, and check its residuals against the fitted values',
  ],
  sections: [
    {
      id: 'positive-and-skewed',
      title: 'Positive and skewed',
      blocks: [
        {
          kind: 'prose',
          body:
            'Some measurements can only ever be positive, and most of their values sit near the low end with a long tail stretching to the right: the rain that falls on a wet day, the size of an insurance claim, how long someone takes to react to a signal, the concentration of a pollutant in the air. None of them goes below zero, a few values are far bigger than the rest, and where the typical value is larger, the values also vary more.\n\n' +
            'The data here is `airquality`, which ships with R: daily readings of the air in New York from May to September 1973. `Ozone` is the ozone concentration in parts per billion, and `Temp` is the day\'s maximum temperature in degrees Fahrenheit. Some days have no ozone reading, so the first line keeps only the days that do.',
        },
        {
          kind: 'code',
          code: AQ + 'nrow(aq)\nsummary(aq$Ozone)\nstem(aq$Ozone)\n',
          caption: '`stem()` draws a stem-and-leaf plot in plain text. The line above it says where the decimal point goes; here each row is one band of ten parts per billion, and each digit on the right of the bar is one day.',
        },
        {
          kind: 'prose',
          body:
            'Most days sit in the first few rows, and a handful trail a long way down the page. That long tail on the high side is what **right-skewed** means, and it is why the mean in the summary sits above the median: a few very high days pull the mean up and leave the median where it was.\n\n' +
            'The spread tells the same story. Split the days at 75 °F and compare the two groups.',
        },
        {
          kind: 'code',
          code:
            AQ +
            'group <- ifelse(aq$Temp > 75, "above 75F", "75F or below")\n' +
            'm <- tapply(aq$Ozone, group, mean)\n' +
            's <- tapply(aq$Ozone, group, sd)\n' +
            'round(rbind(mean = m, sd = s, "sd / mean" = s / m), 2)\n',
          caption: 'The last row divides each group\'s standard deviation by its mean. That ratio is the **coefficient of variation**.',
        },
        {
          kind: 'prose',
          body:
            'The warmer days have a bigger mean and a much bigger standard deviation, yet the last row is close for the two groups: the spread has grown roughly in step with the mean. That is the pattern this lesson is about.\n\n' +
            'A linear model with normal errors assumes something else: one spread for every day, whatever its mean. It also knows nothing about zero.',
        },
        {
          kind: 'shell',
          lines: [
            AQ.trim(),
            'fit <- lm(Ozone ~ Temp, data = aq)',
            'range(aq$Temp)',
            'predict(fit, data.frame(Temp = c(57, 97)))',
            'summary(resid(fit))',
          ],
          caption: 'Predictions for the coolest and the hottest day in the data, then a summary of the straight line\'s residuals.',
        },
        {
          kind: 'quiz',
          prompt: 'What do the last two lines say about a straight line with normal errors for ozone?',
          options: [
            { text: 'It predicts a negative concentration on the coolest day in the data, and its residuals are lopsided: the largest sits much further above the line than the most negative sits below it', correct: true, why: 'Both are in the output. A normal model is symmetric and has no floor, so it cannot respect zero or a long right tail. The Gamma model is built for both.' },
            { text: 'Nothing is wrong: the residuals average zero, so the line fits', why: 'The residuals of any `lm()` with an intercept average zero. That says nothing about whether they are symmetric, or whether the predictions stay in range.' },
            { text: 'The slope must be wrong, because ozone cannot rise with temperature', why: 'Ozone does rise with temperature here: the warmer group had the bigger mean. The trouble is the shape of the scatter and the range of the predictions, not the direction.' },
          ],
        },
      ],
    },
    {
      id: 'the-gamma-distribution',
      title: 'The Gamma distribution',
      blocks: [
        {
          kind: 'prose',
          body:
            'The **Gamma distribution** describes a positive, continuous quantity. R\'s `dgamma(x, shape, rate)` gives its density, and it has two settings:\n\n' +
            '- `shape` sets the form of the curve, from a steep fall away from zero to a hump that is close to symmetric;\n' +
            '- `rate` stretches or squeezes the curve along the axis. You can give `scale = 1 / rate` instead.\n\n' +
            'Its mean and variance come from those two:\n\n' +
            '- mean: μ = shape / rate\n' +
            '- variance: shape / rate² = μ² / shape\n\n' +
            'The second line is the one that matters. The variance is the **square of the mean** divided by a fixed number, so the standard deviation is μ / √shape: it grows in proportion to the mean. Divide it by the mean and you get the coefficient of variation, 1 / √shape, which is the same whatever the mean is.',
        },
        {
          kind: 'shell',
          lines: [
            'x <- rgamma(100000, shape = 2, rate = 0.2)',
            'min(x) > 0',
            'c(mean(x), 2 / 0.2)',
            'c(var(x), 2 / 0.2^2)',
          ],
          caption: 'A hundred thousand draws with shape 2 and rate 0.2. Each pair puts the sample\'s value beside the formula\'s: shape / rate for the mean, shape / rate² for the variance.',
        },
        {
          kind: 'predict',
          code:
            'small <- rgamma(50000, shape = 4, scale = 2.5)\n' +
            'large <- rgamma(50000, shape = 4, scale = 22.5)\n' +
            'round(c(mean(small), mean(large)))\n' +
            'round(c(sd(small) / mean(small), sd(large) / mean(large)), 1)\n',
          ask: 'Two samples with the same shape, 4. The second has a scale nine times the first, so its mean is nine times as big. What do the last two lines print?',
          choices: [
            '[1] 10 90\n[1] 0.5 0.5',
            '[1] 10 90\n[1] 0.5 0.2',
            '[1] 10 90\n[1] 0.5 0.1',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'gamma-shapes',
            title: 'Shape and mean',
            intro: 'Drag the **shape** and pick the **mean** of a wet day\'s rain. R works out the mean and the variance from the curve itself, with `integrate()`. The second curve is a normal distribution with the same mean and standard deviation.',
            template:
              'shape <- ⟦shape⟧\n' +
              'mu <- ⟦mean⟧\n' +
              'scale <- mu / shape\n' +
              'm <- integrate(function(x) x * dgamma(x, shape, scale = scale), 0, Inf)$value\n' +
              'v <- integrate(function(x) (x - m)^2 * dgamma(x, shape, scale = scale), 0, Inf)$value\n' +
              'cat("Mean:", round(m, 2), "mm\\n")\n' +
              'cat("Variance:", round(v, 2), "\\n")\n' +
              'cat("SD / mean:", round(sqrt(v) / m, 3), "\\n")\n' +
              'cat("Normal curve below 0 mm:", round(pnorm(0, m, sqrt(v)), 3), "\\n")\n' +
              'grid <- seq(-1.5, 4, by = 0.05) * mu\n',
            knobs: [
              { id: 'shape', kind: 'range', label: 'shape', min: 1, max: 16, start: 2 },
              {
                id: 'mean',
                label: 'mean rain on a wet day',
                choices: [
                  { value: '5', caption: '5 mm' },
                  { value: '10', caption: '10 mm' },
                  { value: '20', caption: '20 mm' },
                ],
              },
            ],
            probes: {
              gamma: 'cbind(grid, signif(dgamma(grid, shape, scale = scale), 4))',
              normal: 'cbind(grid, signif(dnorm(grid, m, sqrt(v)), 4))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'rain, mm',
              yLabel: 'density',
              caption: 'The Gamma density against a normal curve with the same mean and standard deviation. Only the normal curve can reach below 0 mm.',
              series: [
                { probe: 'gamma', label: 'Gamma' },
                { probe: 'normal', label: 'normal, same mean and SD' },
              ],
            },
            notes: {
              '0-1': 'Shape 1 is the exponential distribution: the density is highest at zero and falls away from there, so small amounts are the most common.',
            },
            takeaway:
              'Hold the mean and drag the shape: the variance is mean² / shape, so a small shape gives a long right tail and a wide spread, and a large shape a narrower hump that is closer to symmetric. Hold the shape and change the mean: the variance grows with the **square** of the mean, the SD / mean line does not move, and the curve keeps its form, stretched along the axis. At small shapes the matching normal curve puts part of its area below 0 mm, rain that cannot fall; the larger the shape, the smaller that share, until it rounds to nothing.',
          },
        },
      ],
    },
    {
      id: 'fitting',
      title: 'Fitting it with glm()',
      blocks: [
        {
          kind: 'prose',
          body:
            'A Gamma GLM brings both ideas into a regression. The **mean** depends on the predictors through a link; with the log link, log(μ) = β₀ + β₁ × Temp. The **spread** follows the Gamma rule: the variance of each day\'s ozone is φμ², where φ, the **dispersion**, is the same for every day. Since the Gamma variance is μ² / shape, φ plays the part of 1 / shape, and √φ is the coefficient of variation.\n\n' +
            'In R that is `family = Gamma(link = "log")`, with a capital G. Lower-case `gamma()` is a different function altogether, and passing it as the family stops on purpose here, with an error that never mentions the capital letter.',
        },
        {
          kind: 'shell',
          lines: [
            'gamma(5)',
            AQ.trim(),
            'glm(Ozone ~ Temp, family = gamma, data = aq)',
          ],
          caption: '`gamma()` is the mathematical gamma function. R tries to call it to build a family, finds no argument to give it, and stops.',
        },
        {
          kind: 'code',
          code: AQ + GFIT + 'summary(fit)\n',
        },
        {
          kind: 'prose',
          body:
            'If you have met Poisson regression, this reads the same way. The `Temp` estimate is how much the **log** of the mean ozone changes for each extra degree. Put it through `exp()` and it becomes a multiplier: one degree warmer multiplies the mean ozone by exp(estimate), which is a change of 100 × (exp(estimate) − 1) per cent.',
        },
        {
          kind: 'shell',
          lines: [
            AQ.trim(),
            GFIT.trim(),
            'exp(coef(fit))',
            '100 * (exp(coef(fit)["Temp"]) - 1)',
            'exp(10 * coef(fit)["Temp"])',
          ],
          caption: 'The multipliers, the `Temp` one as a percentage change per degree, and the multiplier for ten degrees: the one-degree multiplier applied ten times over.',
        },
        {
          kind: 'predict',
          code:
            AQ + GFIT +
            'p <- predict(fit, data.frame(Temp = c(60, 70, 80, 90)), type = "response")\n' +
            'round(unname(p[2:4] / p[1:3]), 4)\n',
          ask: '`type = "response"` gives the predicted mean ozone at 60, 70, 80 and 90 °F. The last line divides each prediction by the one before it. What does it print?',
          choices: [
            '[1] 1.8558 1.8558 1.8558',
            '[1] 1.8558 1.4612 1.3156',
            '[1] 1.0638 1.0638 1.0638',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Which sentence reports the ten-degree multiplier correctly?',
          options: [
            { text: 'A day 10 °F warmer has an expected ozone concentration that many times higher, whatever temperature you start from', correct: true, why: 'On the log scale the effect adds; on the ozone scale it multiplies. The same multiplier takes you from 60 to 70 °F as from 80 to 90 °F, which is what the predict block showed.' },
            { text: 'A day 10 °F warmer has that many more parts per billion of ozone', why: 'That is how an `lm()` slope reads. With a log link the coefficient changes the log of the mean, so after `exp()` it is a factor, not an amount.' },
            { text: 'Every day that is 10 °F warmer has exactly that many times the ozone', why: 'The model describes the mean. Individual days scatter around it, with a standard deviation that is a fixed fraction of the mean.' },
          ],
        },
      ],
    },
    {
      id: 'why-the-log-link',
      title: 'Why the log link',
      blocks: [
        {
          kind: 'prose',
          body:
            '`family = Gamma` with no link named does not give you the log link. R\'s default for the Gamma family is the **inverse link**, 1 / μ = β₀ + β₁x. It is the Gamma family\'s canonical link, which makes the algebra of fitting neat, and that is why it is the default.',
        },
        {
          kind: 'shell',
          lines: ['Gamma()', 'Gamma(link = "log")'],
          caption: 'A family prints its name and its link.',
        },
        {
          kind: 'compare',
          caption: 'The same data fitted with each link, then asked for the mean ozone at 60, 80, 97 and 105 °F. Look back at `range()` in the first section: 105 °F is hotter than any day in the data.',
          left: {
            label: 'Inverse link, the default',
            code: AQ + 'fit <- glm(Ozone ~ Temp, family = Gamma, data = aq)\ncoef(fit)\npredict(fit, data.frame(Temp = c(60, 80, 97, 105)), type = "response")\n',
            bad: true,
          },
          right: {
            label: 'Log link',
            code: AQ + GFIT + 'coef(fit)\npredict(fit, data.frame(Temp = c(60, 80, 97, 105)), type = "response")\n',
          },
        },
        {
          kind: 'prose',
          body:
            'Start with the coefficients. The inverse link\'s `Temp` estimate is negative even though ozone rises with temperature, because it is the change in 1 / ozone per degree, a scale nobody can picture. The log link\'s is a multiplier you can say in a sentence.\n\n' +
            'Now the predictions. With a negative slope, the inverse link\'s 1 / μ falls towards zero as the temperature climbs and then drops below it, so its predicted mean first shoots up and then turns negative: compare its last two predictions with the log link\'s. The log link cannot do that, because exp() of any number is positive.',
        },
        {
          kind: 'quiz',
          prompt: 'Why is `Gamma(link = "log")` the usual choice rather than the default?',
          options: [
            { text: 'It keeps every predicted mean positive, and it turns each coefficient into a multiplier on the mean', correct: true, why: '`exp()` of anything is positive, and a change on the log scale is a factor on the original scale. The inverse link gives you neither.' },
            { text: 'It is the only link a Gamma model can be fitted with', why: 'The default inverse link fitted without complaint on the left. The log link is chosen because its predictions and coefficients are easier to trust and to read, not because nothing else fits.' },
            { text: 'It makes the variance the same for every observation', why: 'The variance is φμ² whichever link you choose. The link describes how the mean depends on the predictors; the family decides the spread.' },
          ],
        },
      ],
    },
    {
      id: 'dispersion-and-f-tests',
      title: 'The dispersion and F tests',
      blocks: [
        {
          kind: 'prose',
          body:
            'Look again at the bracketed line in the summary: the dispersion parameter for the Gamma family. A Poisson model fixes it at 1. Here it is **estimated** from the data, with the Pearson method. A Gamma Pearson residual is (y − μ̂) / μ̂, the gap between a day and its fitted mean as a fraction of that mean. Square them, add them up, and divide by the residual degrees of freedom.',
        },
        {
          kind: 'shell',
          lines: [
            AQ.trim(),
            GFIT.trim(),
            'summary(fit)$dispersion',
            'sum(((aq$Ozone - fitted(fit)) / fitted(fit))^2) / df.residual(fit)',
            'sqrt(summary(fit)$dispersion)',
          ],
          caption: 'The dispersion `summary()` reports, the same estimate worked out by hand, and its square root: the estimated coefficient of variation of ozone around its fitted mean.',
        },
        {
          kind: 'prose',
          body:
            'Because φ is estimated from the same data, two things differ from a Poisson model. The coefficient table uses **t** values, with `Pr(>|t|)`, rather than z. And comparing two nested models uses an **F test**, as it does for quasi-Poisson fits, because F allows for the uncertainty in φ: `anova(smaller, bigger, test = "F")`. Here is the test of whether wind speed (`Wind`, in miles per hour) adds anything once temperature is in the model.',
        },
        {
          kind: 'code',
          code:
            AQ +
            'fit1 <- glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq)\n' +
            'fit2 <- glm(Ozone ~ Temp + Wind, family = Gamma(link = "log"), data = aq)\n' +
            'anova(fit1, fit2, test = "F")\n',
          caption: '`Deviance` is how far adding `Wind` lowered the residual deviance. `F` divides that drop, per degree of freedom, by the dispersion estimated from the bigger model, and `Pr(>F)` is its p-value.',
        },
        {
          kind: 'quiz',
          prompt: 'Why does `anova()` for Gamma models take `test = "F"` rather than `test = "Chisq"`?',
          options: [
            { text: 'The drop in deviance has to be scaled by a dispersion estimated from the data, and the F test allows for the uncertainty in that estimate', correct: true, why: 'A chi-squared test treats φ as known, as it is for Poisson counts. With an estimated φ, F is the honest version, the same way t replaces z in the coefficient table.' },
            { text: 'Because the response is continuous rather than a count', why: 'What matters is whether the dispersion is estimated, not whether the response is continuous. A quasi-Poisson model for counts estimates its dispersion too, and is compared with F for the same reason.' },
            { text: 'Because the chi-squared test only works with one predictor', why: 'Both tests compare nested models with any number of predictors. The choice depends on whether the dispersion is fixed or estimated.' },
          ],
        },
      ],
    },
    {
      id: 'logging-y-instead',
      title: 'Logging y instead',
      blocks: [
        {
          kind: 'prose',
          body:
            'There is an older way to handle positive, skewed data: take logs of the response and fit an ordinary linear model, `lm(log(Ozone) ~ Temp)`. It is a reasonable model. Normal errors with a constant spread on the log scale give a spread on the original scale that grows in proportion to the mean, so its assumptions are close to the Gamma model\'s. Compare the coefficients.',
        },
        {
          kind: 'compare',
          caption: 'Both are on the log scale, so both slopes are read through `exp()` as multipliers.',
          left: {
            label: 'lm() on log(Ozone)',
            code: AQ + 'coef(lm(log(Ozone) ~ Temp, data = aq))\n',
          },
          right: {
            label: 'Gamma GLM, log link',
            code: AQ + 'coef(glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq))\n',
          },
        },
        {
          kind: 'prose',
          body:
            'The slopes are close, the intercepts less so, and the two models answer different questions. The linear model describes the **mean of log y**. Undo the log with exp() and you get exp(mean of log y), the geometric mean, which for right-skewed data sits nearer the median than the mean. The Gamma GLM describes the **log of the mean**, so exp() of its prediction is the mean itself. Put the two sets of predictions side by side.',
        },
        {
          kind: 'shell',
          lines: [
            AQ.trim(),
            'lfit <- lm(log(Ozone) ~ Temp, data = aq)',
            'gfit <- glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq)',
            'new <- data.frame(Temp = c(60, 75, 90))',
            'rbind(lm_log = exp(predict(lfit, new)), gamma = predict(gfit, new, type = "response"))',
            'c(data = mean(aq$Ozone), gamma = mean(fitted(gfit)), lm_log = mean(exp(fitted(lfit))))',
          ],
          caption: 'Predictions at 60, 75 and 90 °F from each model, then the average of each model\'s fitted values beside the average ozone in the data.',
        },
        {
          kind: 'quiz',
          prompt: 'Why do the `lm_log` predictions sit below the `gamma` ones?',
          options: [
            { text: 'exp() of an average log is a geometric mean, and for right-skewed data that is smaller than the ordinary mean the Gamma model predicts', correct: true, why: 'Taking logs pulls in the long right tail before averaging, and undoing the log afterwards cannot put it back. The last line shows it: the Gamma fitted values average close to the data\'s mean, and the lm_log ones fall short.' },
            { text: 'The linear model fits the data worse', why: 'The gap is not about the quality of the fit. Each model is estimating a different summary of ozone: one a typical value, the other the mean.' },
            { text: 'exp() loses accuracy on large numbers', why: '`exp()` is accurate to many digits here. The gap is the same way round at every temperature, and it comes from what the log model is averaging.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Pick the model that answers your question',
          body:
            'If a reader needs an expected amount, such as the average claim size or the mean rainfall on a wet day, the Gamma GLM predicts it directly. A linear model on the log scale predicts a typical value, and needs a correction before its predictions can be reported as means.',
        },
      ],
    },
    {
      id: 'checking-the-residuals',
      title: 'Checking the residuals',
      blocks: [
        {
          kind: 'prose',
          body:
            'A Gamma model makes a promise about spread: the standard deviation is a fixed fraction of the mean. Check it by plotting the residuals against the fitted values. For a GLM, `residuals(fit)` gives **deviance residuals**, already scaled by the spread the model expects, so if the model has the spread right they form an even band. A band that widens says the spread grows faster than the model thinks; one that narrows says it grows more slowly.\n\n' +
            'Real data rarely draws a clean picture, so the card uses amounts simulated with a spread you choose, and fits each set two ways.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'residual-check',
            title: 'Does the spread match the model?',
            intro: 'Pick how the amounts really spread, and which model to fit. Both models give the mean the same curve, log(μ) = β₀ + β₁x; they differ only in the spread they expect. The lines sit two standard deviations of the residuals either side of zero, worked out separately for the lowest, middle and highest third of the fitted values.',
            template:
              'set.seed(9)\n' +
              'x <- runif(150, 50, 95)\n' +
              'mu <- exp(0.5 + 0.03 * x)\n' +
              'y <- ⟦data⟧\n' +
              'fit <- ⟦model⟧\n' +
              'f <- fitted(fit)\n' +
              'r <- residuals(fit)\n' +
              'third <- cut(f, quantile(f, 0:3 / 3), include.lowest = TRUE, labels = c("low", "middle", "high"))\n' +
              's <- tapply(r, third, sd)\n' +
              'cat("SD of the residuals in each third of the fitted values:\\n")\n' +
              'print(round(s, 2))\n' +
              'cat("Highest third / lowest third:", round(s[["high"]] / s[["low"]], 2), "\\n")\n',
            knobs: [
              {
                id: 'data',
                label: 'how the amounts really spread',
                choices: [
                  { value: 'rgamma(150, shape = 4, rate = 4 / mu)', caption: 'SD grows with the mean' },
                  { value: 'mu + rnorm(150, sd = 2.5)', caption: 'the same SD everywhere' },
                ],
              },
              {
                id: 'model',
                label: 'the model you fit',
                choices: [
                  { value: 'glm(y ~ x, family = gaussian(link = "log"))', caption: 'normal: one spread for all' },
                  { value: 'glm(y ~ x, family = Gamma(link = "log"))', caption: 'Gamma: spread grows with the mean' },
                ],
              },
            ],
            probes: {
              resid: 'cbind(signif(f, 4), signif(r, 4))',
              upper: 'cbind(rep(quantile(f, 0:3 / 3), c(1, 2, 2, 1)), rep(2 * s, each = 2))',
              lower: 'cbind(rep(quantile(f, 0:3 / 3), c(1, 2, 2, 1)), rep(-2 * s, each = 2))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'fitted value',
              yLabel: 'residual',
              caption: 'Each grey dot is one observation\'s residual against its fitted value. The lines mark two SDs either side of zero, third by third.',
              series: [
                { probe: 'upper', label: '+2 SD, by third' },
                { probe: 'lower', label: '−2 SD, by third' },
              ],
              points: 'resid',
            },
            notes: {
              '0-0': 'Amounts whose SD grows with the mean, fitted by a model that expects one spread for all: the band fans out to the right.',
              '0-1': 'The model matches the data: the band stays roughly level from left to right.',
              '1-0': 'The model matches the data again: one spread everywhere, and a band that stays roughly level.',
              '1-1': 'A Gamma model on amounts with the same SD everywhere: the band narrows to the right, because the model expects more spread at large means than the data has.',
            },
            takeaway:
              'The residual plot checks the spread, not only the mean. When the model\'s spread matches the data\'s, the band is level. A band that fans out says the spread grows faster than the model expects; one that narrows says the opposite. For a Gamma GLM the question to ask of the plot is whether the SD really is a fixed fraction of the mean.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'You fit a Gamma GLM, and its residual band narrows steadily as the fitted values grow. What does that suggest?',
          options: [
            { text: 'The spread grows more slowly than the mean, so the Gamma variance is too generous at the high end', correct: true, why: 'Deviance residuals are scaled by the spread the model expects. If they shrink as the mean grows, the model expected more spread there than the data showed, as when the card fits the Gamma model to amounts with the same SD everywhere.' },
            { text: 'The model fits better at large fitted values', why: 'Smaller scaled residuals at the high end mean the model overestimated the spread there, not that it predicts the mean better. The pattern is the warning.' },
            { text: 'Nothing: a Gamma model always gives a narrowing band', why: 'When the SD really is a fixed fraction of the mean, the band is level, as when the card fits the Gamma model to amounts whose SD grows with the mean. A narrowing band is a sign of a mismatch.' },
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
            'Write a function `gamma_cv(fit)` that takes a fitted Gamma `glm()` and returns its estimated **coefficient of variation**: how big a typical observation\'s scatter around its fitted mean is, as a fraction of that mean. Since the Gamma variance is φμ², that is the square root of the dispersion `summary()` reports. The tests fit the models; your function only has to measure them.',
          run: 'function',
          fnName: 'gamma_cv',
          starter:
            'gamma_cv <- function(fit) {\n' +
            '  # return the estimated coefficient of variation\n' +
            '}\n',
          solution:
            'gamma_cv <- function(fit) {\n' +
            '  sqrt(summary(fit)$dispersion)\n' +
            '}\n',
          tests: [
            {
              id: 'ozone-temp',
              label: 'ozone by temperature',
              hidden: false,
              setup: AQ + GFIT,
              call: 'gamma_cv(fit)',
              expect: cvOf('glm(Ozone ~ Temp, family = Gamma(link = "log"), data = aq)', 'aq <- subset(airquality, !is.na(Ozone)); '),
              cmp: 'float',
              tol: 1e-4,
            },
            {
              id: 'ozone-temp-wind',
              label: 'ozone by temperature and wind',
              hidden: false,
              setup: AQ + 'fit <- glm(Ozone ~ Temp + Wind, family = Gamma(link = "log"), data = aq)\n',
              call: 'gamma_cv(fit)',
              expect: cvOf('glm(Ozone ~ Temp + Wind, family = Gamma(link = "log"), data = aq)', 'aq <- subset(airquality, !is.na(Ozone)); '),
              cmp: 'float',
              tol: 1e-4,
            },
            {
              id: 'simulated',
              label: 'simulated amounts with shape 4',
              hidden: true,
              setup: 'set.seed(1)\nx <- runif(200)\ny <- rgamma(200, shape = 4, rate = 4 / exp(1 + x))\nfit <- glm(y ~ x, family = Gamma(link = "log"))\n',
              call: 'gamma_cv(fit)',
              expect: cvOf('glm(y ~ x, family = Gamma(link = "log"))', 'set.seed(1); x <- runif(200); y <- rgamma(200, shape = 4, rate = 4 / exp(1 + x)); '),
              cmp: 'float',
              tol: 1e-4,
            },
            {
              id: 'inverse-link',
              label: 'ozone with the default inverse link',
              hidden: true,
              setup: AQ + 'fit <- glm(Ozone ~ Temp, family = Gamma, data = aq)\n',
              call: 'gamma_cv(fit)',
              expect: cvOf('glm(Ozone ~ Temp, family = Gamma, data = aq)', 'aq <- subset(airquality, !is.na(Ozone)); '),
              cmp: 'float',
              tol: 1e-4,
            },
          ],
          hint: '`summary(fit)$dispersion` is φ. The standard deviation is √φ × μ, so dividing by the mean leaves √φ.',
        },
        {
          kind: 'match',
          ask: 'Match each piece of R to what it gives you.',
          pairs: [
            { left: '`family = Gamma`', right: 'the inverse link, R\'s default' },
            { left: '`Gamma(link = "log")`', right: 'coefficients that are multipliers on the mean' },
            { left: '`summary(fit)$dispersion`', right: 'φ, estimated from the Pearson residuals' },
            { left: '`sqrt(summary(fit)$dispersion)`', right: 'the estimated coefficient of variation' },
            { left: '`anova(fit1, fit2, test = "F")`', right: 'a comparison of nested fits when φ is estimated' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say it as a multiplier',
          body:
            '"Temperature was significant" is not an interpretation. "Each extra degree Fahrenheit multiplies the expected ozone concentration by this factor, a rise of this many per cent, and ozone varies around that mean with a coefficient of variation of this much" is. Name the variable, say the effect multiplies the mean, and give its size from the output.',
        },
      ],
    },
  ],
};

export default lesson;
