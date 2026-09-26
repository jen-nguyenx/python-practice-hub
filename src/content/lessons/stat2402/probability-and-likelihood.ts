// Distributions and likelihood: where the estimates come from.
//
// The second STAT2402 lesson, after R basics and before the first model. It sets up the two ideas every
// later lesson leans on without saying so: the distributions a GLM's family names (binomial, Poisson,
// normal, with their means and variances), and maximum likelihood, which is how glm() chooses its
// coefficients. Same discipline as the exemplar: every number a reader sees was printed by R, and the
// prose points at it rather than typing it. The two cards draw the Poisson log-likelihood of one small
// data set, first to find its top and then to show the curve sharpening as the data grow.
import type { Lesson } from '../../lessonSchema.ts';

/** Eight hours of calls to a help desk: the data set the likelihood sections share. */
const CALLS = 'calls <- c(2, 4, 3, 0, 5, 3, 1, 2)\n';

const lesson: Lesson = {
  id: 'probability-and-likelihood',
  title: 'Distributions and likelihood: where the estimates come from',
  summary: 'The binomial, Poisson and normal distributions in R, the likelihood of a parameter given the data, and the maximum likelihood estimates that glm() is built on',
  track: 'stat2402',
  order: 2,
  minutes: 18,
  prereqs: ['r-basics'],
  outcomes: [
    'Use R\'s d, p, q and r functions for the binomial, Poisson and normal distributions',
    'Give the mean and variance of each, and check them by simulating with `set.seed()`',
    'Say what a likelihood is, and why R works with the log-likelihood instead',
    'Find a maximum likelihood estimate with `optimize()` and check it against the sample mean or proportion',
    'Explain why a sharply curved log-likelihood means a more precise estimate',
    'Say what `glm()` maximises, and read `logLik()`',
  ],
  sections: [
    {
      id: 'three-distributions',
      title: 'Three distributions',
      blocks: [
        {
          kind: 'prose',
          body:
            'Every model in STAT2402 starts with a claim about how the response varies. A yes/no answer, a count and a measurement each vary in their own way, and each has a **distribution** that describes it: a rule giving the probability of every value the response could take.\n\n' +
            'Three distributions do most of the work. Each is described by one or two numbers, its **parameters**, and each has a mean and a variance that follow from them.',
        },
        {
          kind: 'table',
          caption: 'The mean and variance are what the unit\'s models lean on. A Poisson count\'s variance equals its mean, a binomial count\'s is smaller than its mean, and a normal measurement\'s spread has nothing to do with its mean.',
          head: ['Distribution', 'What it describes', 'Parameters', 'Mean', 'Variance'],
          rows: [
            ['Binomial', 'The number of successes in n tries, each with the same chance p', 'n and p', 'np', 'np(1 − p)'],
            ['Poisson', 'A count of events in a fixed time or space, with no upper limit', 'λ, the average count', 'λ', 'λ'],
            ['Normal', 'A measurement that can fall either side of its average', 'μ and σ', 'μ', 'σ²'],
          ],
        },
        {
          kind: 'match',
          ask: 'Match each response to the distribution that describes it.',
          pairs: [
            { left: 'How many of 20 planted seeds germinate', right: 'Binomial, n = 20' },
            { left: 'Whether one patient recovers', right: 'Binomial, n = 1' },
            { left: 'How many calls a help desk gets in an hour', right: 'Poisson' },
            { left: 'The weight of a fish, in grams', right: 'Normal' },
          ],
        },
      ],
    },
    {
      id: 'd-p-q-r',
      title: 'd, p, q and r',
      blocks: [
        {
          kind: 'prose',
          body:
            'R gives every distribution four functions, named by a letter in front of the distribution\'s short name (`binom`, `pois`, `norm`):\n\n' +
            '- `d` is the probability of **exactly** this value (for the normal, the height of the curve there)\n' +
            '- `p` is the probability of this value **or less**\n' +
            '- `q` goes the other way: the value with this much probability at or below it\n' +
            '- `r` draws random values from the distribution',
        },
        {
          kind: 'shell',
          lines: [
            'dbinom(3, size = 10, prob = 0.2)',
            'pbinom(3, size = 10, prob = 0.2)',
            'sum(dbinom(0:3, size = 10, prob = 0.2))',
            'dpois(0:4, lambda = 2)',
            'ppois(2, lambda = 2)',
            '1 - ppois(2, lambda = 2)',
          ],
          caption: 'Ten tries with a chance of 0.2 each, then counts with an average of 2. `pbinom(3, ...)` is the chance of 3 or fewer: the `dbinom()` values for 0 to 3 added up, which the third line checks. `1 - ppois(2, ...)` is the chance of **more than** 2.',
        },
        {
          kind: 'shell',
          lines: [
            'dnorm(0)',
            'pnorm(1.96)',
            'qnorm(0.975)',
            'pnorm(qnorm(0.975))',
            'pnorm(180, mean = 170, sd = 8)',
            'qnorm(0.9, mean = 170, sd = 8)',
          ],
          caption: 'Without `mean` and `sd`, the normal functions use the standard normal: mean 0, sd 1. `qnorm()` undoes `pnorm()`, as the fourth line shows. The last two are heights with mean 170 cm and sd 8 cm: the share of people below 180 cm, and the height that 90% of people are below.',
        },
        {
          kind: 'predict',
          code: 'dbinom(0:3, size = 3, prob = 0.5)\n',
          ask: 'Three tosses of a fair coin. What are the probabilities of 0, 1, 2 and 3 heads?',
          choices: [
            '[1] 0.125 0.375 0.375 0.125',
            '[1] 0.25 0.25 0.25 0.25',
            '[1] 0.125 0.500 0.875 1.000',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'A help desk averages 2 calls an hour. Which line gives the chance of **at least 3** calls in an hour?',
          options: [
            { text: '`1 - ppois(2, lambda = 2)`', correct: true, why: 'At least 3 is everything except 0, 1 and 2. `ppois(2, ...)` is the chance of 2 or fewer, so one minus it is the rest.' },
            { text: '`1 - ppois(3, lambda = 2)`', why: 'That is the chance of **more than** 3: it leaves out exactly 3. `p` functions include the value you give them, so the complement starts one above it.' },
            { text: '`ppois(3, lambda = 2)`', why: 'That is the chance of **at most** 3: the opposite end.' },
            { text: '`dpois(3, lambda = 2)`', why: 'That is the chance of **exactly** 3, leaving out 4, 5 and everything above.' },
          ],
        },
      ],
    },
    {
      id: 'simulating',
      title: 'Simulating with a seed',
      blocks: [
        {
          kind: 'prose',
          body:
            'The `r` functions make up data from a distribution you choose. That lets you try a method on data where you know the right answer, and it lets the ideas in this lesson be seen rather than taken on trust.\n\n' +
            'The numbers are random, so each call gives different ones. `set.seed()` fixes where R\'s random number generator starts, so the same code gives the same numbers every time. Use it whenever a result has to be reproducible, in a lab report or an assignment.',
        },
        {
          kind: 'shell',
          lines: [
            'set.seed(1)',
            'rpois(8, lambda = 3)',
            'rpois(8, lambda = 3)',
            'set.seed(1)',
            'rpois(8, lambda = 3)',
          ],
          caption: 'The second draw differs from the first. After `set.seed(1)` again, the first draw comes back exactly.',
        },
        {
          kind: 'code',
          code:
            'set.seed(2402)\n' +
            'counts <- rpois(10000, lambda = 3)\n' +
            'c(mean = mean(counts), variance = var(counts))\n' +
            'tries <- rbinom(10000, size = 20, prob = 0.3)\n' +
            'c(mean = mean(tries), variance = var(tries))\n' +
            'c(np = 20 * 0.3, "np(1 - p)" = 20 * 0.3 * 0.7)\n',
          caption: 'Ten thousand draws of each. Compare the Poisson line with λ = 3, and the binomial line with the last one, which works out np and np(1 − p) for n = 20 and p = 0.3. The simulated values land close to both but not exactly on them: they come from a sample.',
        },
        {
          kind: 'quiz',
          prompt: 'Counts of accidents at an intersection have a mean of 4 a month and a variance of 11. Which is right?',
          options: [
            { text: 'A Poisson distribution describes them badly, because its variance equals its mean', correct: true, why: 'For a Poisson, the mean and the variance are both λ. A variance far above the mean is extra spread a Poisson cannot produce, called **overdispersion**, and it has a lesson of its own.' },
            { text: 'A Poisson is fine: the variance of a count is always larger than its mean', why: 'Not for a Poisson: its variance equals its mean. A variance well above the mean is a sign the Poisson is the wrong model.' },
            { text: 'They must be binomial instead', why: 'A binomial\'s variance, np(1 − p), is smaller than its mean, np. It fits this spread even worse.' },
          ],
        },
      ],
    },
    {
      id: 'likelihood',
      title: 'The likelihood',
      blocks: [
        {
          kind: 'prose',
          body:
            'So far the question has run one way: given λ, how probable is each count? Real analysis runs the other way. You have the data, and λ is the thing you do not know.\n\n' +
            'The **likelihood** turns the question round. Take a possible value of λ and ask: **if that were the true value, how probable are the data you actually saw?** When the observations are independent, the probability of seeing all of them is the product of their separate probabilities.',
        },
        {
          kind: 'shell',
          lines: [
            CALLS.trim(),
            'round(dpois(calls, lambda = 2), 3)',
            'prod(dpois(calls, lambda = 2))',
            'prod(dpois(calls, lambda = 3))',
            'prod(dpois(calls, lambda = 5))',
          ],
          caption: 'Eight hours of calls to a help desk. The second line gives each hour\'s probability if λ were 2, and the product is the probability of the whole eight-hour record. The last two lines ask the same of λ = 3 and λ = 5.',
        },
        {
          kind: 'prose',
          body:
            'Written out, for observations y₁ to yₙ:\n\n' +
            '**L(λ) = P(y₁ | λ) × P(y₂ | λ) × … × P(yₙ | λ)**\n\n' +
            'The data are held fixed and λ varies. Every value is tiny, because any one exact record of eight counts is unlikely. What matters is the comparison: a larger likelihood means the data sit more comfortably with that value of λ.',
        },
        {
          kind: 'quiz',
          prompt: 'In the session above, the likelihood at λ = 3 is larger than at λ = 5. What does that tell you?',
          options: [
            { text: 'These eight counts are more probable if the true average is 3 calls an hour than if it is 5', correct: true, why: 'That is exactly what a likelihood compares: the probability of the observed data under each value of λ.' },
            { text: 'λ is more probably 3 than 5', why: 'A likelihood is not a probability of λ. The probabilities are of the data, worked out as if each λ were true. Likelihoods for different values of λ do not even add up to 1.' },
            { text: 'λ must be 3', why: '3 was only compared with 2 and 5. Some other value could make the data more probable still, and the next sections find it.' },
          ],
        },
      ],
    },
    {
      id: 'log-likelihood',
      title: 'Why the log',
      blocks: [
        {
          kind: 'prose',
          body:
            'Multiplying many probabilities has a practical problem. Each one is below 1, so the product shrinks with every observation, and with enough observations it becomes smaller than the smallest number a computer can store. R then shows 0 whatever λ is, and nothing can be compared.',
        },
        {
          kind: 'shell',
          lines: [
            'set.seed(2402)',
            'calls <- rpois(1000, lambda = 3)',
            'prod(dpois(calls, lambda = 3))',
            'prod(dpois(calls, lambda = 2))',
            'sum(dpois(calls, lambda = 3, log = TRUE))',
            'sum(dpois(calls, lambda = 2, log = TRUE))',
          ],
          caption: 'A thousand simulated hours. Both products come out as 0; the sums of logs still say which λ fits better.',
        },
        {
          kind: 'prose',
          body:
            'The **log-likelihood** is the log of the likelihood. The log of a product is the sum of the logs, so it is a sum of log-probabilities, one per observation, and `log = TRUE` asks `dpois()` for those logs directly:\n\n' +
            '**log L(λ) = log P(y₁ | λ) + log P(y₂ | λ) + … + log P(yₙ | λ)**\n\n' +
            'Adding a thousand ordinary negative numbers is no trouble at all.',
        },
        {
          kind: 'quiz',
          prompt: 'Does working with the log-likelihood change which value of λ comes out best?',
          options: [
            { text: 'No: the log always goes up when its input goes up, so the highest likelihood and the highest log-likelihood are at the same λ', correct: true, why: 'The log changes the height of the curve, not where its top is. That is why the two can be used interchangeably for finding an estimate.' },
            { text: 'Yes: the log-likelihood gives a more accurate estimate', why: 'It gives the same estimate. What it fixes is the arithmetic: a sum does not underflow to 0 the way a long product does.' },
            { text: 'Yes: the best λ is where the log-likelihood is closest to zero, not where the likelihood is largest', why: 'Those are the same place. The log-likelihood of counts is negative, so its largest value is the one closest to zero, and that is where the likelihood is largest too.' },
          ],
        },
        {
          kind: 'predict',
          code: 'p <- rep(0.001, 200)\nprod(p)\nsum(log(p))\n',
          ask: 'Two hundred probabilities of 0.001 each. What does R print for their product, and for the sum of their logs?',
          choices: [
            '[1] 0\n[1] -1381.551',
            '[1] 1e-600\n[1] -1381.551',
            '[1] 0\n[1] -Inf',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'poisson-loglik',
            title: 'Find the top of the curve',
            intro: 'Drag **λ**. The curve is the log-likelihood of the eight hours of calls at every λ from 0.5 to 8, and the dot is the λ you chose. Watch the log-likelihood in the output rise and then fall.',
            template:
              CALLS +
              'lambda <- ⟦lambda⟧ / 10\n' +
              'll <- sum(dpois(calls, lambda, log = TRUE))\n' +
              'cat("lambda:", lambda, "\\n")\n' +
              'cat("likelihood:", signif(prod(dpois(calls, lambda)), 3), "\\n")\n' +
              'cat("log-likelihood:", round(ll, 3), "\\n")\n' +
              'cat("mean of the eight counts:", mean(calls), "\\n")\n' +
              'grid <- seq(0.5, 8, by = 0.1)\n' +
              'curve <- sapply(grid, function(l) sum(dpois(calls, l, log = TRUE)))\n',
            knobs: [
              { id: 'lambda', kind: 'range', label: 'λ, the average calls an hour, in tenths', min: 5, max: 80, start: 10 },
            ],
            probes: {
              curve: 'cbind(grid, curve)',
              mean: 'cbind(c(mean(calls), mean(calls)), c(min(curve), max(curve)))',
              here: 'cbind(lambda, ll)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'λ',
              yLabel: 'log-likelihood',
              caption: 'The log-likelihood of the same eight counts at every λ, with a line at the mean of the counts.',
              series: [
                { probe: 'curve', label: 'log-likelihood' },
                { probe: 'mean', label: 'mean of the counts' },
              ],
              marker: 'here',
            },
            takeaway:
              'The curve has a single top, and it sits on the line at the mean of the eight counts. The λ at the top makes these counts more probable than any other value does: it is the **maximum likelihood estimate**. The likelihood line in the output shows why nobody works with the likelihood itself: even at the top it is a tiny number.',
          },
        },
      ],
    },
    {
      id: 'mle',
      title: 'The best value',
      blocks: [
        {
          kind: 'prose',
          body:
            'The **maximum likelihood estimate** (MLE) is the value of the parameter that makes the observed data most probable: the top of the log-likelihood curve. You do not need a slider to find it. `optimize()` searches an interval for the highest or lowest point of a function of one number.',
        },
        {
          kind: 'code',
          code:
            CALLS +
            'loglik <- function(lambda) sum(dpois(calls, lambda, log = TRUE))\n' +
            'optimize(loglik, interval = c(0.1, 10), maximum = TRUE)\n' +
            'mean(calls)\n',
          caption: '`$maximum` is where the top is, and `$objective` is the log-likelihood there. The last line is the mean of the eight counts.',
        },
        {
          kind: 'prose',
          body:
            'The two agree to several decimal places, and that is no accident: for a Poisson sample the MLE of λ is exactly the sample mean, which you can prove by setting the slope of the log-likelihood to zero. `optimize()` stops once it is close enough, which is why its last digits wander. The same holds for a binomial, where the MLE of p is the sample proportion.',
        },
        {
          kind: 'shell',
          lines: [
            'germinated <- 13',
            'planted <- 20',
            'loglik <- function(p) dbinom(germinated, size = planted, prob = p, log = TRUE)',
            'optimize(loglik, interval = c(0.01, 0.99), maximum = TRUE)$maximum',
            'germinated / planted',
          ],
          caption: '13 of 20 seeds germinated. The top of the binomial log-likelihood, found by search, against the proportion that germinated.',
        },
        {
          kind: 'quiz',
          prompt: 'Why does the code pass `maximum = TRUE` to `optimize()`?',
          options: [
            { text: '`optimize()` looks for the lowest point unless told otherwise, and the MLE is the highest point', correct: true, why: 'Without it, `optimize()` searches for the lowest point of the log-likelihood: the value that makes the data least probable, the opposite of an MLE.' },
            { text: 'It makes `optimize()` search the whole interval', why: 'It searches the interval either way. The flag only says whether to look for the top or the bottom.' },
            { text: 'It asks for the most precise answer `optimize()` can give', why: 'Precision is set by `optimize()`\'s `tol` argument. `maximum` only says which way is up.' },
          ],
        },
        {
          kind: 'task',
          prompt:
            'Write a function `pois_loglik(lambda, y)` that returns the Poisson log-likelihood of the counts `y` at the rate `lambda`, as one number. Add up log-probabilities rather than multiplying probabilities: one of the tests has too many counts for a product to survive.',
          run: 'function',
          fnName: 'pois_loglik',
          starter: 'pois_loglik <- function(lambda, y) {\n  # one log-probability per count, then add them up\n}\n',
          solution: 'pois_loglik <- function(lambda, y) {\n  sum(dpois(y, lambda, log = TRUE))\n}\n',
          tests: [
            { id: 'five', label: 'five counts at a rate of 3', hidden: false, call: 'pois_loglik(3, c(2, 4, 3, 0, 5))', expect: 'sum(dpois(c(2, 4, 3, 0, 5), 3, log = TRUE))', cmp: 'float' },
            { id: 'calls', label: 'the eight hours of calls at a rate of 2.5', hidden: false, call: 'pois_loglik(2.5, c(2, 4, 3, 0, 5, 3, 1, 2))', expect: 'sum(dpois(c(2, 4, 3, 0, 5, 3, 1, 2), 2.5, log = TRUE))', cmp: 'float' },
            { id: 'many', label: '1,400 counts: far too many to multiply', hidden: true, call: 'pois_loglik(3, rep(0:6, 200))', expect: 'sum(dpois(rep(0:6, 200), 3, log = TRUE))', cmp: 'float' },
            { id: 'top', label: 'its highest point is at the mean of the counts', hidden: true, call: 'optimize(function(l) pois_loglik(l, c(2, 4, 3, 0, 5, 3, 1, 2)), interval = c(0.1, 10), maximum = TRUE)$maximum', expect: 'mean(c(2, 4, 3, 0, 5, 3, 1, 2))', cmp: 'float', tol: 1e-4 },
          ],
          hint: '`dpois(y, lambda, log = TRUE)` gives one log-probability per count. `sum()` adds them.',
        },
      ],
    },
    {
      id: 'precision',
      title: 'How sure the estimate is',
      blocks: [
        {
          kind: 'prose',
          body:
            'The top of the curve gives the estimate. The **shape** around the top says how much to trust it. If the curve drops sharply on both sides, values of λ a little away from the top make the data much less probable, so the data pin λ down. If it is flat, a wide range of values fit almost as well, and the estimate is uncertain.\n\n' +
            'The sharpness of the bend at the top is measured by how fast the slope changes there, and one over its square root is the estimate\'s **standard error**.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'more-data-sharper',
            title: 'More data, sharper curve',
            intro: 'Drag the slider to see the same pattern of calls over more hours. Each curve is drawn as its drop from its own top, so both peak at 0. Watch the bend and the standard error in the output.',
            template:
              CALLS +
              'more <- rep(calls, times = ⟦times⟧)\n' +
              'top <- mean(more)\n' +
              'll <- function(l, y) sum(dpois(y, l, log = TRUE))\n' +
              'h <- 0.001\n' +
              'bend <- -(ll(top + h, more) - 2 * ll(top, more) + ll(top - h, more)) / h^2\n' +
              'cat("hours of data:", length(more), "\\n")\n' +
              'cat("estimate of lambda:", top, "\\n")\n' +
              'cat("how sharply the curve bends at its top:", round(bend, 1), "\\n")\n' +
              'cat("standard error, 1 / sqrt(bend):", round(1 / sqrt(bend), 3), "\\n")\n' +
              'grid <- seq(1, 5, by = 0.05)\n' +
              'eight <- sapply(grid, function(l) ll(l, calls) - ll(top, calls))\n' +
              'now <- sapply(grid, function(l) ll(l, more) - ll(top, more))\n',
            knobs: [
              { id: 'times', kind: 'range', label: 'hours of data, in blocks of 8 hours', min: 2, max: 12, start: 2 },
            ],
            probes: {
              eight: 'cbind(grid, eight)',
              now: 'cbind(grid, now)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'λ',
              yLabel: 'log-likelihood below its top',
              caption: 'The first eight hours on their own, against the same pattern of calls repeated over the hours you chose.',
              series: [
                { probe: 'eight', label: '8 hours' },
                { probe: 'now', label: 'the hours you chose' },
              ],
            },
            takeaway:
              'The estimate never moves, because the same pattern of calls always has the same mean. The shape does: with more hours the curve falls away from its top faster, the bend gets sharper and the standard error shrinks. More data does not change what the data say; it makes them say it more firmly. `glm()` works out the standard error of every coefficient from this same bend.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Two studies estimate the same rate. Study A\'s log-likelihood is flat near its top; study B\'s is sharply peaked. Which is right?',
          options: [
            { text: 'B\'s estimate is more precise, and has the smaller standard error', correct: true, why: 'A sharp peak means values a little away from the top make B\'s data much less probable, so those values are ruled out.' },
            { text: 'A\'s estimate is more precise, because many values of the rate fit its data well', why: 'Many values fitting almost equally well is exactly what uncertainty is.' },
            { text: 'B\'s estimate must be the larger of the two', why: 'The shape says nothing about where the top is, only how sharply it is defined.' },
          ],
        },
      ],
    },
    {
      id: 'glm',
      title: 'Where glm() comes in',
      blocks: [
        {
          kind: 'prose',
          body:
            'Everything so far had one parameter and no predictors. A generalised linear model has more: in a Poisson regression, each observation\'s λ comes from its own predictor values through the coefficients. The idea does not change. For any set of coefficients R can work out each observation\'s λ, the probability of its count, and the log-likelihood of the whole data set, and `glm()` searches for the coefficients that make that log-likelihood as large as it can be. Its estimates are maximum likelihood estimates.\n\n' +
            'With no predictors at all, `glm()` should land on the same answer as this lesson did.',
        },
        {
          kind: 'code',
          code:
            CALLS +
            'fit <- glm(calls ~ 1, family = poisson)\n' +
            'exp(coef(fit))\n' +
            'mean(calls)\n' +
            'logLik(fit)\n' +
            'sum(dpois(calls, lambda = mean(calls), log = TRUE))\n',
          caption: '`calls ~ 1` is a model with no predictors: one λ for every hour. A Poisson `glm()` works on the log scale, so `exp()` turns its one coefficient back into a rate. `logLik()` gives the log-likelihood at the estimate, and `df=1` counts the parameters it estimated.',
        },
        {
          kind: 'prose',
          body:
            '`logLik()` is worth knowing now, because the lessons ahead build on it. The deviance that `summary()` prints for a glm, the likelihood ratio tests that compare two models, and AIC are all made from log-likelihoods like this one.',
        },
        {
          kind: 'quiz',
          prompt: 'How does `glm()` choose its coefficients?',
          options: [
            { text: 'It finds the values that make the log-likelihood of the observed data as large as possible', correct: true, why: 'That is maximum likelihood, the same idea as the slider and `optimize()` in this lesson, with more than one number to choose at once.' },
            { text: 'It makes the sum of squared residuals as small as possible', why: 'That is least squares, which is what `lm()` does. For a normal response with the same spread everywhere the two give the same answer, but for counts and yes/no data they do not.' },
            { text: 'It picks the values with the smallest p-values', why: 'p-values are worked out after the estimates, to test them. They play no part in choosing them.' },
            { text: 'It makes every fitted value equal the observed value', why: 'That would need one parameter per observation. `glm()` fits the model you wrote, with only the coefficients the formula asks for.' },
          ],
        },
      ],
    },
  ],
};

export default lesson;
