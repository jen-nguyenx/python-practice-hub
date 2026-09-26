// What makes a model a GLM: the one framework under the linear, logistic, Poisson and quasi-Poisson
// models the reader has already fitted.
//
// Every number a reader sees under a block was printed by R; the prose points at the output and never
// types a variance, a link value, a deviance or an iteration count. Definitions (V(mu) = mu, g(mu) = eta)
// are the lesson's own. R's family objects carry the theory as functions, so instead of asserting what a
// link or a variance function does, the lesson calls it at means it chooses and lets R answer. The IRLS
// section fits a logistic regression by hand with lm() and weights, and R's own trace shows glm() doing
// the same thing, round for round.
import type { Lesson } from '../../lessonSchema.ts';

/** A grid of weights across the cars in mtcars, for drawing a fitted probability curve. */
const WT_GRID = 'seq(1.5, 5.5, by = 0.1)';

const lesson: Lesson = {
  id: 'glm-theory',
  title: 'What makes a model a GLM: family, link and variance',
  summary: 'The three parts every generalised linear model shares, how R stores them in a family object, and how glm() finds its estimates',
  track: 'stat2402',
  order: 7,
  prereqs: ['overdispersion'],
  minutes: 20,
  outcomes: [
    'Name the three parts of a GLM: a distribution for the response, a linear predictor and a link',
    'Use a family object\'s `$linkfun`, `$linkinv` and `$variance` to see what a family assumes',
    'Say what the variance function V(μ) and the dispersion φ are, and how quasi families use them',
    'Explain what a canonical link is and why R makes it the default',
    'Describe how `glm()` fits by iteratively reweighted least squares, and read its trace',
    'Move between the link scale and the response scale with `family(fit)$linkinv`',
  ],
  sections: [
    {
      id: 'three-parts',
      title: 'Three parts of every GLM',
      blocks: [
        {
          kind: 'prose',
          body:
            'You have now fitted four kinds of model: a straight line with `lm()`, and logistic, Poisson and quasi-Poisson regressions with `glm()`. They answer different questions, but they are all built from the same three parts. Seeing the parts is what lets you choose a model for a new kind of data, instead of remembering four separate recipes.',
        },
        {
          kind: 'prose',
          body:
            '1. **A distribution for the response**, called the *random component*. Given the predictors, Y follows a distribution from the **exponential family**: normal, binomial, Poisson, Gamma and a few more. Its mean is written μ.\n' +
            '2. **A linear predictor**, the *systematic component*: η = β₀ + β₁x₁ + … + βₚxₚ. This is the only part with coefficients, and it is what a formula like `y ~ x1 + x2` writes down.\n' +
            '3. **A link function** g that joins the two: g(μ) = η. Run it backwards and μ = g⁻¹(η): the **inverse link** turns the straight line back into a mean.\n\n' +
            'In a Poisson regression the link is the log, so the straight line is log μ. You can check that against a fitted model: `predict()` gives η for each observation, and `fitted()` gives μ.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
            'family(fit)',
            'eta <- predict(fit)',
            'mu <- fitted(fit)',
            'cbind(eta, mu)[c(1, 25, 49), ]',
            'all.equal(log(mu), eta)',
          ],
          caption: 'Three rows, from sprays A, C and E. `family(fit)` names the distribution and the link; the last line checks that the link, applied to every fitted mean, gives the linear predictor.',
        },
        {
          kind: 'quiz',
          prompt: 'In a Poisson regression with the log link, which of these is a straight-line function of the predictors?',
          options: [
            { text: 'log μ, the log of the mean count', correct: true, why: 'That is η, the linear predictor. The link is what makes it straight: g(μ) = log μ = β₀ + β₁x₁ + ….' },
            { text: 'μ, the mean count itself', why: 'The mean is g⁻¹(η) = exp(η), which curves. The straight line only appears after the link has been applied.' },
            { text: 'The counts themselves', why: 'The counts scatter around their mean, with the spread the distribution allows. The model never says a count is a straight-line function of anything; it says the link of its mean is.' },
          ],
        },
      ],
    },
    {
      id: 'family-objects',
      title: 'Family objects in R',
      blocks: [
        {
          kind: 'prose',
          body:
            'In R, a family is more than a name. `poisson()` builds a list of functions, and `family = poisson` hands that list to `glm()`, which uses it at every step of the fit. The link is in there as two functions: `$linkfun` is g, from mean to linear predictor, and `$linkinv` is g⁻¹, from linear predictor back to mean. Call them at a few values you choose, and compare them with the functions they stand for.',
        },
        {
          kind: 'shell',
          lines: [
            'fam <- poisson()',
            'names(fam)',
            'fam$link',
            'fam$linkfun(c(1, 2, 10))',
            'log(c(1, 2, 10))',
            'fam$linkinv(c(0, 1, 2))',
            'exp(c(0, 1, 2))',
          ],
          caption: '`names()` lists every piece of the family. This lesson uses `family`, `link`, `linkfun`, `linkinv`, `variance` and `dispersion`; the rest do their work behind the scenes, while `glm()` fits and afterwards.',
        },
        {
          kind: 'predict',
          code: 'fam <- binomial()\nfam$linkfun(c(0.2, 0.5, 0.8))\n',
          ask: 'The binomial family\'s default link is the logit: the log of the odds, log(μ / (1 − μ)). What does R print for these three probabilities?',
          choices: [
            '[1] -1.386294  0.000000  1.386294',
            '[1] 0.2 0.5 0.8',
            '[1] -1.6094379 -0.6931472 -0.2231436',
            '[1] 0.25 1.00 4.00',
          ],
        },
        {
          kind: 'quiz',
          prompt: '`poisson()$linkinv` gives the same values as `exp()`. What does that guarantee about every fitted mean from a Poisson model with the default link?',
          options: [
            { text: 'It is above zero, whatever the coefficients are', correct: true, why: 'The linear predictor can be any number, negative included, and exp() of any number is positive. The link is what keeps a mean count from going below zero, which a straight line on its own cannot promise.' },
            { text: 'It is a whole number', why: 'The counts are whole numbers, but their mean need not be: the average of 2 and 3 is 2.5. A fitted mean is an average, not a count.' },
            { text: 'It is between 0 and 1', why: 'That is the logit link\'s guarantee, for a probability. exp() can give any positive number.' },
          ],
        },
      ],
    },
    {
      id: 'variance',
      title: 'Variance and dispersion',
      blocks: [
        {
          kind: 'prose',
          body:
            'The family has a second job: saying how the spread of the response depends on its mean. Every GLM assumes **Var(Y) = φ V(μ)**. V is the **variance function**, fixed by the family, and φ is the **dispersion**, one number for the whole model. The last lesson met a special case: a Poisson model says the variance equals the mean, which is V(μ) = μ with φ = 1. `$variance` is V itself, so you can hand the same three means to four families and compare.',
        },
        {
          kind: 'shell',
          lines: [
            'mu <- c(0.1, 0.5, 0.9)',
            'gaussian()$variance(mu)',
            'poisson()$variance(mu)',
            'binomial()$variance(mu)',
            'Gamma()$variance(mu)',
          ],
          caption: 'Means between 0 and 1, because a binomial mean is a probability. Read each line against the formulas: V(μ) = 1, μ, μ(1 − μ) and μ².',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'variance-by-family',
            title: 'How the spread follows the mean',
            intro: 'Pick a **family** and drag the **mean**. The curve is that family\'s variance function across means from 0 to 1, where all four make sense, and the dot is the mean you chose. The last line of output is the family\'s `$dispersion`: a number when the family fixes φ, and `NA` when φ is left to be estimated from the data.',
            template:
              'fam <- ⟦family⟧\n' +
              'mu <- ⟦mu⟧ / 10\n' +
              'cat("Family:", fam$family, "   Link:", fam$link, "\\n")\n' +
              'cat("V(mu) at mu =", mu, "is", fam$variance(mu), "\\n")\n' +
              'cat("Dispersion fixed by the family:", fam$dispersion, "\\n")\n',
            knobs: [
              {
                id: 'family',
                label: 'the family',
                choices: [
                  { value: 'gaussian()', caption: 'gaussian' },
                  { value: 'poisson()', caption: 'poisson' },
                  { value: 'binomial()', caption: 'binomial' },
                  { value: 'Gamma()', caption: 'Gamma' },
                ],
              },
              { id: 'mu', kind: 'range', label: 'the mean μ, in tenths', min: 1, max: 9, start: 3 },
            ],
            probes: {
              curve: 'local({ m <- seq(0.05, 0.95, by = 0.05); cbind(m, fam$variance(m)) })',
              here: 'cbind(mu, fam$variance(mu))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'mean, μ',
              yLabel: 'V(μ)',
              caption: 'The vertical scale follows the curve, so read its labels: the shapes are the point.',
              series: [{ probe: 'curve', label: 'V(μ) for this family' }],
              marker: 'here',
            },
            takeaway:
              'Only the Gaussian family\'s variance ignores the mean: its line is flat. Poisson\'s rises in step with μ. Gamma\'s rises with μ², so its standard deviation is proportional to the mean. Binomial\'s is an arch, largest at a half and shrinking towards 0 and 1, where the outcome is close to certain. Choosing a family is choosing one of these shapes for how the spread follows the mean.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A Gamma model gives two cars fitted means of 10 and 20 miles per gallon. With the model\'s one value of φ, how do their spreads compare?',
          options: [
            { text: 'The second has twice the standard deviation, so four times the variance', correct: true, why: 'Var(Y) = φ μ² for a Gamma model. Doubling μ multiplies μ² by four, and the standard deviation, √(φ) μ, by two.' },
            { text: 'They are the same, because φ is shared', why: 'φ is shared, but V(μ) is not: each observation\'s variance is φ times V of its own mean. Only the Gaussian family gives every observation the same spread.' },
            { text: 'The second has twice the variance', why: 'That is the Poisson rule, V(μ) = μ. A Gamma variance grows with the square of the mean.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'Now the φ in Var(Y) = φ V(μ). A Poisson or binomial distribution has no room for it, so those families fix φ at 1: that is the Poisson promise from the last lesson. The normal and Gamma distributions each have a spread parameter of their own, so φ is estimated from the data.\n\n' +
            'A **quasi** family goes one step further. It names only a link and a variance function, and leaves φ to be estimated; it never says which distribution the response has. That is how quasi-Poisson repaired the standard errors, and why it had no likelihood and so no AIC. `quasi()` builds one from any link and variance you name.',
        },
        {
          kind: 'shell',
          lines: [
            'poisson()$dispersion',
            'quasipoisson()$dispersion',
            'quasipoisson()$variance(c(1, 2, 10))',
            'q <- quasi(link = "log", variance = "mu^2")',
            'q$link',
            'q$variance(c(1, 2, 10))',
          ],
          caption: 'quasipoisson keeps the Poisson variance function and frees φ. The `quasi()` family has a Gamma-like variance with a log link, and no distribution behind it at all.',
        },
        {
          kind: 'match',
          ask: 'Match each family to what it assumes about the spread.',
          pairs: [
            { left: 'gaussian', right: 'V(μ) = 1, φ estimated' },
            { left: 'poisson', right: 'V(μ) = μ, φ fixed at 1' },
            { left: 'quasipoisson', right: 'V(μ) = μ, φ estimated' },
            { left: 'binomial', right: 'V(μ) = μ(1 − μ), φ fixed at 1' },
            { left: 'Gamma', right: 'V(μ) = μ², φ estimated' },
          ],
        },
      ],
    },
    {
      id: 'canonical-links',
      title: 'Canonical links',
      blocks: [
        {
          kind: 'callout',
          tone: 'note',
          title: 'The exponential family, in symbols',
          body:
            'A distribution is in the exponential family when its density, or its probability for a count, can be written as f(y) = exp{ (yθ − b(θ)) / φ + c(y, φ) }. θ is its **natural parameter**. Two facts follow from that one shape: the mean is μ = b′(θ), and the variance is φ b″(θ). Since θ is decided by μ, b″(θ) is a function of the mean, and that function is V(μ). The normal, Poisson, binomial and Gamma distributions all have this shape, which is why one algorithm can fit all of them.',
        },
        {
          kind: 'prose',
          body:
            'Each family has one link that turns the mean into its natural parameter: g(μ) = θ. That is its **canonical link**. With it, the linear predictor *is* the natural parameter, η = θ, and the maths is at its tidiest. The table gives the canonical link of each family; the shell asks R which link each family uses when you do not name one.',
        },
        {
          kind: 'table',
          caption: 'θ written in terms of the mean, for each family. For the Gamma, θ = −1/μ; R\'s inverse link is 1/μ, which gives the same fit with every coefficient\'s sign flipped.',
          head: ['Family', 'Natural parameter θ', 'Canonical link', 'V(μ)'],
          rows: [
            ['Normal', 'μ', 'identity', '1'],
            ['Poisson', 'log μ', 'log', 'μ'],
            ['Binomial', 'log(μ / (1 − μ))', 'logit', 'μ(1 − μ)'],
            ['Gamma', '−1/μ', 'inverse', 'μ²'],
          ],
        },
        {
          kind: 'shell',
          lines: [
            'sapply(list(gaussian(), poisson(), binomial(), Gamma()), function(f) f$link)',
            'Gamma()$linkfun(c(1, 2, 10))',
            'binomial(link = "probit")$link',
          ],
          caption: 'The first line asks each family for its default link. The last shows that you can ask for a different one: probit is another link for yes/no data.',
        },
        {
          kind: 'prose',
          body:
            'Why make the canonical link the default? With it, the log-likelihood has at most one peak, so the fitting algorithm in the next section cannot settle on the wrong one. And the equations `glm()` solves reduce to **Xᵀ(y − μ) = 0**, one equation for each column of the model matrix. The intercept\'s column is all ones, so one of those equations says Σ(y − μ) = 0: the fitted values add up to the observed total. A different link weights each residual differently, and the totals no longer have to match. Here is the same yes/no model with two links.',
        },
        {
          kind: 'compare',
          caption: 'The number of manual cars in `mtcars`, beside the sum of the fitted probabilities, under two links.',
          left: {
            label: 'Logit, the canonical link',
            code: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)\nc(observed = sum(mtcars$am), fitted = sum(fitted(fit)))\n',
          },
          right: {
            label: 'Probit, a different link',
            code: 'fit <- glm(am ~ wt, family = binomial(link = "probit"), data = mtcars)\nc(observed = sum(mtcars$am), fitted = sum(fitted(fit)))\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Under the logit link the fitted probabilities add up to the number of manual cars. Why?',
          options: [
            { text: 'The logit is binomial\'s canonical link, so the fitting equations include Σ(y − μ) = 0 whenever the model has an intercept', correct: true, why: 'With the canonical link the equations are Xᵀ(y − μ) = 0, and the intercept\'s column is all ones. It happens for every data set, not only this one.' },
            { text: 'The logit model predicts every car correctly', why: 'The fitted probabilities are between 0 and 1, not the 0s and 1s of the data. Only their total matches.' },
            { text: 'It is a coincidence in this data set', why: 'It holds for any binomial fit with the logit link and an intercept, whatever the data, because it is one of the equations the fit solves.' },
            { text: 'The probit model is wrong', why: 'Probit is a perfectly good model for yes/no data. Its equations weight each residual differently, so its totals need not match; that says nothing about which fits better.' },
          ],
        },
      ],
    },
    {
      id: 'irls',
      title: 'How glm() fits',
      blocks: [
        {
          kind: 'prose',
          body:
            'For a straight line there is a formula for the estimates. For most GLMs there is not, so `glm()` starts from a rough guess and improves it, one round at a time, until the deviance stops changing. `control = glm.control(trace = TRUE)` makes it print the deviance after every round.',
        },
        {
          kind: 'code',
          code:
            'fit <- glm(am ~ wt, family = binomial, data = mtcars, control = glm.control(trace = TRUE))\n' +
            'fit$iter\n' +
            'fit$converged\n' +
            'glm.control()\n',
          caption: '`fit$iter` counts the rounds (`summary()` calls them Fisher Scoring iterations), and `fit$converged` says whether the deviance settled. `glm.control()` shows the defaults: `glm()` stops once a round changes the deviance by less than `epsilon`, relative to its size, or after `maxit` rounds.',
        },
        {
          kind: 'steps',
          title: 'One round of iteratively reweighted least squares',
          items: [
            'Start from the current fitted means μ and linear predictor η = g(μ).',
            'Build a **working response** z = η + (y − μ) g′(μ): the linear predictor, nudged towards the data.',
            'Give each observation a **weight** w = 1 / (V(μ) g′(μ)²). Roughly, observations the model expects to be noisier get less say.',
            'Fit z on the predictors by weighted least squares. Its coefficients are the new estimates, and its fitted values the new η.',
            'Turn η into the new means with μ = g⁻¹(η), and work out the deviance. If it barely moved, stop; if not, go round again.',
          ],
        },
        {
          kind: 'code',
          code:
            'y <- mtcars$am\n' +
            'wt <- mtcars$wt\n' +
            'mu <- (y + 0.5) / 2\n' +
            'eta <- qlogis(mu)\n' +
            'for (i in 1:6) {\n' +
            '  w <- mu * (1 - mu)\n' +
            '  z <- eta + (y - mu) / w\n' +
            '  eta <- fitted(lm(z ~ wt, weights = w))\n' +
            '  mu <- plogis(eta)\n' +
            '  cat("round", i, "deviance", -2 * sum(y * log(mu) + (1 - y) * log(1 - mu)), "\\n")\n' +
            '}\n' +
            'coef(lm(z ~ wt, weights = w))\n' +
            'coef(glm(am ~ wt, family = binomial, data = mtcars))\n',
          caption: 'The same model fitted by hand, with nothing but `lm()` and its `weights` argument. It starts each mean at (y + 0.5) / 2, where `glm()` starts for yes/no data. For the logit link g′(μ) = 1 / (μ(1 − μ)) and V(μ) = μ(1 − μ), so the weight is μ(1 − μ). Compare the deviances with the trace above, round by round, and the last two lines with each other.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'stop-early',
            title: 'Stop glm() early',
            intro: 'Drag the **rounds** to cap how many `glm()` may run, with `glm.control(maxit = ...)`. When it runs out before the deviance settles, R warns that the algorithm did not converge. Watch the fitted curve close in on the converged one.',
            template:
              'fit <- glm(am ~ wt, family = binomial, data = mtcars, control = glm.control(maxit = ⟦rounds⟧))\n' +
              'cat("Rounds run:", fit$iter, "   Converged:", fit$converged, "\\n")\n' +
              'cat("Deviance:", round(deviance(fit), 5), "\\n")\n' +
              'cat("Coefficients:", round(coef(fit), 4), "\\n")\n',
            knobs: [
              { id: 'rounds', kind: 'range', label: 'the most rounds glm() may run (maxit)', min: 1, max: 6, start: 1 },
            ],
            probes: {
              now: `local({ g <- ${WT_GRID}; cbind(g, predict(fit, data.frame(wt = g), type = "response")) })`,
              final: `local({ g <- ${WT_GRID}; f <- glm(am ~ wt, family = binomial, data = mtcars); cbind(g, predict(f, data.frame(wt = g), type = "response")) })`,
              cars: 'cbind(mtcars$wt, mtcars$am)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'weight, thousands of lb',
              yLabel: 'P(manual)',
              caption: 'Each grey dot is one car: manuals at 1, automatics at 0.',
              series: [
                { probe: 'now', label: 'after these rounds' },
                { probe: 'final', label: 'converged fit' },
              ],
              points: 'cars',
            },
            takeaway:
              'Each round brings the curve closer to the converged one, and the change in the deviance from one round to the next shrinks fast: the early rounds do most of the work, and the last one only confirms that nothing is moving. Once a round changes the deviance by less than `epsilon`, `glm()` stops and sets `converged` to `TRUE`. If it runs out of rounds first, take the warning seriously: raise `maxit`, or look for a problem in the model or the data, before you trust the estimates.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'In the hand-made loop, why does each round need new weights?',
          options: [
            { text: 'The weights depend on the fitted means, through V(μ) and g′(μ), and the means change every round', correct: true, why: 'That is the "reweighted" in the name. Each round is an ordinary weighted least squares fit, but its weights come from the last round\'s means, so they have to be worked out again.' },
            { text: 'lm() forgets its weights after each fit', why: 'Each call to lm() is given its weights; nothing is being forgotten. The weights change because they are computed from μ, and μ has moved.' },
            { text: 'To make the deviance go down by the same amount each round', why: 'The deviance falls by less and less each round, as the trace shows. The weights are not chosen to control that; they follow from the family and the link.' },
          ],
        },
      ],
    },
    {
      id: 'linear-model',
      title: 'The linear model is a GLM',
      blocks: [
        {
          kind: 'prose',
          body:
            'Put the three parts together with the normal distribution, V(μ) = 1 and the identity link g(μ) = μ, and you have the model `lm()` fits. `glm()` with no `family` uses exactly that, so it should reproduce `lm()`. Here the dispersion φ is σ², the residual variance, and the deviance is the residual sum of squares.',
        },
        {
          kind: 'shell',
          lines: [
            'l <- lm(dist ~ speed, data = cars)',
            'g <- glm(dist ~ speed, data = cars)',
            'family(g)',
            'rbind(lm = coef(l), glm = coef(g))',
            'c(lm = summary(l)$sigma^2, glm = summary(g)$dispersion)',
            'c(lm = sum(resid(l)^2), glm = deviance(g))',
            'g$iter',
          ],
          caption: 'The same coefficients, the same estimate of σ² as the dispersion, and the same sum of squares as the deviance.',
        },
        {
          kind: 'quiz',
          prompt: 'Compare `g$iter` with the rounds the logistic fit took in the last section. Why does the Gaussian fit settle so quickly?',
          options: [
            { text: 'With the identity link and V(μ) = 1, every weight is 1 and the working response is y itself, so the first round is ordinary least squares, which is already the answer', correct: true, why: 'g′(μ) = 1 makes z = η + (y − μ) = y, and V(μ) = 1 makes w = 1. Every later round repeats the same fit, and `glm()` stops as soon as a round changes nothing.' },
            { text: 'glm() notices the family is gaussian and calls lm() instead', why: 'It runs the same iteratively reweighted least squares as for every family. It is the arithmetic that makes the first round land exactly on the answer.' },
            { text: 'The cars data set is smaller than mtcars', why: 'cars has more rows than mtcars, not fewer. What makes this fit quick is its family and link, not the size of the data.' },
          ],
        },
      ],
    },
    {
      id: 'two-scales',
      title: 'Two scales',
      blocks: [
        {
          kind: 'prose',
          body:
            'A GLM lives on two scales. The **link scale** is where the model is a straight line: η, what `predict()` gives by default. The **response scale** is the mean in the units of the data: μ, which `predict(..., type = "response")` gives. `family(fit)$linkinv` is the function between them, and it is the right one for whatever family and link the model was fitted with.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
            'new <- data.frame(spray = c("A", "C"))',
            'eta <- predict(fit, new)',
            'eta',
            'family(fit)$linkinv(eta)',
            'predict(fit, new, type = "response")',
            'family(fit)$linkfun(predict(fit, new, type = "response"))',
          ],
          caption: '`$linkinv` takes the link-scale predictions to the response scale, where they agree with `type = "response"`, and `$linkfun` takes them back.',
        },
        {
          kind: 'predict',
          code: 'fam <- Gamma()\nfam$linkinv(c(0.5, 1, 2))\n',
          ask: 'R\'s default link for the Gamma family is the inverse, g(μ) = 1/μ. What does its inverse link give for these three linear predictors?',
          choices: [
            '[1] 2.0 1.0 0.5',
            '[1] 1.648721 2.718282 7.389056',
            '[1] 0.5 1.0 2.0',
            '[1] 0.25 1.00 4.00',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'You have link-scale predictions `eta` from a Gamma model fitted with R\'s default link. Which line gives the predicted means?',
          options: [
            { text: '`family(fit)$linkinv(eta)`', correct: true, why: 'The fit carries its own inverse link, so this is right for any family and link: here it computes 1/η.' },
            { text: '`exp(eta)`', why: 'That undoes a log link. The Gamma family\'s default is the inverse link, so exp() gives means that have nothing to do with this model.' },
            { text: '`eta`', why: 'Only the identity link leaves the two scales the same. For any other link, η and μ are different numbers.' },
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
            'Write a function `to_response(fit, eta)` that takes a fitted `glm()` and some values on its link scale, and returns them on the response scale. Use the fit\'s own inverse link, `family(fit)$linkinv`, so the same function works for any family. The tests fit the models; your function only converts.',
          run: 'function',
          fnName: 'to_response',
          starter: 'to_response <- function(fit, eta) {\n  # find the fit\'s inverse link and apply it to eta\n}\n',
          solution: 'to_response <- function(fit, eta) {\n  family(fit)$linkinv(eta)\n}\n',
          tests: [
            {
              id: 'poisson',
              label: 'a Poisson fit: undo the log link',
              hidden: false,
              setup: 'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)',
              call: 'to_response(fit, c(-1, 0, 1))',
              expect: 'exp(c(-1, 0, 1))',
              cmp: 'float',
            },
            {
              id: 'binomial',
              label: 'a binomial fit: undo the logit link',
              hidden: false,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'to_response(fit, c(-2, 0, 2))',
              expect: 'plogis(c(-2, 0, 2))',
              cmp: 'float',
            },
            {
              id: 'gamma',
              label: 'a Gamma fit with its default inverse link',
              hidden: true,
              setup: 'fit <- glm(mpg ~ wt, family = Gamma, data = mtcars)',
              call: 'to_response(fit, c(0.04, 0.05))',
              expect: '1 / c(0.04, 0.05)',
              cmp: 'float',
            },
            {
              id: 'predictions',
              label: 'agrees with predict(type = "response")',
              hidden: true,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'to_response(fit, predict(fit, data.frame(wt = c(2, 3, 4))))',
              expect: 'local({ f <- glm(am ~ wt, family = binomial, data = mtcars); predict(f, data.frame(wt = c(2, 3, 4)), type = "response") })',
              cmp: 'float',
            },
          ],
          hint: '`family(fit)` is the family object the model was fitted with, and `$linkinv` is a function: call it on `eta`.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Name all three parts',
          body:
            '"We fitted a GLM" leaves a reader guessing. "A Poisson GLM with a log link, with the dispersion estimated by quasi-likelihood" names the distribution, the link and how φ was handled, and anyone with your data can fit the same model.',
        },
      ],
    },
  ],
};

export default lesson;
