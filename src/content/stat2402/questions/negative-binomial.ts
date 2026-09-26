// Exam questions for "A model for extra spread: the negative binomial".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out. Contexts are MASS::quine (days absent from school) and InsectSprays, away from the
// lesson's own warpbreaks, so a student who only remembers the lesson's printed numbers cannot coast
// through the bank.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'nb-theta-meaning',
    lessonId: 'negative-binomial',
    kind: 'choice',
    marks: 2,
    prompt: 'Read Theta and its standard error at the bottom of this summary. What does the size of Theta tell you about these counts, compared with a Poisson model?',
    code: 'library(MASS)\nnb <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)\nsummary(nb)\n',
    options: [
      { text: 'They are close to Poisson: the extra variance term, mean squared over theta, is small next to the mean' },
      { text: 'They are far from Poisson: the extra variance term, mean squared over theta, is large next to the mean', correct: true },
      { text: 'The mean number of days absent is very large' },
      { text: 'The model fits poorly' },
      { text: 'Ethnicity, sex, age and learner status all have large effects' },
    ],
    explain: 'The negative binomial variance is mean + mean-squared / theta. Theta sits under the squared mean in the extra term, so the smaller it is, the more extra spread it adds; a theta this close to 1 is far from the large-theta regime where the model becomes the Poisson. A large theta is what closeness to Poisson looks like, and theta is a separate quantity from the mean, the fit quality, and the size of any one coefficient.',
  },
  {
    id: 'nb-variance-at-a-point',
    lessonId: 'negative-binomial',
    kind: 'number',
    marks: 3,
    prompt: 'For a student with Eth = "A", Sex = "M", Age = "F3" and Lrn = "AL", read the fitted mean above and combine it with Theta from the model to get the negative binomial variance the model gives this student: mean + mean-squared / theta. Round to one decimal place.',
    code:
      'library(MASS)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)\n' +
      'new <- data.frame(Eth = "A", Sex = "M", Age = "F3", Lrn = "AL")\n' +
      'predict(nb, new, type = "response")\n' +
      'nb$theta\n',
    answer: 'round({ mu <- predict(nb, new, type = "response")[[1]]; mu + mu^2 / nb$theta }, 1)',
    tol: 0.06,
    unit: 'days squared',
    explain: 'The fitted mean is the response prediction shown above, and theta is nb$theta. The negative binomial variance formula, mean + mean-squared / theta, turns those two numbers into the variance the model expects for this student.',
  },
  {
    id: 'nb-lrt-boundary',
    lessonId: 'negative-binomial',
    kind: 'choice',
    marks: 3,
    prompt: 'anova() cannot test a Poisson fit against a negative binomial fit of the same formula, so the likelihood ratio statistic is worked out by hand instead, from twice the gap between the log-likelihoods. Its textbook chi-squared p-value on 1 degree of freedom is conservative here. Why?',
    code:
      'library(MASS)\n' +
      'fit <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)\n' +
      'lr <- 2 * (as.numeric(logLik(nb)) - as.numeric(logLik(fit)))\n' +
      'lr\n' +
      'pchisq(lr, df = 1, lower.tail = FALSE)\n',
    options: [
      { text: 'The Poisson model sits on the edge of what the negative binomial allows, at 1/theta = 0, so when it is really true the statistic is zero about half the time and the chi-squared reference overstates the p-value', correct: true },
      { text: 'Theta had to be estimated, which always makes a test conservative' },
      { text: 'The two models use different link functions' },
      { text: 'The negative binomial always fits better, so the test is meaningless' },
    ],
    explain: 'Testing a null value on the boundary of a parameter\'s range breaks the usual chi-squared theory; the right reference is half zero and half chi-squared on 1 degree of freedom, so the textbook p-value is about twice the corrected one. Every likelihood ratio test estimates its extra parameters, and the degree of freedom already allows for that; both models use the log link; and the negative binomial having one more parameter does not make a comparison between them meaningless.',
  },
  {
    id: 'nb-aic-gap-insects',
    lessonId: 'negative-binomial',
    kind: 'number',
    marks: 3,
    prompt: 'By how much is the negative binomial\'s AIC below the Poisson\'s in the table above? Give it to one decimal place.',
    code:
      'library(MASS)\n' +
      'pois <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
      'nb <- glm.nb(count ~ spray, data = InsectSprays)\n' +
      'AIC(pois, nb)\n',
    answer: 'round(AIC(pois) - AIC(nb), 1)',
    tol: 0.06,
    unit: 'AIC points',
    explain: 'Both AICs are in the table above; subtracting the negative binomial\'s from the Poisson\'s gives how much lower it is, extra parameter and all.',
  },
  {
    id: 'nb-variance-shape',
    lessonId: 'negative-binomial',
    kind: 'choice',
    marks: 2,
    prompt: 'The quasi-Poisson variance is phi times the mean; the negative binomial variance is the mean plus mean-squared over theta. As the mean grows, how do these two extra-spread rules compare?',
    code:
      'library(MASS)\n' +
      'qfit <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)\n' +
      'nb <- glm.nb(count ~ spray, data = InsectSprays)\n' +
      'm <- with(InsectSprays, tapply(count, spray, mean))\n' +
      'phi <- summary(qfit)$dispersion\n' +
      'round(rbind(mean = m, quasi = phi * m, negbin = m + m^2 / nb$theta), 2)\n',
    options: [
      { text: 'Quasi-Poisson\'s variance grows in exact proportion to the mean, a straight line; the negative binomial\'s grows with the square of the mean as well, curving upward', correct: true },
      { text: 'Both grow in exact proportion to the mean, just with different constants' },
      { text: 'The negative binomial\'s variance does not depend on the mean at all' },
      { text: 'Quasi-Poisson\'s variance curves upward faster than the negative binomial\'s' },
    ],
    explain: 'phi * mean is a straight line through the origin: double the mean and the quasi-Poisson variance doubles. mean + mean-squared / theta has a squared term, so doubling the mean more than doubles that part of the variance. Both formulas plainly depend on the mean, and it is the negative binomial, not quasi-Poisson, whose extra term grows with the square.',
  },
  {
    id: 'nb-predict-response',
    lessonId: 'negative-binomial',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code:
      'library(MASS)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)\n' +
      'new <- data.frame(Eth = "A", Sex = "M", Age = "F0", Lrn = "AL")\n' +
      'p <- predict(nb, new, type = "response")\n' +
      'p2 <- exp(predict(nb, new))\n' +
      'isTRUE(all.equal(unname(p[[1]]), unname(p2[[1]])))\n',
    choices: ['[1] TRUE', '[1] FALSE'],
    explain: 'By default predict() on a glm gives the log-scale prediction, and type = "response" gives exp() of that same value, so the two agree for any row of new data.',
  },
  {
    id: 'nb-se-comparison',
    lessonId: 'negative-binomial',
    kind: 'choice',
    marks: 3,
    prompt: 'Read the three columns of standard errors above. Why are the quasi-Poisson ones bigger than the Poisson ones by the same multiple for every coefficient, while the negative binomial\'s move by a different amount for each one?',
    code:
      'fit <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
      'qfit <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)\n' +
      'library(MASS)\n' +
      'nb <- glm.nb(count ~ spray, data = InsectSprays)\n' +
      'se <- function(m) summary(m)$coefficients[, "Std. Error"]\n' +
      'round(cbind(poisson = se(fit), quasi = se(qfit), negbin = se(nb)), 3)\n',
    options: [
      { text: 'Quasi-Poisson scales every variance by the same estimated dispersion, which leaves every observation\'s relative weight unchanged; the negative binomial variance grows with the square of each group\'s own mean, so it reweights the groups against each other', correct: true },
      { text: 'glm.nb() uses a different link function from glm()' },
      { text: 'The negative binomial standard errors are wrong, because theta is estimated with error' },
      { text: 'Quasi-Poisson uses fewer of the InsectSprays rows' },
    ],
    explain: 'A glm weights each observation by how precise it is taken to be. Multiplying every variance by one dispersion scales every weight alike, so the coefficients and the relative sizes of the standard errors stay in the same proportion as the Poisson fit. The negative binomial\'s mean-squared-over-theta term is bigger for groups with bigger means, so it changes the weights unevenly. Both fits use the log link, every standard error carries some estimation uncertainty without being wrong for it, and both use every row of InsectSprays.',
  },
  {
    id: 'nb-loglik-statistic',
    lessonId: 'negative-binomial',
    kind: 'number',
    marks: 3,
    prompt: 'Using the two log-likelihoods above, work out the likelihood ratio statistic: twice the gap between them. Give it to one decimal place.',
    code:
      'library(MASS)\n' +
      'pois <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)\n' +
      'nb <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)\n' +
      'logLik(pois)\n' +
      'logLik(nb)\n',
    answer: 'round(2 * (as.numeric(logLik(nb)) - as.numeric(logLik(pois))), 1)',
    tol: 0.06,
    unit: '',
    explain: 'The likelihood ratio statistic is twice the negative binomial\'s log-likelihood minus the Poisson\'s. as.numeric() strips the label logLik() attaches to each value before subtracting.',
  },
  {
    id: 'nb-write-variance-ratio',
    lessonId: 'negative-binomial',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function nb_extra(fit, mu) that takes a fitted glm.nb model and a mean mu, and returns how many times bigger the negative binomial variance at that mean is than the Poisson variance at the same mean: (mu + mu^2 / theta) / mu, simplified to 1 + mu / theta.',
    run: 'function',
    fnName: 'nb_extra',
    starter: 'nb_extra <- function(fit, mu) {\n  # (mu + mu^2 / theta) / mu, using fit$theta\n}\n',
    solution: 'nb_extra <- function(fit, mu) {\n  1 + mu / fit$theta\n}\n',
    tests: [
      {
        id: 'quine-mean5',
        label: 'the quine model, at a mean of 5 days',
        hidden: false,
        setup: 'library(MASS)\nfit <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)',
        call: 'nb_extra(fit, 5)',
        expect: 'local({ library(MASS); fit <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine); (5 + 5^2 / fit$theta) / 5 })',
        cmp: 'float',
      },
      {
        id: 'quine-mean20',
        label: 'the quine model, at a mean of 20 days',
        hidden: false,
        setup: 'library(MASS)\nfit <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)',
        call: 'nb_extra(fit, 20)',
        expect: 'local({ library(MASS); fit <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine); (20 + 20^2 / fit$theta) / 20 })',
        cmp: 'float',
      },
      {
        id: 'insects',
        label: 'InsectSprays, at the overall mean count',
        hidden: true,
        setup: 'library(MASS)\nfit <- glm.nb(count ~ spray, data = InsectSprays)\nm <- mean(InsectSprays$count)',
        call: 'nb_extra(fit, m)',
        expect: 'local({ library(MASS); fit <- glm.nb(count ~ spray, data = InsectSprays); m <- mean(InsectSprays$count); (m + m^2 / fit$theta) / m })',
        cmp: 'float',
      },
      {
        id: 'zero-mean',
        label: 'a mean of 0 always gives a ratio of 1',
        hidden: true,
        setup: 'library(MASS)\nfit <- glm.nb(Days ~ Eth + Sex + Age + Lrn, data = quine)',
        call: 'nb_extra(fit, 0)',
        expect: '1',
        cmp: 'float',
      },
    ],
    explain: '(mu + mu^2 / theta) / mu splits into mu / mu, which is 1, plus (mu^2 / theta) / mu, which cancels to mu / theta. fit$theta holds the fitted theta, so 1 + mu / fit$theta is the same ratio without dividing out by hand each time.',
  },
];

export default questions;
