// Exam questions for "Linear regression, the way R reports it". The exemplar for the STAT2402 bank.
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'rir-slope-meaning',
    lessonId: 'regression-in-r',
    kind: 'choice',
    marks: 2,
    prompt: 'This model predicts stopping distance in feet from speed in miles per hour. What does the `speed` estimate tell you?',
    code: 'fit <- lm(dist ~ speed, data = cars)\ncoef(fit)\n',
    options: [
      { text: 'How many feet the predicted stopping distance rises for each extra mile per hour', correct: true },
      { text: 'The predicted stopping distance of a car going 1 mph' },
      { text: 'The share of the variation in stopping distance that speed explains' },
      { text: 'How many miles per hour a car loses for each foot it travels' },
    ],
    explain: 'A slope is a rate of change in the units of both variables: feet of stopping distance per mile per hour of speed. The prediction at 1 mph is the intercept plus one slope, and the share of variation explained is R-squared.',
  },
  {
    id: 'rir-slope-value',
    lessonId: 'regression-in-r',
    kind: 'number',
    marks: 2,
    prompt: 'From the output, what is the estimated slope on `speed`? Give it to two decimal places.',
    code: 'fit <- lm(dist ~ speed, data = cars)\nsummary(fit)$coefficients\n',
    answer: 'round(coef(fit)[["speed"]], 2)',
    tol: 0.006,
    unit: 'feet per mph',
    explain: 'The slope is the `Estimate` in the `speed` row of the coefficients table.',
  },
  {
    id: 'rir-predict-20',
    lessonId: 'regression-in-r',
    kind: 'number',
    marks: 3,
    prompt: 'Using the coefficients below, what stopping distance does the model predict for a car going 20 mph? Give it to one decimal place.',
    code: 'fit <- lm(dist ~ speed, data = cars)\ncoef(fit)\n',
    answer: 'round(predict(fit, data.frame(speed = 20)), 1)',
    tol: 0.06,
    unit: 'feet',
    explain: 'Predicted distance = intercept + slope × speed, so at 20 mph it is the intercept plus 20 times the slope. `predict(fit, data.frame(speed = 20))` does the same sum.',
  },
  {
    id: 'rir-pvalue-reading',
    lessonId: 'regression-in-r',
    kind: 'choice',
    marks: 2,
    prompt: 'The p-value in the `speed` row is tiny. Which statement is right?',
    code: 'fit <- lm(dist ~ speed, data = cars)\nsummary(fit)$coefficients\n',
    options: [
      { text: 'If speed had no effect at all, a slope this far from zero would almost never turn up in a sample like this', correct: true },
      { text: 'There is almost no chance that the true slope is zero' },
      { text: 'Speed explains almost all of the variation in stopping distance' },
      { text: 'The slope is large in feet per mile per hour' },
    ],
    explain: 'A p-value is worked out assuming the coefficient is really zero; tiny means the data would be very surprising if it were. It is not the probability that a hypothesis is true, it says nothing about how much variation is explained, and a small p-value can come with a small effect.',
  },
  {
    id: 'rir-coef-names',
    lessonId: 'regression-in-r',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code: 'fit <- lm(mpg ~ wt + hp, data = mtcars)\nnames(coef(fit))\n',
    choices: [
      '[1] "(Intercept)" "wt"          "hp"         ',
      '[1] "wt" "hp"',
      '[1] "Intercept" "wt"        "hp"       ',
      '[1] "mpg" "wt"  "hp" ',
    ],
    explain: 'A linear model has one coefficient per predictor plus the intercept, which R names `(Intercept)`, in brackets. The response, `mpg`, is not a coefficient.',
  },
  {
    id: 'rir-held-fixed',
    lessonId: 'regression-in-r',
    kind: 'choice',
    marks: 3,
    prompt: 'The `wt` estimate is different in these two models. Why?',
    code: 'coef(lm(mpg ~ wt, data = mtcars))\ncoef(lm(mpg ~ wt + hp, data = mtcars))\n',
    options: [
      { text: 'Heavier cars tend to be more powerful, so with weight alone some of the effect of horsepower was being credited to weight', correct: true },
      { text: 'R estimates the coefficients one at a time, and adding hp changed the order' },
      { text: 'Adding a predictor always shrinks every other coefficient towards zero' },
      { text: 'The second model used fewer cars' },
    ],
    explain: 'In the second model, the `wt` estimate compares cars with the same horsepower. When predictors are related, each coefficient only makes sense next to the others in its model. All the coefficients are estimated together, both models use all 32 cars, and a coefficient can move either way when another predictor joins.',
  },
  {
    id: 'rir-r-squared',
    lessonId: 'regression-in-r',
    kind: 'number',
    marks: 2,
    prompt: 'What percentage of the variation in stopping distance does this model account for? Give a whole number.',
    code: 'fit <- lm(dist ~ speed, data = cars)\nsummary(fit)$r.squared\n',
    answer: 'round(100 * summary(fit)$r.squared)',
    tol: 0.6,
    unit: '%',
    explain: 'R-squared is the share of the variation in the response that the model accounts for. Multiply by 100 for a percentage.',
  },
  {
    id: 'rir-write-predict',
    lessonId: 'regression-in-r',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function `stop_at(mph)` that fits `lm(dist ~ speed, data = cars)` and returns the predicted stopping distance at speed `mph` as a plain number.',
    run: 'function',
    fnName: 'stop_at',
    starter: 'stop_at <- function(mph) {\n  # fit the model, then predict at mph\n}\n',
    solution: 'stop_at <- function(mph) {\n  fit <- lm(dist ~ speed, data = cars)\n  unname(predict(fit, data.frame(speed = mph)))\n}\n',
    tests: [
      { id: 'at-20', label: 'a car at 20 mph', hidden: false, call: 'stop_at(20)', expect: 'unname(predict(lm(dist ~ speed, data = cars), data.frame(speed = 20)))', cmp: 'float' },
      { id: 'at-10', label: 'a car at 10 mph', hidden: false, call: 'stop_at(10)', expect: 'unname(predict(lm(dist ~ speed, data = cars), data.frame(speed = 10)))', cmp: 'float' },
      { id: 'several', label: 'several speeds at once', hidden: true, call: 'stop_at(c(5, 15, 25))', expect: 'unname(predict(lm(dist ~ speed, data = cars), data.frame(speed = c(5, 15, 25))))', cmp: 'float' },
    ],
    explain: '`predict()` needs new data with a column named like the predictor: `data.frame(speed = mph)`. `unname()` drops the row names R attaches, though the tests accept either.',
  },
];

export default questions;
