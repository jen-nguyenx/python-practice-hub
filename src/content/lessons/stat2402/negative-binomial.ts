// The negative binomial: a real probability model for counts that spread further than a Poisson allows.
//
// Picks up where the overdispersion lesson stops: same warpbreaks data, same Poisson and quasi-Poisson
// fits, and now glm.nb() from MASS. Every number a reader sees was printed by R; the prose points at
// the output and never types a theta, an AIC, a standard error or a p-value. The first card draws the
// two distributions from dnbinom() and dpois(); the second simulates counts with a theta the reader
// picks and shows glm.nb() finding it, and failing to at the Poisson boundary.
import type { Lesson } from '../../lessonSchema.ts';

/** A fitted model's mean over a grid of x, for drawing a curve or a band above it. */
const onGrid = (model: string, y: string) =>
  `local({ g <- seq(0, 1, by = 0.05); m <- predict(${model}, data.frame(x = g), type = "response"); cbind(g, ${y}) })`;

const FORMULA = 'breaks ~ wool + tension';

const lesson: Lesson = {
  id: 'negative-binomial',
  title: 'A model for extra spread: the negative binomial',
  summary: 'Fit the negative binomial with glm.nb(), read theta off its summary, and choose between it, the Poisson and quasi-Poisson',
  track: 'stat2402',
  order: 11,
  prereqs: ['overdispersion', 'comparing-models'],
  minutes: 18,
  outcomes: [
    'Say what the negative binomial variance μ + μ²/θ means, and what a small or a large θ tells you',
    'Fit a negative binomial model with glm.nb() from MASS and read its summary, Theta and its standard error included',
    'Choose between a Poisson and a negative binomial fit with AIC and a likelihood ratio test, and say why that test is conservative',
    'Explain how the negative binomial and quasi-Poisson let the variance grow with the mean in different ways',
    'Predict counts with predict(type = "response") and simulate new ones with rnbinom()',
  ],
  sections: [
    {
      id: 'one-more-parameter',
      title: 'One more parameter',
      blocks: [
        {
          kind: 'prose',
          body:
            'The overdispersion lesson ended with a promise. The `warpbreaks` counts spread far further than a Poisson model allows, and quasi-Poisson repaired the standard errors, but it left no likelihood: no AIC, and no fair way to set it against the Poisson fit. The **negative binomial** is a genuine probability distribution for counts, with a second parameter, θ (theta), for the spread. Its mean is μ, like the Poisson\'s, and its variance is\n\n' +
            '**μ + μ²/θ**\n\n' +
            'The first term is the Poisson variance. The second is the extra spread, and θ controls it: a small θ makes it large, and as θ grows the extra term fades towards nothing and the negative binomial turns into the Poisson. In R\'s `rnbinom()` and `dnbinom()`, θ is the argument called `size`, which is why that lesson\'s cards had a `size` setting.',
        },
        {
          kind: 'predict',
          code: 'x <- rnbinom(10000, mu = 20, size = 5)\nround(c(mean(x), var(x)))\n',
          ask: 'Ten thousand counts from a negative binomial with mean μ = 20 and θ = 5. Rounded to whole numbers, what are their mean and their variance?',
          choices: ['[1] 20 20', '[1] 20 80', '[1]  20 100', '[1]  20 400'],
        },
        {
          kind: 'prose',
          body:
            'The mean is the μ you asked for, and the variance sits where μ + μ²/θ puts it, with μ = 20 and θ = 5: the Poisson\'s share, plus the extra term on top. The card below draws the whole distribution rather than two numbers, next to a Poisson with the same mean.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'theta-and-the-shape',
            title: 'Same mean, different spread',
            intro: 'Drag **θ** and watch the negative binomial curve against a Poisson with the same mean. Then change the mean and drag again.',
            template:
              'theta <- c(0.5, 1, 2, 5, 10, 20, 50, 1000)[⟦step⟧]\n' +
              'mu <- ⟦mu⟧\n' +
              'k <- 0:(3 * mu)\n' +
              'cat("mean, both:                 ", mu, "\\n")\n' +
              'cat("theta:                      ", theta, "\\n")\n' +
              'cat("variance, Poisson:          ", mu, "\\n")\n' +
              'cat("variance, negative binomial:", mu + mu^2 / theta, "\\n")\n',
            knobs: [
              { id: 'step', kind: 'range', label: 'θ, stepping from 0.5 up to 1000', min: 1, max: 8, start: 4 },
              {
                id: 'mu',
                label: 'the mean of both',
                choices: [
                  { value: '5', caption: 'mean 5' },
                  { value: '20', caption: 'mean 20' },
                  { value: '40', caption: 'mean 40' },
                ],
              },
            ],
            probes: {
              pois: 'cbind(k, dpois(k, mu))',
              nb: 'cbind(k, dnbinom(k, mu = mu, size = theta))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'count',
              yLabel: 'probability',
              caption: 'The probability of each count, from `dpois()` and `dnbinom()`.',
              series: [
                { probe: 'pois', label: 'Poisson' },
                { probe: 'nb', label: 'negative binomial' },
              ],
            },
            notes: {
              '0-1': 'With θ below 1 the most likely count is zero, even though the mean is still 20: a pile of zeros is balanced by a long tail of very large counts.',
              '3-0': 'Keep θ here and switch to mean 40. The extra term is μ²/θ, so it grows with the square of the mean: the same θ adds far more spread to large counts.',
              '3-2': 'The same θ as at mean 5, and the two curves are much further apart. θ is not the spread itself: the extra variance is μ²/θ, so it depends on the mean too.',
              '7-1': 'At θ = 1000 the extra term μ²/θ is tiny beside μ, and the two curves all but coincide. This end of the slider is the Poisson.',
              '7-2': 'Even at mean 40, θ = 1000 leaves the negative binomial almost exactly Poisson.',
            },
            takeaway:
              'Every setting gives both curves the same mean; only the spread differs. Drag θ down and the negative binomial flattens, piles probability onto the smallest counts and stretches a long tail to the right. Drag it up and the curve closes in on the Poisson, until at 1000 the two can hardly be told apart. Change the mean with θ held still and the gap grows with the mean: the extra variance is μ²/θ, so one θ matters far more for large counts than for small ones.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A negative binomial fit reports a very large θ. What is it telling you about the counts?',
          options: [
            { text: 'They are close to Poisson: μ²/θ is small next to μ, so there is little extra spread', correct: true, why: 'θ sits under μ² in the extra term, so the bigger it is, the less it adds. As θ grows without end the negative binomial becomes the Poisson, which is what the card shows at the top of the slider.' },
            { text: 'They are very spread out', why: 'That is a small θ. θ divides the extra term, so it measures how *little* extra spread there is, not how much.' },
            { text: 'Their mean is very large', why: 'θ and μ are separate parameters. The card holds the mean still while θ moves, and the curve still changes shape.' },
          ],
        },
      ],
    },
    {
      id: 'fitting',
      title: 'Fitting glm.nb()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`glm.nb()` lives in the **MASS** package, which comes with R. Every block in these lessons starts with nothing attached, so each one that fits a negative binomial begins with `library(MASS)`; in RStudio you load it once per session. It takes a formula and data like `glm()`, but no `family`: the family is the negative binomial, with the log link unless you ask for another, and θ is estimated along with the coefficients.',
        },
        {
          kind: 'code',
          code: `library(MASS)\nnb <- glm.nb(${FORMULA}, data = warpbreaks)\nsummary(nb)\n`,
        },
        {
          kind: 'prose',
          body:
            'The top half reads like a Poisson summary. The link is the same log link, so each coefficient is a change in the log of the mean, and `exp()` turns it into a rate ratio. Two things are new. The dispersion line names the negative binomial with the θ it settled on, and still takes the dispersion to be 1: θ does the job φ did in quasi-Poisson, so there is nothing else to estimate. And the three lines at the very bottom report θ itself, its standard error, and twice the maximised log-likelihood.',
        },
        {
          kind: 'match',
          ask: 'Match each part of the summary to what it tells you.',
          pairs: [
            { left: 'Coefficients', right: 'log-scale effects, read as in a Poisson model' },
            { left: 'Negative Binomial(...) in the dispersion line', right: 'θ again: it carries the extra spread, so no separate dispersion is estimated' },
            { left: 'Theta', right: 'the estimate of θ' },
            { left: 'Std. Err.', right: 'how precisely θ is pinned down' },
            { left: '2 x log-likelihood', right: 'what AIC and likelihood ratio tests are built from' },
            { left: 'init.theta in the call', right: 'the final θ, written into the call so that a refit starts there' },
          ],
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'nb <- glm.nb(breaks ~ wool + tension, data = warpbreaks)',
            'c(theta = nb$theta, se = nb$SE.theta)',
            'exp(coef(nb))',
            'deviance(fit) / df.residual(fit)',
            'deviance(nb) / df.residual(nb)',
          ],
          caption: 'θ and its standard error are stored in the fit. `exp(coef(nb))` gives rate ratios, read as "times the baseline" exactly as in the Poisson lesson.',
        },
        {
          kind: 'quiz',
          prompt: 'The last two lines are the deviance check from the overdispersion lesson, first for the Poisson fit and then for the negative binomial. What do they say?',
          options: [
            { text: 'The negative binomial\'s ratio is close to 1: its variance, μ + μ²/θ, accounts for the spread the Poisson model could not', correct: true, why: 'Near 1 is what a model whose variance matches the data looks like. The Poisson\'s ratio is far above 1, which is where the overdispersion lesson began.' },
            { text: 'Both are far above 1, so the negative binomial has not helped', why: 'Look again at the last line: the negative binomial\'s ratio is close to 1, well below the Poisson\'s.' },
            { text: 'The negative binomial\'s deviance is lower only because it has one more parameter', why: 'The two deviances are measured against different variance assumptions, so the drop is not one extra parameter paying its way. The ratio checks whether the spread the model assumes matches the spread in the data, and for the negative binomial it does.' },
          ],
        },
      ],
    },
    {
      id: 'three-fits',
      title: 'Three fits side by side',
      blocks: [
        {
          kind: 'prose',
          body:
            'You now have three models for the same mean: Poisson, quasi-Poisson and negative binomial. Put their estimates and standard errors next to each other.',
        },
        {
          kind: 'code',
          code:
            'library(MASS)\n' +
            `fit <- glm(${FORMULA}, family = poisson, data = warpbreaks)\n` +
            `qfit <- glm(${FORMULA}, family = quasipoisson, data = warpbreaks)\n` +
            `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
            'se <- function(m) summary(m)$coefficients[, "Std. Error"]\n' +
            'round(cbind(poisson = coef(fit), quasi = coef(qfit), negbin = coef(nb)), 3)\n' +
            'round(cbind(poisson = se(fit), quasi = se(qfit), negbin = se(nb)), 3)\n',
          caption: 'Estimates first, then standard errors, one column per model.',
        },
        {
          kind: 'prose',
          body:
            'In the first table the Poisson and quasi-Poisson columns are identical, as they were in the overdispersion lesson, and the negative binomial\'s are close to them but not the same. In the second, both models that allow for extra spread give standard errors far larger than the Poisson\'s, and close to each other. Two different repairs reaching much the same verdict on how uncertain the estimates are is reassuring.\n\n' +
            'The negative binomial summary tests with `z`, like the Poisson, rather than quasi-Poisson\'s `t`: its dispersion is taken to be 1, not estimated.',
        },
        {
          kind: 'quiz',
          prompt: 'Why are the quasi-Poisson estimates exactly the Poisson ones, while the negative binomial\'s move a little?',
          options: [
            { text: 'Quasi-Poisson multiplies every variance by the same φ, which leaves each count\'s weight relative to the others unchanged; the negative binomial variance grows faster than the mean, so looms with large means get relatively less say', correct: true, why: 'A glm weights each observation by how precise the model thinks it is. Scaling every variance by one φ scales every weight alike, so the best coefficients do not move. The μ²/θ term changes the weights unevenly, so the negative binomial settles on slightly different coefficients.' },
            { text: '`glm.nb()` uses a different link function', why: 'All three use the log link. The negative binomial call in the summary says `link = log`.' },
            { text: 'Estimating θ adds random noise to the fit', why: 'Nothing here is random: fit the same data again and you get the same numbers. The difference comes from the variance the model assumes, not from chance.' },
          ],
        },
      ],
    },
    {
      id: 'choosing',
      title: 'Poisson or negative binomial?',
      blocks: [
        {
          kind: 'prose',
          body:
            'Both models have a likelihood, so the tools from the lesson on comparing models apply. As a reminder, **AIC** is −2 × log-likelihood + 2 × the number of parameters, and the lower AIC wins. The negative binomial has one parameter more than the Poisson, θ, and AIC charges for it like any other.',
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'nb <- glm.nb(breaks ~ wool + tension, data = warpbreaks)',
            'AIC(fit, nb)',
            'nb$twologlik',
            '-nb$twologlik + 2 * 5',
          ],
          caption: 'The `df` column counts parameters: θ is the negative binomial\'s fifth. The last line rebuilds its AIC from the summary\'s "2 x log-likelihood": minus that, plus 2 for each of the five parameters.',
        },
        {
          kind: 'prose',
          body:
            'The negative binomial\'s AIC is far lower, extra parameter and all. A **likelihood ratio test** asks the same question with a p-value, and here the shortcut you learned for one, `anova()` and its drop in deviance, lets you down.',
        },
        {
          kind: 'code',
          code:
            'library(MASS)\n' +
            `fit <- glm(${FORMULA}, family = poisson, data = warpbreaks)\n` +
            `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
            'anova(fit, nb, test = "Chisq")\n',
          caption: '`anova()` does not count θ, so it sees the same number of coefficients in each model, finds no degrees of freedom between them and gives no p-value. And the two deviances are measured against different saturated models, one for each family, so their difference is not the test statistic either.',
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'nb <- glm.nb(breaks ~ wool + tension, data = warpbreaks)',
            'lr <- 2 * (as.numeric(logLik(nb)) - as.numeric(logLik(fit)))',
            'lr',
            'pchisq(lr, df = 1, lower.tail = FALSE)',
            'pchisq(lr, df = 1, lower.tail = FALSE) / 2',
          ],
          caption: 'The statistic by hand: twice the gap between the log-likelihoods, which is not the deviance column above. `as.numeric()` strips the label `logLik()` attaches. The last two lines are the textbook p-value and a corrected one, explained next.',
        },
        {
          kind: 'prose',
          body:
            'The negative binomial has one parameter more, so the textbook reference for the statistic is a chi-squared distribution on 1 degree of freedom. There is a catch. The Poisson is not a negative binomial with some ordinary value of θ; it is the limit as θ grows without end, where 1/θ reaches 0, the smallest value it can take. A null hypothesis on the edge of what is allowed breaks the usual theory.\n\n' +
            'When the counts really are Poisson, the estimate of 1/θ lands on that edge about half the time, and the statistic is then zero. The right reference puts half its weight on zero and half on the chi-squared, so the textbook p-value is twice what it should be. It is **conservative**: halve it for the corrected one.',
        },
        {
          kind: 'quiz',
          prompt: 'Why is the chi-squared p-value for a Poisson against a negative binomial fit conservative?',
          options: [
            { text: 'The Poisson sits on the edge of the negative binomial\'s range, at 1/θ = 0, so when it is true the statistic is zero about half the time and the chi-squared reference overstates the p-value', correct: true, why: 'Testing a value on the boundary of what a parameter can take breaks the usual chi-squared theory. The right reference is half zero, half chi-squared on 1 degree of freedom, so the corrected p-value is half the usual one.' },
            { text: 'θ had to be estimated, which adds uncertainty', why: 'Every likelihood ratio test estimates the extra parameter; the degree of freedom allows for that. The problem here is where the null value sits, not that θ is estimated.' },
            { text: 'The two models use different link functions', why: 'Both use the log link, as the `link = log` in the `glm.nb()` call shows.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'AIC sidesteps the boundary',
          body:
            'For `warpbreaks` both p-values are far below any usual cut-off, so halving changes nothing; it matters when the p-value lands near your cut-off. AIC uses no reference distribution at all, so the boundary has nothing to distort, which makes it the simpler comparison to report.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'theta-you-chose',
            title: 'Counts whose θ you chose',
            intro: 'Pick a θ. R draws 300 counts from a negative binomial whose mean is exp(1 + x), then fits both models. Compare the θ `glm.nb()` estimates with yours, and the two AICs. The two upper lines sit two standard deviations above the fitted mean, by each model\'s idea of the variance.',
            template:
              'theta <- ⟦theta⟧\n' +
              'library(MASS)\n' +
              'set.seed(7)\n' +
              'x <- runif(300)\n' +
              'y <- rnbinom(300, mu = exp(1 + x), size = theta)\n' +
              'pois <- glm(y ~ x, family = poisson)\n' +
              'nb <- glm.nb(y ~ x)\n' +
              'cat("theta you chose:       ", theta, "\\n")\n' +
              'cat("theta glm.nb estimated:", round(nb$theta, 2), "\\n")\n' +
              'cat("its standard error:    ", round(nb$SE.theta, 2), "\\n")\n' +
              'cat("AIC, Poisson:          ", round(AIC(pois), 1), "\\n")\n' +
              'cat("AIC, negative binomial:", round(AIC(nb), 1), "\\n")\n',
            knobs: [
              {
                id: 'theta',
                label: 'the θ the counts are drawn with',
                choices: [
                  { value: '1', caption: 'θ = 1: very spread' },
                  { value: '3', caption: 'θ = 3' },
                  { value: '10', caption: 'θ = 10' },
                  { value: '1000', caption: 'θ = 1000: Poisson in all but name' },
                ],
              },
            ],
            probes: {
              data: 'cbind(x, y)',
              mean: onGrid('nb', 'm'),
              pband: onGrid('pois', 'm + 2 * sqrt(m)'),
              nbband: onGrid('nb', 'm + 2 * sqrt(m + m^2 / nb$theta)'),
            },
            visual: {
              kind: 'plot',
              xLabel: 'x',
              yLabel: 'count',
              caption: 'Each grey dot is one count. The lowest line is the fitted mean; above it, the mean plus two standard deviations by each model.',
              series: [
                { probe: 'nbband', label: 'mean + 2 SD, negative binomial' },
                { probe: 'pband', label: 'mean + 2 SD, Poisson' },
                { probe: 'mean', label: 'fitted mean' },
              ],
              points: 'data',
            },
            notes: {
              '3': 'The warning is R\'s, and it is telling the truth: the estimate of θ kept growing until `glm.nb()` stopped trying. This is what counts with no extra spread look like to a negative binomial fit.',
            },
            takeaway:
              'At the three smaller settings, glm.nb()\'s estimate lands close to the θ you chose, the negative binomial band stretches to take in the scatter, and its AIC is the lower one. The standard error of θ grows with θ, because a large θ adds little spread to measure. At θ = 1000 the counts are Poisson in all but name: glm.nb() chases θ towards infinity, stops at its iteration limit with a warning, and reports an estimate and a standard error too large to mean anything. That is the boundary at work, and AIC takes it calmly: the Poisson wins, because the negative binomial is charged for a parameter the data did not need.',
          },
        },
      ],
    },
    {
      id: 'or-quasi-poisson',
      title: 'Or quasi-Poisson?',
      blocks: [
        {
          kind: 'prose',
          body:
            'Quasi-Poisson and the negative binomial both make room for extra spread, but they disagree about its shape. Quasi-Poisson says the variance is **φμ**, a fixed multiple of the mean: a straight line through zero. The negative binomial says **μ + μ²/θ**: the extra part grows with the square of the mean, so the variance curves upward. A line and an upward curve like these cross once. Below the crossing quasi-Poisson allows more variance; above it, the negative binomial does.\n\n' +
            'With groups like the ones in `warpbreaks`, you can put each group\'s own variance beside what each fitted model says a group with that mean should have.',
        },
        {
          kind: 'code',
          code:
            'library(MASS)\n' +
            `qfit <- glm(${FORMULA}, family = quasipoisson, data = warpbreaks)\n` +
            `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
            'm <- with(warpbreaks, tapply(breaks, wool:tension, mean))\n' +
            'v <- with(warpbreaks, tapply(breaks, wool:tension, var))\n' +
            'phi <- summary(qfit)$dispersion\n' +
            'tab <- rbind(mean = m, variance = v, quasi = phi * m, negbin = m + m^2 / nb$theta)\n' +
            'round(tab[, order(m)], 1)\n',
          caption: 'One column per combination of wool and tension, sorted by mean. The last two rows are the variance each fitted model gives a group with that mean.',
        },
        {
          kind: 'quiz',
          prompt: 'Read along the last two rows from the smallest mean to the largest. How do the two fitted variances compare?',
          options: [
            { text: 'Quasi-Poisson\'s is the larger at first, and the negative binomial\'s overtakes it at the largest mean', correct: true, why: 'The line and the curve cross once. For these fits the crossing falls between the last two columns, so only the group with the largest mean is above it.' },
            { text: 'They are the same, because both models were fitted to the same data', why: 'Both fit the same means, near enough, but each has its own rule for the variance, and the rules differ.' },
            { text: 'The negative binomial\'s is the larger in every group', why: 'Look at the first column: at the smallest mean the quasi-Poisson variance is the larger. The negative binomial\'s only overtakes it where μ²/θ has grown large.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'Now hold both rows against the `variance` row, the spread the counts really have. In most groups the negative binomial is the closer, including both ends, where the two shapes differ most. Six small groups are a rough guide rather than proof. The more lasting difference is that the negative binomial is a full probability model: it has a likelihood, so it gets an AIC, likelihood ratio tests and data you can simulate, and quasi-Poisson has none of those.',
        },
        {
          kind: 'table',
          caption: 'The three count models from these lessons, side by side.',
          head: ['', 'Poisson', 'Quasi-Poisson', 'Negative binomial'],
          rows: [
            ['Variance', 'μ', 'φμ', 'μ + μ²/θ'],
            ['As the mean grows', 'equal to the mean', 'in proportion to the mean', 'faster than the mean, curving up'],
            ['Extra parameter', 'none', 'φ, from the Pearson residuals', 'θ, by maximum likelihood'],
            ['Coefficient estimates', 'maximum likelihood', 'the same as Poisson', 'maximum likelihood, under its own variance'],
            ['AIC and likelihood ratio tests', 'yes', 'no', 'yes'],
            ['Fitted in R with', 'glm(..., family = poisson)', 'glm(..., family = quasipoisson)', 'glm.nb(...) from MASS'],
          ],
        },
      ],
    },
    {
      id: 'predicting',
      title: 'Predicting and simulating',
      blocks: [
        {
          kind: 'prose',
          body:
            '`predict()` works on a negative binomial fit as on any glm: by default it gives the log of the mean, and `type = "response"` gives the count itself.',
        },
        {
          kind: 'shell',
          lines: [
            'library(MASS)',
            'nb <- glm.nb(breaks ~ wool + tension, data = warpbreaks)',
            'new <- data.frame(wool = c("A", "B"), tension = c("L", "H"))',
            'predict(nb, new)',
            'predict(nb, new, type = "response")',
            'exp(predict(nb, new))',
          ],
          caption: 'Wool A at low tension, and wool B at high tension. The last two lines agree, because the response is exp() of the log-scale prediction.',
        },
        {
          kind: 'predict',
          code:
            'library(MASS)\n' +
            `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
            'p <- predict(nb, data.frame(wool = c("A", "B"), tension = "H"), type = "response")\n' +
            'isTRUE(all.equal(unname(p[2] / p[1]), exp(coef(nb)[["woolB"]])))\n',
          ask: 'Two looms at high tension, one of each wool. Is the ratio of their predicted breaks equal to `exp()` of the `woolB` coefficient?',
          choices: ['[1] TRUE', '[1] FALSE'],
        },
        {
          kind: 'prose',
          body:
            'To simulate from the fitted model, draw from `rnbinom()` with the fitted mean as `mu` and the estimated θ as `size`. **Name both arguments.** If you do not, the second one is taken as `size` and the third as `prob`, a probability that has to lie between 0 and 1.',
        },
        {
          kind: 'compare',
          caption: 'Ten counts for wool B at high tension, asked for two ways.',
          left: {
            label: 'Arguments by position',
            code:
              'library(MASS)\n' +
              `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
              'mu <- predict(nb, data.frame(wool = "B", tension = "H"), type = "response")[[1]]\n' +
              'rnbinom(10, mu, nb$theta)\n',
            bad: true,
          },
          right: {
            label: 'Arguments by name',
            code:
              'library(MASS)\n' +
              `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
              'mu <- predict(nb, data.frame(wool = "B", tension = "H"), type = "response")[[1]]\n' +
              'rnbinom(10, mu = mu, size = nb$theta)\n',
          },
        },
        {
          kind: 'code',
          code:
            'library(MASS)\n' +
            `nb <- glm.nb(${FORMULA}, data = warpbreaks)\n` +
            'mu <- predict(nb, data.frame(wool = "B", tension = "H"), type = "response")[[1]]\n' +
            'sim <- rnbinom(10000, mu = mu, size = nb$theta)\n' +
            'round(c(mean = mean(sim), variance = var(sim), formula = mu + mu^2 / nb$theta), 1)\n',
          caption: 'Ten thousand looms of wool B at high tension, drawn from the fitted model. The mean of the draws lands close to the fitted mean, and their variance close to μ + μ²/θ.',
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
            'Write a function `nb_vs_poisson(formula, data)` that fits the same formula twice, a Poisson model with `glm()` and a negative binomial with `glm.nb()`, and returns their AICs as a named vector with the Poisson first: `c(poisson = ..., negbin = ...)`. The starter loads MASS for you. For `warpbreaks` your answer should agree with the `AIC(fit, nb)` table earlier in this lesson.',
          run: 'function',
          fnName: 'nb_vs_poisson',
          starter:
            'library(MASS)\n\n' +
            'nb_vs_poisson <- function(formula, data) {\n' +
            '  # fit a Poisson glm() and a glm.nb() with the same formula,\n' +
            '  # then return c(poisson = ..., negbin = ...) holding their AICs\n' +
            '}\n',
          solution:
            'library(MASS)\n\n' +
            'nb_vs_poisson <- function(formula, data) {\n' +
            '  pois <- glm(formula, family = poisson, data = data)\n' +
            '  nb <- glm.nb(formula, data = data)\n' +
            '  c(poisson = AIC(pois), negbin = AIC(nb))\n' +
            '}\n',
          tests: [
            {
              id: 'warpbreaks',
              label: 'warpbreaks, by wool and tension',
              hidden: false,
              setup: 'library(MASS)',
              call: 'nb_vs_poisson(breaks ~ wool + tension, warpbreaks)',
              expect: 'local({ library(MASS); f <- breaks ~ wool + tension; c(AIC(glm(f, family = poisson, data = warpbreaks)), AIC(glm.nb(f, data = warpbreaks))) })',
              cmp: 'float',
            },
            {
              id: 'names',
              label: 'the names, Poisson first',
              hidden: false,
              setup: 'library(MASS)',
              call: 'names(nb_vs_poisson(count ~ spray, InsectSprays))',
              expect: 'c("poisson", "negbin")',
            },
            {
              id: 'insects',
              label: 'InsectSprays, insect counts by spray',
              hidden: true,
              setup: 'library(MASS)',
              call: 'nb_vs_poisson(count ~ spray, InsectSprays)',
              expect: 'local({ library(MASS); f <- count ~ spray; c(AIC(glm(f, family = poisson, data = InsectSprays)), AIC(glm.nb(f, data = InsectSprays))) })',
              cmp: 'float',
            },
            {
              id: 'quine',
              label: 'MASS quine, days absent from school',
              hidden: true,
              setup: 'library(MASS)',
              call: 'nb_vs_poisson(Days ~ Eth + Sex + Age + Lrn, quine)',
              expect: 'local({ library(MASS); f <- Days ~ Eth + Sex + Age + Lrn; c(AIC(glm(f, family = poisson, data = quine)), AIC(glm.nb(f, data = quine))) })',
              cmp: 'float',
            },
          ],
          hint: '`glm(formula, family = poisson, data = data)` and `glm.nb(formula, data = data)` fit the two models, and `AIC()` of each gives one number. Put them together with `c(poisson = ..., negbin = ...)`.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say which model, and why',
          body:
            '"A negative binomial model was fitted" leaves a reader guessing. Name the evidence: the Poisson fit\'s dispersion, the AIC of each model, and θ with its standard error from the summary. Then anyone with your output can check the choice.',
        },
      ],
    },
  ],
};

export default lesson;
