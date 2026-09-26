// Exam questions for "Too many zeros: zero-inflated models".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const PSCL = 'suppressPackageStartupMessages(library(pscl))';
const DATA = 'data("bioChemists", package = "pscl")';

/** A simulated count with a known structural-zero share, reused by the AIC and vuong() questions. */
const SIM_ZI =
  'set.seed(77)\n' +
  'n <- 500\n' +
  'x <- runif(n, 0, 3)\n' +
  'mu <- exp(0.4 + 0.5 * x)\n' +
  'counts <- rnbinom(n, mu = mu, size = 1.5)\n' +
  'structural <- runif(n) < 0.25\n' +
  'y <- ifelse(structural, 0, counts)\n' +
  'd <- data.frame(y, x)\n';

const questions: StatQuestion[] = [
  {
    id: 'zi-poisson-expected-zeros',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 2,
    prompt:
      'This Poisson model predicts the number of articles a biochemistry PhD student published from marital status and mentor output alone. What does comparing the two numbers below tell you?',
    code: `${PSCL}\n${DATA}\nfit <- glm(art ~ mar + ment, family = poisson, data = bioChemists)\nsum(bioChemists$art == 0)\nsum(dpois(0, fitted(fit)))\n`,
    options: [
      { text: 'There are noticeably more zeros in the data than this Poisson model expects', correct: true },
      { text: 'There are noticeably fewer zeros in the data than the model expects' },
      { text: 'The two numbers are close, so a Poisson model is fine here' },
      { text: 'The comparison is meaningless because the model uses only two predictors' },
    ],
    explain:
      'The first number is students who really published nothing; the second is what the Poisson fit\'s own e^-mean formula expects, summed over every student. The first sits well above the second, the same shortfall as the five-predictor model in the lesson. Using fewer predictors does not change the fact that a Poisson model has no separate control over zeros.',
  },
  {
    id: 'zi-excess-zeros-number',
    lessonId: 'zero-inflated',
    kind: 'number',
    marks: 3,
    prompt: 'Using the output above, how many more zeros are there in the data than this Poisson model expects? Give a whole number.',
    code: `${PSCL}\n${DATA}\nfit <- glm(art ~ mar + ment, family = poisson, data = bioChemists)\nsum(bioChemists$art == 0)\nsum(dpois(0, fitted(fit)))\n`,
    answer: 'round(sum(bioChemists$art == 0) - sum(dpois(0, fitted(fit))))',
    tol: 0.6,
    unit: 'students',
    explain: 'Subtract the expected zeros (the sum of every student\'s own chance of a zero) from the observed zeros. The gap is the excess this Poisson model cannot account for.',
  },
  {
    id: 'zi-structural-vs-chance',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 2,
    prompt:
      'A survey asks shoppers how many items they returned to a store last year. Some shoppers never return anything, on principle; others might have returned something if a purchase had gone wrong, but nothing did. Which kind of zero is which?',
    options: [
      { text: 'The shoppers who never return anything are structural zeros; the others are chance zeros from an ordinary count process', correct: true },
      { text: 'Both kinds are structural zeros, since neither shopper returned anything' },
      { text: 'Both kinds are chance zeros, since returning nothing is always possible' },
      { text: 'There is no such distinction; a zero is a zero' },
    ],
    explain:
      'A structural zero comes from a unit that can never produce a positive count, like a shopper who returns nothing on principle. A chance zero comes from the ordinary count process landing on zero, like a shopper who could have returned something but did not need to. Both look identical in the data, which is exactly why telling them apart takes a model, not a glance at the numbers.',
  },
  {
    id: 'zi-zero-part-kid5',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 3,
    prompt:
      'The zero-inflation part of this model estimates the chance of being a structural zero, a student who was never going to publish. The `kid5` estimate is positive. What does that say?',
    code: `${PSCL}\n${DATA}\nzip2 <- zeroinfl(art ~ fem + mar + phd | fem + kid5, data = bioChemists, dist = "poisson")\nsummary(zip2)$coefficients$zero\n`,
    options: [
      { text: 'Students with more young children are more likely to be structural zeros', correct: true },
      { text: 'Students with more young children write fewer articles among those who do publish' },
      { text: 'Students with more young children are less likely to be structural zeros' },
      { text: 'kid5 has no effect, since it is not one of the count model\'s predictors here' },
    ],
    explain:
      'The zero-inflation table is a logistic regression for the log-odds of being a structural zero. A positive `kid5` estimate raises those odds, so more young children go with a bigger chance of never publishing. An effect on articles written by students who do publish would show up in the count table instead; `kid5` is only on the zero side of this formula.',
  },
  {
    id: 'zi-predict-zero-value',
    lessonId: 'zero-inflated',
    kind: 'number',
    marks: 2,
    prompt:
      'The output gives the predicted chance of being a structural zero for two married men with no young children and a department prestige score of 3, whose mentors published 0 and 10 articles. What is the predicted chance for the one whose mentor published nothing? Give it to 3 decimal places.',
    code:
      `${PSCL}\n${DATA}\n` +
      'zinb <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin")\n' +
      'new <- data.frame(fem = "Men", mar = "Married", kid5 = 0, phd = 3, ment = c(0, 10))\n' +
      'round(predict(zinb, new, type = "zero"), 3)\n',
    answer:
      'local({ zinb <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin"); new <- data.frame(fem = "Men", mar = "Married", kid5 = 0, phd = 3, ment = c(0, 10)); round(predict(zinb, new, type = "zero")[[1]], 3) })',
    tol: 0.0006,
    explain:
      'The first entry of the printed vector is for the student whose mentor published 0 articles; read it directly. The second, further right, is for the one whose mentor published 10, much smaller because more mentor output lowers the odds of being a structural zero.',
  },
  {
    id: 'zi-mixture-share',
    lessonId: 'zero-inflated',
    kind: 'predict',
    marks: 2,
    prompt: 'Each of 10,000 counts is made a structural zero with chance 0.4; the rest come from a Poisson with mean 2. What does this print?',
    code: 'set.seed(41)\ny <- ifelse(runif(10000) < 0.4, 0, rpois(10000, lambda = 2))\nround(mean(y == 0), 2)\n',
    choices: ['[1] 0.48', '[1] 0.4', '[1] 0.14', '[1] 0.6'],
    explain:
      'The overall chance of a zero is the structural share plus the chance zeros among the rest: 0.4 + 0.6 x P(Poisson(2) = 0), which comes to about 0.48. 0.4 alone ignores the chance zeros among the other 60%; 0.14 is roughly P(Poisson(2) = 0) alone, ignoring the structural zeros; 0.6 is just one minus the structural share.',
  },
  {
    id: 'zi-hurdle-vs-zi-scenario',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 2,
    prompt:
      'A gym tracks how many classes each member attended last month. Some members never signed up for any class and always show 0; every member who does turn up for at least one class typically attends several. Which model fits this two-step story better?',
    options: [
      { text: 'A hurdle model: whether a member trains at all is one process, and everyone who clears that hurdle has attended at least once', correct: true },
      { text: 'A zero-inflated model, because some members might show a zero by chance even without training' },
      { text: 'Neither model applies, because attendance counts are not the right kind of data' },
    ],
    explain:
      'Every zero here comes from one route: never training. Once a member clears that first hurdle they have, by definition, attended at least once, which is exactly the truncated count part of a hurdle model. A zero-inflated model would fit if members who do train could still show a zero by chance, which is not the case here.',
  },
  {
    id: 'zi-aic-story',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 3,
    prompt: 'A quarter of these simulated counts were made structural zeros before an ordinary negative binomial count was added on top. What does the AIC table say about the four fits?',
    code:
      `${PSCL}\nlibrary(MASS)\n${SIM_ZI}` +
      'pois <- glm(y ~ x, family = poisson, data = d)\n' +
      'nb <- glm.nb(y ~ x, data = d)\n' +
      'zip <- zeroinfl(y ~ x, data = d, dist = "poisson")\n' +
      'zinb <- zeroinfl(y ~ x, data = d, dist = "negbin")\n' +
      'AIC(pois, nb, zip, zinb)\n',
    options: [
      { text: 'Moving from Poisson to negative binomial improves the fit by far more than adding the zero-inflation part on top of the negative binomial does', correct: true },
      { text: 'The zero-inflated Poisson beats every other model' },
      { text: 'All four models fit about equally well' },
      { text: 'The plain Poisson model is best, since it has the fewest parameters' },
    ],
    explain:
      'Read the gaps between rows: `nb` sits far below `pois`, but `zinb` sits only a little below `nb`. Extra spread accounts for most of the improvement here, the same pattern as bioChemists in the lesson; the zero-inflation part on top of a negative binomial has much less left to add. `zip` does better than `pois` but nowhere near `nb`, and the plain Poisson has the worst AIC despite its fewest parameters, since fewer parameters is not the same as a better fit.',
  },
  {
    id: 'zi-vuong-disagreement',
    lessonId: 'zero-inflated',
    kind: 'choice',
    marks: 3,
    prompt: '`nb` is model1 and `zinb` is model2 below. What does the vuong() table say?',
    code: `${PSCL}\nlibrary(MASS)\n${SIM_ZI}` + 'nb <- glm.nb(y ~ x, data = d)\nzinb <- zeroinfl(y ~ x, data = d, dist = "negbin")\nvuong(nb, zinb)\n',
    options: [
      { text: 'The raw and AIC-corrected rows lean toward the zero-inflated model, but the BIC-corrected row leans the other way, and none of the three p-values is strong evidence', correct: true },
      { text: 'All three rows agree the zero-inflated model is clearly better, with tiny p-values throughout' },
      { text: 'All three rows agree the plain negative binomial is clearly better, with tiny p-values throughout' },
      { text: 'The test cannot be run on these two models, because one is not a special case of the other' },
    ],
    explain:
      'Look at the sign of the z-statistic and which model H_A favours in each row: the raw and AIC-corrected rows point toward model2, the BIC-corrected row points back toward model1, and every p-value here is well above the usual 0.05 cutoff. That is exactly the direction-shifting, inconclusive pattern the lesson warns about. A zero-inflated model turning back into its plain version when the structural-zero chance is 0 is the reason vuong() applies at all, not a reason it cannot be run.',
  },
  {
    id: 'zi-structural-share-write',
    lessonId: 'zero-inflated',
    kind: 'write',
    marks: 5,
    prompt:
      'Write a function `structural_share(fit)` that takes a fitted `zeroinfl` model and returns the average predicted chance of being a structural zero, across every unit the model was fitted to, as a single number.',
    run: 'function',
    fnName: 'structural_share',
    starter: 'structural_share <- function(fit) {\n  # average predict(fit, type = "zero") across every unit\n}\n',
    solution: 'structural_share <- function(fit) {\n  mean(predict(fit, type = "zero"))\n}\n',
    tests: [
      {
        id: 'biochemists-negbin',
        label: 'bioChemists, zero-inflated negative binomial',
        hidden: false,
        setup: `${PSCL}\n${DATA}\nfit <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin")`,
        call: 'structural_share(fit)',
        expect: `local({ ${PSCL}; ${DATA}; f <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | ment, data = bioChemists, dist = "negbin"); mean(predict(f, type = "zero")) })`,
        cmp: 'float',
      },
      {
        id: 'simulated-negbin',
        label: 'simulated counts, a quarter made structural zeros',
        hidden: false,
        setup: `${PSCL}\n${SIM_ZI}fit <- zeroinfl(y ~ x, data = d, dist = "negbin")`,
        call: 'structural_share(fit)',
        expect: `local({ ${PSCL}\n${SIM_ZI}f <- zeroinfl(y ~ x, data = d, dist = "negbin"); mean(predict(f, type = "zero")) })`,
        cmp: 'float',
      },
      {
        id: 'simulated-poisson',
        label: 'the same counts, fitted as zero-inflated Poisson instead',
        hidden: true,
        setup: `${PSCL}\n${SIM_ZI}fit <- zeroinfl(y ~ x, data = d, dist = "poisson")`,
        call: 'structural_share(fit)',
        expect: `local({ ${PSCL}\n${SIM_ZI}f <- zeroinfl(y ~ x, data = d, dist = "poisson"); mean(predict(f, type = "zero")) })`,
        cmp: 'float',
      },
      {
        id: 'single-probability',
        label: 'a zero part with no predictors, where every unit gets the same chance',
        hidden: true,
        setup: `${PSCL}\n${DATA}\nfit <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | 1, data = bioChemists, dist = "poisson")`,
        call: 'structural_share(fit)',
        expect: `local({ ${PSCL}; ${DATA}; f <- zeroinfl(art ~ fem + mar + kid5 + phd + ment | 1, data = bioChemists, dist = "poisson"); mean(predict(f, type = "zero")) })`,
        cmp: 'float',
      },
    ],
    explain: '`predict(fit, type = "zero")` gives one number per unit, the chance it is a structural zero. `mean()` of that vector is the average across every unit the model was fitted to.',
  },
];

export default questions;
