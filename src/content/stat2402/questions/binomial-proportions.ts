// Exam questions for "Successes out of n: binomial proportions".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out. Contexts are esoph (oesophageal cancer cases and controls) and MASS::menarche
// (age at which girls reach menarche), away from the lesson's own beetles and seeds, so a student who
// only remembers the lesson's printed numbers cannot coast through the bank.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'bp-identify-response',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 2,
    prompt: 'Each row of esoph records ncases (people with the cancer) and ncontrols (people without it) examined at one combination of age, alcohol and tobacco group. Which is the right way to give glm() this response?',
    code: 'head(esoph)\n',
    options: [
      { text: 'cbind(ncases, ncontrols) ~ ..., family = binomial', correct: true },
      { text: 'cbind(ncases, ncases + ncontrols) ~ ..., family = binomial' },
      { text: 'ncases ~ ..., family = binomial' },
      { text: 'ncases / (ncases + ncontrols) ~ ..., family = binomial' },
    ],
    explain: 'cbind() wants successes in the first column and failures in the second, and ncontrols is exactly the failures: the people examined who did not have the cancer. Giving it the total instead of the failures models the wrong proportion. ncases alone has no ceiling attached, and a bare proportion with no weights is not a whole number of successes.',
  },
  {
    id: 'bp-cbind-mistake',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 3,
    prompt: 'The two columns of coefficients differ, though both models ran without complaint. Why?',
    code:
      'right <- glm(cbind(ncases, ncontrols) ~ agegp, family = binomial, data = esoph)\n' +
      'wrong <- glm(cbind(ncases, ncases + ncontrols) ~ agegp, family = binomial, data = esoph)\n' +
      'round(cbind(right = coef(right), wrong = coef(wrong)), 3)\n',
    options: [
      { text: 'R reads the second column as failures, so the wrong model thinks each group had ncases + (ncases + ncontrols) people, and a smaller share of them were cases', correct: true },
      { text: 'The wrong model uses a different link function' },
      { text: 'R works out ncontrols from the total automatically, but rounds differently' },
      { text: 'The two models use different subsets of esoph' },
    ],
    explain: 'cbind() only puts two columns side by side; it cannot know that the second one was meant to be a total. In the wrong model the proportion R sees is ncases / (ncases + ncases + ncontrols), which is not the proportion with the cancer. Both use the default logit link, both use every row of esoph, and there is no rounding step: R takes whatever is in the second column as the failures.',
  },
  {
    id: 'bp-menarche-slope',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 2,
    prompt: 'This models the proportion of Warsaw schoolgirls who had reached menarche, out of the number surveyed at each age. What does the Age estimate tell you?',
    code: 'library(MASS)\nfit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche)\nsummary(fit)$coefficients\n',
    options: [
      { text: 'How much the log-odds of having reached menarche rises for each extra year of age', correct: true },
      { text: 'The proportion of girls who have reached menarche at age 0' },
      { text: 'The share of the variation in Menarche that Age explains' },
      { text: 'How many more girls were surveyed at each age' },
    ],
    explain: 'A logistic regression coefficient is a rate of change on the log-odds scale: log-odds per year of Age here. The proportion at age 0 would need a wildly out-of-range prediction from the model, not the slope itself, and a coefficient is not a share of variation explained or a count of girls surveyed.',
  },
  {
    id: 'bp-menarche-ld50',
    lessonId: 'binomial-proportions',
    kind: 'number',
    marks: 3,
    prompt: 'Using the coefficients above, at what age does the model predict that half the girls have reached menarche? Give it to one decimal place.',
    code: 'library(MASS)\nfit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche)\ncoef(fit)\n',
    answer: 'round(-coef(fit)[[1]] / coef(fit)[[2]], 1)',
    tol: 0.06,
    unit: 'years',
    explain: 'At a proportion of one half the log-odds are 0, so the age where the fitted line crosses zero is -intercept / slope: minus the first coefficient divided by the second.',
  },
  {
    id: 'bp-dosep-matches',
    lessonId: 'binomial-proportions',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code:
      'library(MASS)\n' +
      'fit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche)\n' +
      'b <- coef(fit)\n' +
      'manual <- -b[[1]] / b[[2]]\n' +
      'fromDosep <- as.numeric(dose.p(fit, p = 0.5))\n' +
      'isTRUE(all.equal(manual, fromDosep))\n',
    choices: ['[1] TRUE', '[1] FALSE'],
    explain: 'dose.p(fit, p = 0.5) from MASS answers exactly the question -b0/b1 does: the predictor value where the fitted proportion is one half. What dose.p() adds beyond the hand calculation is a standard error.',
  },
  {
    id: 'bp-weights-vs-cbind',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 2,
    prompt: 'Two different ways of giving glm() the same esoph counts. What do you expect from the two columns above, and why?',
    code:
      'esoph$prop <- esoph$ncases / (esoph$ncases + esoph$ncontrols)\n' +
      'a <- glm(cbind(ncases, ncontrols) ~ agegp, family = binomial, data = esoph)\n' +
      'b <- glm(prop ~ agegp, weights = ncases + ncontrols, family = binomial, data = esoph)\n' +
      'round(cbind(cbind_form = coef(a), weights_form = coef(b)), 4)\n',
    options: [
      { text: 'Identical coefficients, because both ways give glm() the same information: how many were cases and how many were examined in total', correct: true },
      { text: 'Different coefficients, because the second model never sees ncontrols directly' },
      { text: 'Different coefficients, because weights only approximates the group size' },
      { text: 'Identical coefficients, but only by coincidence for this particular data set' },
    ],
    explain: 'cbind(ncases, ncontrols) and prop with weights = ncases + ncontrols both tell glm() the same two facts about each group, a count of successes and a count of trials, just arranged differently. That is a general fact about how glm() reads a binomial response, not a coincidence of this data set, and ncontrols is used to build both the proportion and the weight.',
  },
  {
    id: 'bp-links-aic-reading',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 3,
    prompt: 'All three models share the same response and the same esoph data. Whichever one has the lowest AIC in the table above, what can you say about it?',
    code:
      'fit_logit <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = binomial, data = esoph)\n' +
      'fit_probit <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = binomial(link = "probit"), data = esoph)\n' +
      'fit_cloglog <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = binomial(link = "cloglog"), data = esoph)\n' +
      'AIC(fit_logit, fit_probit, fit_cloglog)\n',
    options: [
      { text: 'Of these three curves, it fits these data best, allowing for the number of coefficients each one pays for', correct: true },
      { text: 'It is the correct link, and the other two are wrong' },
      { text: 'Its coefficients are statistically significant, unlike the other two' },
      { text: 'It always has the smallest residual deviance, whatever the parameter counts' },
    ],
    explain: 'AIC ranks models fitted to the same response and data by fit, with a fixed charge per parameter, and lower is better. A lower AIC does not certify one link as correct and the others wrong, it says nothing about any one coefficient\'s p-value, and it can favour a model with a slightly larger deviance if that model has fewer parameters.',
  },
  {
    id: 'bp-quasibinomial-what-changes',
    lessonId: 'binomial-proportions',
    kind: 'choice',
    marks: 3,
    prompt: 'The coefficient estimates (not shown) are identical between these two fits. Reading the standard errors above, what does switching from binomial to quasibinomial change?',
    code:
      'fit <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = binomial, data = esoph)\n' +
      'qfit <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = quasibinomial, data = esoph)\n' +
      'signif(summary(fit)$coefficients[, "Std. Error"], 3)\n' +
      'signif(summary(qfit)$coefficients[, "Std. Error"], 3)\n',
    options: [
      { text: 'How uncertain the estimates are said to be: every standard error is scaled by the square root of the estimated dispersion', correct: true },
      { text: 'The fitted proportions for each group' },
      { text: 'The link function used to fit the model' },
      { text: 'The number of groups used to fit the model' },
    ],
    explain: 'Quasibinomial estimates a dispersion from the data instead of fixing it at 1, and every standard error is multiplied by its square root; the coefficients, the fitted proportions, the link and the rows used are exactly the same either way.',
  },
  {
    id: 'bp-deviance-df-ratio',
    lessonId: 'binomial-proportions',
    kind: 'number',
    marks: 3,
    prompt: 'A quick check for overdispersion is the ratio of the residual deviance to its degrees of freedom, both printed above. Work it out, to two decimal places.',
    code:
      'fit <- glm(cbind(ncases, ncontrols) ~ agegp + alcgp + tobgp, family = binomial, data = esoph)\n' +
      'deviance(fit)\n' +
      'df.residual(fit)\n',
    answer: 'round(deviance(fit) / df.residual(fit), 2)',
    tol: 0.006,
    unit: '',
    explain: 'If the binomial model is right, the residual deviance should sit close to its degrees of freedom. Dividing one by the other turns the two numbers above into a single ratio: well above 1 signals more spread than the model allows, and a ratio near 1 says the check found nothing wrong.',
  },
  {
    id: 'bp-write-dose-at',
    lessonId: 'binomial-proportions',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function dose_at(fit, p) that takes a binomial glm with the logit link and one numeric predictor, and returns the value of the predictor at which the fitted proportion equals p, as a plain number. At the fitted proportion p, the log-odds are log(p / (1 - p)), so solve b0 + b1 * dose = log(p / (1 - p)) for dose.',
    run: 'function',
    fnName: 'dose_at',
    starter: 'dose_at <- function(fit, p) {\n  # solve b0 + b1 * dose = log(p / (1 - p)) for dose\n}\n',
    solution: 'dose_at <- function(fit, p) {\n  b <- coef(fit)\n  (log(p / (1 - p)) - b[[1]]) / b[[2]]\n}\n',
    tests: [
      {
        id: 'menarche-half',
        label: 'menarche, p = 0.5, checked against dose.p()',
        hidden: false,
        setup: 'library(MASS)\nfit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche)',
        call: 'dose_at(fit, 0.5)',
        expect: 'local({ library(MASS); fit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche); as.numeric(dose.p(fit, p = 0.5)) })',
        cmp: 'float',
      },
      {
        id: 'menarche-90',
        label: 'menarche, p = 0.9, checked against dose.p()',
        hidden: false,
        setup: 'library(MASS)\nfit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche)',
        call: 'dose_at(fit, 0.9)',
        expect: 'local({ library(MASS); fit <- glm(cbind(Menarche, Total - Menarche) ~ Age, family = binomial, data = menarche); as.numeric(dose.p(fit, p = 0.9)) })',
        cmp: 'float',
      },
      {
        id: 'gearbox',
        label: '0/1 data: the weight at which a manual gearbox is an even chance',
        hidden: true,
        setup: 'library(MASS)\nfit <- glm(am ~ wt, family = binomial, data = mtcars)',
        call: 'dose_at(fit, 0.5)',
        expect: 'local({ library(MASS); fit <- glm(am ~ wt, family = binomial, data = mtcars); as.numeric(dose.p(fit, p = 0.5)) })',
        cmp: 'float',
      },
      {
        id: 'symmetric',
        label: 'proportions 0.1 to 0.9 in even steps: half succeed at the middle dose',
        hidden: true,
        setup: 'sym <- data.frame(dose = 1:5, n = 10, ok = c(1, 3, 5, 7, 9))\nfit <- glm(cbind(ok, n - ok) ~ dose, family = binomial, data = sym)',
        call: 'dose_at(fit, 0.5)',
        expect: '3',
        cmp: 'float',
      },
    ],
    explain: '`coef(fit)` holds b0 first and b1 second. Rearranging b0 + b1 * dose = log(p / (1 - p)) for dose gives (log(p / (1 - p)) - b0) / b1, which matches -b0/b1 exactly when p is 0.5, since log(1) is 0.',
  },
];

export default questions;
