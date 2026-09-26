// Overdispersion: counts that spread further than a Poisson model allows.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types a dispersion, a deviance, a standard error or a p-value. The two cards simulate counts from a
// negative binomial with a known mean, so the reader can watch the spread grow while the mean stays put.
// The negative binomial model itself is only introduced here, in words; the next lessons fit it with
// glm.nb() from MASS and compare it with the Poisson fit.
import type { Lesson } from '../../lessonSchema.ts';

/** The simulated counts both cards share: 40 counts whose true mean is exp(1 + x), spread set by size. */
const SIMULATE =
  'set.seed(53)\n' +
  'x <- runif(40, 0, 1)\n' +
  'y <- rnbinom(40, mu = exp(1 + x), size = ⟦size⟧)\n' +
  'fit <- glm(y ~ x, family = poisson)\n';

const SIZE_CHOICES = [
  { value: '1000', caption: 'size 1000: almost Poisson' },
  { value: '10', caption: 'size 10' },
  { value: '3', caption: 'size 3' },
  { value: '1', caption: 'size 1: very spread' },
];

/** The fitted Poisson mean over a grid of x, for drawing a curve and the band around it. */
const onGrid = (y: string) =>
  `local({ g <- seq(0, 1, by = 0.05); m <- predict(fit, data.frame(x = g), type = "response"); cbind(g, ${y}) })`;

