// Exam questions for "Distributions and likelihood: where the estimates come from".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'pl-fewer-than-four',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 2,
    prompt: 'A trial has 10 tries, each succeeding with probability 0.3. Which line gives the probability of **fewer than 4** successes?',
    options: [
      { text: '`pbinom(3, size = 10, prob = 0.3)`', correct: true },
      { text: '`pbinom(4, size = 10, prob = 0.3)`' },
      { text: '`1 - pbinom(3, size = 10, prob = 0.3)`' },
      { text: '`dbinom(3, size = 10, prob = 0.3)`' },
    ],
    explain: 'Fewer than 4 means 0, 1, 2 or 3, and `pbinom(3, ...)` is the probability of 3 or fewer. `pbinom(4, ...)` also counts exactly 4, `1 - pbinom(3, ...)` is the probability of 4 or more (the opposite event), and `dbinom(3, ...)` is the probability of exactly 3 only.',
  },
  {
    id: 'pl-at-least-four',
    lessonId: 'probability-and-likelihood',
    kind: 'number',
    marks: 3,
    prompt: 'A trial has 10 tries, each succeeding with probability 0.2. Using the output, what is the probability of **4 or more** successes? Give it to three decimal places.',
    code: 'pbinom(3, size = 10, prob = 0.2)\n',
    answer: 'round(1 - pbinom(3, size = 10, prob = 0.2), 3)',
    tol: 0.0006,
    explain: 'The output is the probability of 3 or fewer successes. "4 or more" is every other outcome, so its probability is one minus the number shown.',
  },
  {
    id: 'pl-qnorm-meaning',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 2,
    prompt: 'The time to finish a task is normally distributed with mean 30 minutes and standard deviation 5 minutes. What does the number R prints mean?',
    code: 'qnorm(0.8, mean = 30, sd = 5)\n',
    options: [
      { text: '80% of times are shorter than this many minutes', correct: true },
      { text: '80% of times are longer than this many minutes' },
      { text: 'The probability that a time is under 0.8 minutes' },
      { text: 'The probability that a time is within 0.8 standard deviations of the mean' },
    ],
    explain: '`qnorm()` turns a probability into a value: the time with 0.8 of the distribution at or below it. It is a number of minutes, not a probability. `pnorm()` goes the other way, from a value to the probability of being at or below it.',
  },
  {
    id: 'pl-mean-variance',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 2,
    prompt: 'Ten thousand counts are simulated from a Poisson distribution with λ = 4. Why are the two numbers close to each other?',
    code: 'set.seed(1)\ny <- rpois(10000, lambda = 4)\nc(mean = mean(y), variance = var(y))\n',
    options: [
      { text: 'A Poisson distribution\'s variance equals its mean, and both are λ', correct: true },
      { text: 'With a large enough sample, any distribution\'s mean and variance come out close' },
      { text: '`set.seed()` makes the mean and the variance agree' },
      { text: 'The variance of any count is the same as its mean' },
    ],
    explain: 'For a Poisson with rate λ, the mean and the variance are both λ, so a large sample shows both near 4. That is special to the Poisson: a binomial\'s variance is smaller than its mean, a normal\'s is unrelated to it, and real counts often vary more than a Poisson allows. `set.seed()` only makes the draws repeatable.',
  },
  {
    id: 'pl-likelihood-meaning',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 2,
    prompt: 'Five counts were observed. What is each number R prints?',
    code: 'y <- c(1, 0, 2, 1, 3)\nprod(dpois(y, lambda = 1))\nprod(dpois(y, lambda = 2))\n',
    options: [
      { text: 'The probability of observing exactly these five counts, if λ had that value: the likelihood of that λ', correct: true },
      { text: 'The probability that λ has that value, given these five counts' },
      { text: 'The probability of a single count equal to λ' },
      { text: 'The average of the five counts\' probabilities' },
    ],
    explain: '`dpois(y, lambda = 1)` gives each count\'s probability if λ were 1, and `prod()` multiplies them into the probability of the whole set, since the counts are independent. That is the likelihood of λ = 1. It is a probability of the data, not of λ: likelihoods for different values of λ need not add up to 1.',
  },
  {
    id: 'pl-read-optimize',
    lessonId: 'probability-and-likelihood',
    kind: 'number',
    marks: 2,
    prompt: 'The code finds the maximum likelihood estimate of λ for seven counts. From the output, what is the estimate? Give it to two decimal places.',
    code:
      'y <- c(3, 1, 4, 1, 5, 9, 2)\n' +
      'loglik <- function(lambda) sum(dpois(y, lambda, log = TRUE))\n' +
      'optimize(loglik, interval = c(0.1, 20), maximum = TRUE)\n',
    answer: 'round(optimize(loglik, interval = c(0.1, 20), maximum = TRUE)$maximum, 2)',
    tol: 0.006,
    explain: '`$maximum` is the value of λ where the log-likelihood is highest: the estimate. `$objective` is the log-likelihood at that point, not an estimate of λ. For a Poisson sample the estimate is the sample mean, so `mean(y)` would give the same answer.',
  },
  {
    id: 'pl-binom-mle-predict',
    lessonId: 'probability-and-likelihood',
    kind: 'predict',
    marks: 2,
    prompt: '3 successes were seen in 10 tries. What does this print?',
    code:
      'loglik <- function(p) dbinom(3, size = 10, prob = p, log = TRUE)\n' +
      'best <- optimize(loglik, interval = c(0.01, 0.99), maximum = TRUE)\n' +
      'round(best$maximum, 2)\n',
    choices: [
      '[1] 0.3',
      '[1] 0.5',
      '[1] 0.7',
      '[1] 3',
    ],
    explain: 'The maximum likelihood estimate of a binomial p is the proportion of successes, 3 out of 10, and `optimize()` finds it to within rounding. It is a probability, so not 3; 0.7 is the proportion of failures; and 0.5 is only the middle of the search interval.',
  },
  {
    id: 'pl-curvature',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 3,
    prompt: 'Both samples have the same mean, so both estimate λ at the same value. Each line is how far the log-likelihood falls between that estimate and λ = 3.5. What do the two numbers tell you?',
    code:
      'small <- c(2, 4, 3, 0, 5, 3, 1, 2)\n' +
      'large <- rep(small, times = 10)\n' +
      'll <- function(lambda, y) sum(dpois(y, lambda, log = TRUE))\n' +
      'll(mean(small), small) - ll(3.5, small)\n' +
      'll(mean(large), large) - ll(3.5, large)\n',
    options: [
      { text: 'The large sample\'s log-likelihood falls away from its top much faster, so its estimate is more precise and has a smaller standard error', correct: true },
      { text: 'The small sample\'s estimate is more precise, because its log-likelihood hardly changes' },
      { text: 'The large sample gives a larger estimate of λ' },
      { text: 'The two samples disagree, so one of the estimates must be wrong' },
    ],
    explain: 'A log-likelihood that drops steeply away from its top rules out nearby values of λ, so the estimate is pinned down more tightly and its standard error is smaller. The large sample repeats the small one ten times, so its log-likelihood falls ten times as far over the same step. A curve that hardly changes is the uncertain one, and the estimates are the same because the means are.',
  },
  {
    id: 'pl-glm-loglik',
    lessonId: 'probability-and-likelihood',
    kind: 'choice',
    marks: 3,
    prompt: 'A Poisson model with no predictors is fitted to six counts. Which statement describes what `glm()` has done?',
    code:
      'y <- c(4, 1, 3, 6, 2, 5)\n' +
      'fit <- glm(y ~ 1, family = poisson)\n' +
      'exp(coef(fit))\n' +
      'mean(y)\n' +
      'logLik(fit)\n' +
      'sum(dpois(y, lambda = mean(y), log = TRUE))\n',
    options: [
      { text: 'It chose the λ that makes the Poisson log-likelihood of the six counts as large as possible, which here is their mean', correct: true },
      { text: 'It chose the λ that makes the sum of squared differences from the counts as small as possible' },
      { text: 'It worked out the mean, and `logLik()` is the log of that mean' },
      { text: 'It chose the λ with the smallest p-value' },
    ],
    explain: '`glm()` finds maximum likelihood estimates. With no predictors, the Poisson MLE of λ is the sample mean, which is why `exp(coef(fit))` matches `mean(y)`, and `logLik(fit)` matches the sum of the log-probabilities at that λ. Least squares is what `lm()` does; `logLik()` is a log-likelihood, not the log of the mean; and p-values test estimates after they are found.',
  },
  {
    id: 'pl-write-binom-mle',
    lessonId: 'probability-and-likelihood',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function `binom_mle(successes, n)` that finds the maximum likelihood estimate of the success probability p with `optimize()`: maximise the binomial log-likelihood `dbinom(successes, size = n, prob = p, log = TRUE)` over p between 0 and 1, and return where the top is. The tests allow for `optimize()` stopping a little short of the exact answer.',
    run: 'function',
    fnName: 'binom_mle',
    starter: 'binom_mle <- function(successes, n) {\n  # write the log-likelihood as a function of p, then maximise it\n}\n',
    solution:
      'binom_mle <- function(successes, n) {\n' +
      '  loglik <- function(p) dbinom(successes, size = n, prob = p, log = TRUE)\n' +
      '  optimize(loglik, interval = c(0, 1), maximum = TRUE)$maximum\n' +
      '}\n',
    tests: [
      { id: 'seeds', label: '7 successes in 20 tries', hidden: false, call: 'binom_mle(7, 20)', expect: '7 / 20', cmp: 'float', tol: 1e-3 },
      { id: 'ten', label: '3 successes in 10 tries', hidden: false, call: 'binom_mle(3, 10)', expect: '3 / 10', cmp: 'float', tol: 1e-3 },
      { id: 'most', label: '45 successes in 60 tries', hidden: true, call: 'binom_mle(45, 60)', expect: '45 / 60', cmp: 'float', tol: 1e-3 },
    ],
    explain: 'Write the log-likelihood as a function of p alone, with the data fixed, then ask `optimize()` for its highest point with `maximum = TRUE` and return `$maximum`. The answer is the sample proportion, `successes / n`, which the tests compare against. Forgetting `maximum = TRUE` sends `optimize()` to the lowest point, at one end of the interval.',
  },
];

export default questions;