const lesson: Lesson = {
  id: 'overdispersion',
  title: 'When counts spread too far: overdispersion',
  summary: 'How to tell when counts vary more than a Poisson model allows, what that does to its standard errors, and the quasi-Poisson fix',
  track: 'stat2402',
  order: 6,
  prereqs: ['poisson-regression'],
  minutes: 18,
  outcomes: [
    'Say what a Poisson model assumes about the spread of counts, and check it group by group with `tapply()`',
    'Judge a fitted model with its residual deviance and the Pearson estimate of the dispersion',
    'Explain why overdispersion makes Poisson standard errors and p-values too small',
    'Refit with `family = quasipoisson` and read the dispersion line in its summary',
    'Say what a negative binomial model adds, and when to reach for it',
  ],
  sections: [
    {
      id: 'the-poisson-promise',
      title: 'The Poisson promise',
      blocks: [
        {
          kind: 'prose',
          body:
            'A Poisson regression makes two claims about a count. The first is the one you write down: the log of the mean is a straight-line function of the predictors. The second comes with `family = poisson` whether you think about it or not: **the variance of a count equals its mean**. Once the model has worked out the mean, the spread is decided too, and there is nothing left to estimate.\n\n' +
            'That second claim is easy to break, and nothing in the output warns you when it does. The model carries on printing standard errors and p-values that look as convincing as ever. This lesson is about noticing, and about what to do next.',
        },
        {
          kind: 'predict',
          code: 'x <- rpois(10000, lambda = 9)\nround(c(mean(x), var(x)))\n',
          ask: 'Ten thousand counts drawn from a Poisson distribution whose mean is 9. Rounded to whole numbers, what are their mean and their variance?',
          choices: ['[1] 9 9', '[1] 9 81', '[1] 9 3'],
        },
        {
          kind: 'prose',
          body:
            'Real counts are rarely that obliging. `warpbreaks`, which also ships with R, records how many times the yarn broke (`breaks`) while a loom wove a fixed length of it, for two types of wool (`wool`: A or B) and three settings of tension (`tension`: L, M and H, for low, medium and high).',
        },
        {
          kind: 'code',
          code: 'head(warpbreaks)\ntable(warpbreaks$wool, warpbreaks$tension)\n',
          caption: '`table()` counts the looms in each combination of wool and tension.',
        },
        {
          kind: 'prose',
          body:
            'Every loom in one of those combinations has the same wool and the same tension, so a Poisson model gives them all the same mean. If the promise holds, the variance of their counts should be close to that mean. `tapply()` splits `breaks` into groups and applies a function to each one, so you can put the two side by side.',
        },
        {
          kind: 'code',
          code:
            'm <- with(warpbreaks, tapply(breaks, wool:tension, mean))\n' +
            'v <- with(warpbreaks, tapply(breaks, wool:tension, var))\n' +
            'round(rbind(mean = m, variance = v, ratio = v / m), 1)\n',
          caption: 'One column per group. The last row divides each variance by its mean; the Poisson promise says it should be near 1.',
        },
        {
          kind: 'quiz',
          prompt: 'What does the table say about the Poisson promise for these looms?',
          options: [
            { text: 'It is broken: in every group the counts vary more than a Poisson count with that mean would', correct: true, why: 'Every entry in the ratio row is above 1, and most are well above it. A variance bigger than the mean is exactly what **overdispersion** means.' },
            { text: 'It holds, because the groups with bigger means also have bigger variances', why: 'A variance that rises with the mean is part of the promise, but the promise is stronger than that: the variance should be about *equal* to the mean, not several times it.' },
            { text: 'It cannot be judged until a model has been fitted', why: 'Within a group every loom shares its wool and tension, so the model gives them one mean. The group\'s own mean and variance estimate those directly, with no model needed. A fitted model is how you check when there are no groups like these, which is the next section.' },
          ],
        },
      ],
    },
    {
      id: 'checking-a-fit',
      title: 'Checking a fitted model',
      blocks: [
        {
          kind: 'prose',
          body:
            'Grouping works here because both predictors are factors with a handful of levels. With a numeric predictor, no two observations need share a mean, so you check the fitted model instead. Fit the Poisson model and read the bottom of its summary.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\nsummary(fit)\n',
        },
        {
          kind: 'prose',
          body:
            'Two lines matter here. The one in brackets says the dispersion parameter was *taken to be* 1: the Poisson family fixes it, and nothing was estimated. And `Residual deviance` comes with its degrees of freedom, the number of observations minus the number of coefficients.\n\n' +
            'If the model is right, the residual deviance behaves roughly like a chi-squared variable on those degrees of freedom, and a chi-squared variable averages its degrees of freedom. So a quick check is the **ratio of the residual deviance to its degrees of freedom**: near 1 is what a good Poisson fit looks like, and well above 1 says the counts spread out more than the model allows.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'deviance(fit)',
            'df.residual(fit)',
            'deviance(fit) / df.residual(fit)',
            'pchisq(deviance(fit), df.residual(fit), lower.tail = FALSE)',
          ],
          caption: 'The last line turns the same comparison into a p-value: the chance of a residual deviance at least this large if the Poisson model were right.',
        },
        {
          kind: 'prose',
          body:
            'The deviance check is rough, and it can mislead when many of the counts are small. The usual estimate of the spread itself comes from **Pearson residuals**. Each one is a count\'s distance from its fitted mean, measured in Poisson standard deviations: (observed − fitted) / √fitted. If the model is right they have a variance of about 1, so the sum of their squares divided by the residual degrees of freedom estimates the **dispersion**, φ: how many times bigger the real variance is than the mean.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'r <- residuals(fit, type = "pearson")',
            'all.equal(r, (warpbreaks$breaks - fitted(fit)) / sqrt(fitted(fit)))',
            'sum(r^2)',
            'sum(r^2) / df.residual(fit)',
          ],
          caption: 'The third line checks the definition against what `residuals()` gives. The last line is the Pearson estimate of the dispersion.',
        },
        {
          kind: 'quiz',
          prompt: 'Both ratios for the warpbreaks model are well above 1. What is the sensible reading?',
          options: [
            { text: 'The counts vary more than the Poisson model allows, so its standard errors cannot be taken at face value', correct: true, why: 'A ratio well above 1 is the signature of overdispersion. The coefficients can still be sensible; what is off is the model\'s idea of how uncertain they are, and the section after next shows by how much.' },
            { text: 'The sample is too small, and more looms would bring the ratio down to 1', why: 'The ratio estimates a property of the counts: how spread out they are around their means. More data makes that estimate more precise; it does not change what it is estimating.' },
            { text: 'The residual deviance is large, so the predictors explain nothing', why: 'For that, compare the residual deviance with the null deviance, which the predictors do bring down. A model can capture part of the pattern in the means and still be wrong about the spread.' },
          ],
        },
      ],
    },
    {
      id: 'what-it-looks-like',
      title: 'What extra spread looks like',
      blocks: [
        {
          kind: 'prose',
          body:
            'A dispersion estimate is one number, which is hard to picture. So make some counts where you know the truth. The two cards in this lesson draw 40 counts from a **negative binomial** distribution whose mean is exp(1 + x), the same curve every time, with a setting called `size` for the extra spread. Its variance is μ + μ²/size, so a very large `size` gives counts that are nearly Poisson, and a small one spreads them far wider.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'spread-around-the-mean',
            title: 'Counts with extra spread',
            intro: 'Pick how much extra spread the counts get. The outer lines sit two Poisson standard deviations either side of the fitted mean, a band a Poisson count only leaves now and then. Watch how many counts land outside it.',
            template:
              SIMULATE +
              'mu <- fitted(fit)\n' +
              'outside <- abs(y - mu) > 2 * sqrt(mu)\n' +
              'cat("Counts outside the Poisson band:", sum(outside), "of 40\\n")\n' +
              'cat("Pearson dispersion:", round(sum(residuals(fit, type = "pearson")^2) / df.residual(fit), 2), "\\n")\n',
            knobs: [
              { id: 'size', label: 'how much extra spread (a smaller size spreads more)', choices: SIZE_CHOICES },
            ],
            probes: {
              data: 'cbind(x, y)',
              mean: onGrid('m'),
              upper: onGrid('m + 2 * sqrt(m)'),
              lower: onGrid('pmax(m - 2 * sqrt(m), 0)'),
            },
            visual: {
              kind: 'plot',
              xLabel: 'x',
              yLabel: 'count',
              caption: 'Each grey dot is one count. The middle line is the Poisson fit; the outer lines are the band a Poisson count should mostly stay inside.',
              series: [
                { probe: 'upper', label: 'fitted mean + 2 Poisson SD' },
                { probe: 'mean', label: 'fitted mean' },
                { probe: 'lower', label: 'fitted mean − 2 Poisson SD' },
              ],
              points: 'data',
            },
            takeaway:
              'Every setting uses the same true mean, exp(1 + x); only the scatter around it changes. Go from the top setting to the bottom and the counts stray further from the fitted mean, more of them escape the band, and the Pearson dispersion climbs. A dispersion well above 1 looks like this in the data: counts sitting far from their fitted means, far more often than a Poisson model expects.',
          },
        },
      ],
    },
    {
      id: 'what-it-costs',
      title: 'Standard errors that are too small',
      blocks: [
        {
          kind: 'prose',
          body:
            'So the counts spread out more than the model thinks. What goes wrong is the model\'s sense of how precise its coefficients are. A standard error is worked out from the variance the model assumes: if the real variance is φ times the mean, every standard error should be √φ times bigger, and the Poisson model leaves them as they were. Refitting with `family = quasipoisson` uses the estimated φ instead. Compare the two coefficient tables.',
        },
        {
          kind: 'compare',
          caption: 'The same model for the mean, fitted twice. `signif()` keeps three significant figures so the tables fit side by side.',
          left: {
            label: 'Poisson: variance assumed equal to the mean',
            code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\nsignif(summary(fit)$coefficients, 3)\n',
            bad: true,
          },
          right: {
            label: 'Quasi-Poisson: dispersion estimated from the data',
            code: 'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)\nsignif(summary(qfit)$coefficients, 3)\n',
          },
        },
        {
          kind: 'prose',
          body:
            'Read down the `Estimate` column on each side: the same numbers. Now the `Std. Error` column: every one on the right is larger, and so is every p-value. The right-hand table also tests with `t` rather than `z`, because its standard errors lean on a φ that was estimated from the same data.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)',
            'summary(qfit)$coefficients[, "Std. Error"] / summary(fit)$coefficients[, "Std. Error"]',
            'sqrt(summary(qfit)$dispersion)',
          ],
          caption: 'Every standard error grows by the same factor, and that factor is the square root of the estimated dispersion.',
        },
        {
          kind: 'quiz',
          prompt: 'Look at the `woolB` row on each side of the comparison. What changed about the evidence that wool matters?',
          options: [
            { text: 'The estimated effect is the same, but the evidence for it is much weaker once the extra spread is allowed for', correct: true, why: 'Same estimate, bigger standard error, so a smaller t value and a bigger p-value. The Poisson table makes wool look like a clear effect; with standard errors that allow for the spread, it is far less convincing.' },
            { text: 'Wool B now has a smaller effect than it did', why: 'The `Estimate` is identical on both sides. Quasi-Poisson fits the same model for the mean; only the standard errors change.' },
            { text: 'The Poisson table was right, and the quasi-Poisson one is being overcautious', why: 'The Poisson standard errors assume the variance equals the mean, and the first two sections showed these counts spread far more than that. The quasi-Poisson ones are the ones that fit these data.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'The simulated counts tell the same story, and there you can see it happen as the spread grows. Here are the slope\'s two standard errors for the counts from the last card.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'spread-standard-errors',
            title: 'Two standard errors for one slope',
            intro: 'The same 40 counts as before, with a Poisson and a quasi-Poisson model fitted to each set. Pick the spread and compare the slope\'s two standard errors.',
            template:
              SIMULATE +
              'qfit <- glm(y ~ x, family = quasipoisson)\n' +
              'se <- c(summary(fit)$coefficients["x", "Std. Error"], summary(qfit)$coefficients["x", "Std. Error"])\n' +
              'cat("Slope estimate, Poisson:      ", round(coef(fit)["x"], 3), "\\n")\n' +
              'cat("Slope estimate, quasi-Poisson:", round(coef(qfit)["x"], 3), "\\n")\n' +
              'cat("Estimated dispersion:", round(summary(qfit)$dispersion, 2), "\\n")\n' +
              'cat("Standard error, Poisson:      ", round(se[1], 3), "\\n")\n' +
              'cat("Standard error, quasi-Poisson:", round(se[2], 3), "\\n")\n',
            knobs: [
              { id: 'size', label: 'how much extra spread (a smaller size spreads more)', choices: SIZE_CHOICES },
            ],
            probes: {
              se: 'se',
              names: 'c("Poisson", "quasi-Poisson")',
            },
            visual: {
              kind: 'bars',
              values: 'se',
              labels: 'names',
              caption: 'The standard error of the slope from each model, fitted to the same counts.',
            },
            takeaway:
              'The slope estimate is the same in both models at every setting; only the standard errors differ. The Poisson one hardly moves, because it is worked out as if the variance equalled the mean, however spread the counts really are. The quasi-Poisson one grows with the dispersion, and at the top setting, where the counts are nearly Poisson, the two are almost the same.',
          },
        },
      ],
    },
    {
      id: 'quasi-poisson',
      title: 'Fitting quasi-Poisson',
      blocks: [
        {
          kind: 'prose',
          body:
            '`family = quasipoisson` keeps everything about the Poisson model except the promise. The mean is modelled the same way, with the same log link, but the variance is allowed to be **φ times the mean**, with φ estimated from the data. That is why the estimates match and the standard errors do not.',
        },
        {
          kind: 'code',
          code: 'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)\nsummary(qfit)\n',
        },
        {
          kind: 'prose',
          body:
            'The bracketed line now gives an estimated dispersion in place of the Poisson model\'s fixed 1. It is the Pearson estimate from earlier, worked out by `summary()` itself. And the `AIC` line has no number.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)',
            'sum(residuals(fit, type = "pearson")^2) / df.residual(fit)',
            'summary(qfit)$dispersion',
          ],
          caption: 'Your Pearson estimate beside the one `summary()` reports. `summary()` builds its value from quantities the fitting algorithm leaves behind rather than calling `residuals()`, which is where any difference in the last digits comes from.',
        },
        {
          kind: 'quiz',
          prompt: 'Why does the quasi-Poisson summary print `AIC: NA`?',
          options: [
            { text: 'Quasi-Poisson describes only the mean and how the variance grows with it, not a full probability distribution, so there is no likelihood to build an AIC from', correct: true, why: 'AIC needs a likelihood. That is the price of the quasi approach: honest standard errors, but no AIC and no likelihood-ratio tests in the usual form. The negative binomial, at the end of this lesson, keeps a likelihood.' },
            { text: 'The model failed to fit', why: 'The summary reports how many scoring iterations the fit took, and its estimates match the Poisson fit\'s. The missing AIC is about what kind of model this is, not about a failed fit.' },
            { text: 'The dispersion is too large for an AIC to be worked out', why: 'The size of φ is not the issue. What is missing is a likelihood, and no value of φ supplies one.' },
          ],
        },
        {
          kind: 'match',
          ask: 'Match each piece to what it is.',
          pairs: [
            { left: 'family = poisson', right: 'variance fixed to equal the mean' },
            { left: 'family = quasipoisson', right: 'variance a multiple of the mean, estimated from the data' },
            { left: 'Pearson residual', right: '(observed − fitted) / √fitted' },
            { left: 'dispersion estimate', right: 'sum of squared Pearson residuals / residual df' },
            { left: 'residual deviance / df', right: 'a quick check: near 1 for a good Poisson fit' },
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
            'Write a function `dispersion(fit)` that takes a fitted Poisson `glm()` and returns its Pearson estimate of the dispersion: the sum of the squared Pearson residuals, divided by the residual degrees of freedom. The tests fit the models; your function only has to measure them.',
          run: 'function',
          fnName: 'dispersion',
          starter:
            'dispersion <- function(fit) {\n' +
            '  # square the Pearson residuals, add them up,\n' +
            '  # and divide by the residual degrees of freedom\n' +
            '}\n',
          solution:
            'dispersion <- function(fit) {\n' +
            '  r <- residuals(fit, type = "pearson")\n' +
            '  sum(r^2) / df.residual(fit)\n' +
            '}\n',
          tests: [
            {
              id: 'warpbreaks',
              label: 'warpbreaks, by wool and tension',
              hidden: false,
              setup: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
              call: 'dispersion(fit)',
              expect: 'local({ f <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); mu <- fitted(f); sum((warpbreaks$breaks - mu)^2 / mu) / (nrow(warpbreaks) - length(coef(f))) })',
              cmp: 'float',
            },
            {
              id: 'insects',
              label: 'InsectSprays, insect counts by spray',
              hidden: false,
              setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'dispersion(fit)',
              expect: 'local({ f <- glm(count ~ spray, family = poisson, data = InsectSprays); mu <- fitted(f); sum((InsectSprays$count - mu)^2 / mu) / (nrow(InsectSprays) - length(coef(f))) })',
              cmp: 'float',
            },
            {
              id: 'tension-only',
              label: 'warpbreaks, by tension alone',
              hidden: true,
              setup: 'fit <- glm(breaks ~ tension, family = poisson, data = warpbreaks)',
              call: 'dispersion(fit)',
              expect: 'local({ f <- glm(breaks ~ tension, family = poisson, data = warpbreaks); mu <- fitted(f); sum((warpbreaks$breaks - mu)^2 / mu) / (nrow(warpbreaks) - length(coef(f))) })',
              cmp: 'float',
            },
          ],
          hint: '`residuals(fit, type = "pearson")` gives one Pearson residual per count, and `df.residual(fit)` gives the residual degrees of freedom. Square, `sum()`, divide.',
        },
      ],
    },
    {
      id: 'negative-binomial',
      title: 'Next: the negative binomial',
      blocks: [
        {
          kind: 'prose',
          body:
            'Quasi-Poisson repairs the standard errors and stops there. The usual next step is a **negative binomial** model: a genuine probability distribution for counts, with an extra parameter, θ, for the spread. Its variance is μ + μ²/θ, so it grows faster than the mean, and faster still for bigger counts, where quasi-Poisson\'s variance only grows in proportion. As θ gets very large the extra term fades away and the model becomes Poisson again.\n\n' +
            'The counts in this lesson\'s cards were negative binomial all along: `size` in `rnbinom()` is θ. Because the negative binomial has a likelihood, you get an AIC, likelihood-ratio tests and a fair comparison with the Poisson fit. It is fitted with `glm.nb()` from the **MASS** package, which is where this path goes next, once you have a way to choose between models.',
        },
        {
          kind: 'quiz',
          prompt: 'When would you choose a negative binomial model over quasi-Poisson?',
          options: [
            { text: 'When you want a full model with a likelihood, so you can compare fits with AIC or likelihood-ratio tests', correct: true, why: 'Quasi-Poisson has no likelihood, as its missing AIC showed. The negative binomial has one, at the cost of assuming a particular shape for the extra spread.' },
            { text: 'When the Pearson dispersion is below 1', why: 'That is underdispersion: counts *less* spread out than Poisson. A negative binomial variance is never below the mean, so it cannot describe that.' },
            { text: 'When the model has more than one predictor', why: 'Both take any number of predictors. The choice is about how the variance should grow with the mean, and whether you need a likelihood.' },
          ],
        },
        {
          kind: 'steps',
          title: 'A routine for any count model',
          items: [
            'Fit the Poisson model with `glm(..., family = poisson)`.',
            'Compare the residual deviance with its degrees of freedom, and work out the Pearson dispersion.',
            'If both are near 1, keep the Poisson model and its standard errors.',
            'If they are well above 1, look first for a missing predictor, a wrong shape for the mean, or a few extreme counts: any of these can inflate the spread.',
            'If the extra spread is still there, refit with `family = quasipoisson` or a negative binomial, and report those standard errors instead.',
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say which check you used',
          body:
            '"The data were overdispersed" is a claim a reader cannot check. "The Pearson dispersion was well above 1, so the standard errors come from a quasi-Poisson fit" names the evidence and what you did about it, and anyone with your output can confirm it.',
        },
      ],
    },
  ],
};

export default lesson;
