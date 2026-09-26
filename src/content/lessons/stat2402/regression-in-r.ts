// Linear regression, read the way R reports it.
//
// The first STAT2402 lesson on models, after R basics and likelihood, and the exemplar for the track. Everything a reader sees under a block was
// printed by R (webR, the same R 4.x a student runs in the labs); the prose never types a number R
// worked out. It points at the output instead, which is also the habit the unit asks for: read the
// estimate off the table, then say what it means.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'regression-in-r',
  title: 'Linear regression, the way R reports it',
  summary: 'The formula, the coefficients and the summary table, read line by line before the unit moves past the normal model',
  track: 'stat2402',
  order: 3,
  minutes: 16,
  outcomes: [
    'Fit a linear model with `lm()` and a formula like `dist ~ speed`',
    'Say what an intercept and a slope mean in the units of the data',
    'Read each part of `summary()`: estimates, standard errors, t values, p-values and R-squared',
    'Explain why a coefficient changes when another predictor joins the model',
    'Say which assumptions of the straight line counts and yes/no data break',
  ],
  sections: [
    {
      id: 'why-start-here',
      title: 'Why start with a straight line',
      blocks: [
        {
          kind: 'prose',
          body:
            'Most of STAT2402 is about data the normal model handles badly: yes/no answers, counts of rare events, times until something fails. The tool for all of them is the **generalised linear model**, and every one is built from the same parts as an ordinary linear regression: a response, some predictors, a formula joining them, coefficients, and a way to judge the fit.\n\n' +
            'So the unit starts where those parts are easiest to see. This lesson is the straight line, read the way R prints it, so that when the response stops being normal you only have one new idea to learn at a time.',
        },
        {
          kind: 'prose',
          body:
            'The data is `cars`, which ships with R: fifty cars from the 1920s, each with its speed in miles per hour (`speed`) and the distance it took to stop in feet (`dist`). `head()` shows the first six rows.',
        },
        {
          kind: 'code',
          code: 'head(cars)\nnrow(cars)\n',
          caption: 'Every data set in these lessons is one R already has, so you can run the same lines in RStudio.',
        },
      ],
    },
    {
      id: 'fitting',
      title: 'Fitting a line with lm()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`lm()` fits a linear model. Its first argument is a **formula**: the response on the left of `~`, the predictors on the right. Read `dist ~ speed` as "stopping distance, modelled by speed". R adds the intercept for you.',
        },
        {
          kind: 'code',
          code: 'fit <- lm(dist ~ speed, data = cars)\nfit\n',
          caption: 'Printing the model gives the call that made it and the two coefficients.',
        },
        {
          kind: 'prose',
          body:
            'The model says **predicted distance = intercept + slope × speed**. The slope is the one that matters here: for every extra mile per hour, the predicted stopping distance goes up by that many feet.\n\n' +
            'The intercept is the prediction at a speed of zero. No car in the data was going that slowly, so it is the point where the line crosses the axis, not a fact about stationary cars. A negative stopping distance there is a warning about going outside the data, not a flaw in the fit.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- lm(dist ~ speed, data = cars)',
            'coef(fit)',
            'coef(fit)["speed"]',
            'predict(fit, data.frame(speed = c(10, 20)))',
          ],
          caption: '`coef()` pulls the numbers out; `predict()` uses them. The new data must have a column with the same name as the predictor.',
        },
        {
          kind: 'predict',
          code: 'fit <- lm(dist ~ speed, data = cars)\nnames(coef(fit))\n',
          ask: 'What are the coefficients called?',
          choices: [
            '[1] "(Intercept)" "speed"',
            '[1] "Intercept" "speed"',
            '[1] "speed"',
            '[1] "dist" "speed"',
          ],
        },
        {
          kind: 'match',
          ask: 'Match each formula to what it asks R to fit.',
          pairs: [
            { left: 'y ~ x', right: 'an intercept and one slope' },
            { left: 'y ~ x1 + x2', right: 'an intercept and a slope for each predictor' },
            { left: 'y ~ x1 * x2', right: 'both predictors and their interaction' },
            { left: 'y ~ 1', right: 'an intercept only: every prediction is the mean' },
          ],
        },
        {
          kind: 'quiz',
          prompt: 'In `lm(dist ~ speed, data = cars)`, what does the coefficient on `speed` tell you?',
          options: [
            { text: 'How many feet further a car takes to stop, on average, for each extra mile per hour', correct: true, why: 'A slope is a rate: change in the response per one unit of the predictor, in the units of both.' },
            { text: 'The stopping distance of a car going 1 mph', why: 'That would be the intercept plus the slope. The slope alone is the change from one speed to the next.' },
            { text: 'The share of the variation in stopping distance that speed explains', why: 'That is R-squared, which comes from `summary()`. A slope has units (feet per mph); R-squared has none.' },
          ],
        },
      ],
    },
    {
      id: 'least-squares',
      title: 'Where the line comes from',
      blocks: [
        {
          kind: 'prose',
          body:
            '`lm()` does not eyeball the data. Of all the straight lines it could draw, it picks the one whose **squared errors add up to the least**: square each car\'s gap between its real stopping distance and the line, add the fifty squares, and make that total as small as it can be. Try to beat it.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'least-squares-slope',
            title: 'Can you beat lm()?',
            intro: 'Drag the **slope** of your line. It always passes through the average car, like the least squares line does, so the slope is the only thing to choose. Watch the sum of squared errors.',
            template:
              'slope <- ⟦slope⟧ / 2\n' +
              'intercept <- mean(cars$dist) - slope * mean(cars$speed)\n' +
              'guess <- intercept + slope * cars$speed\n' +
              'cat("Your line:  dist =", round(intercept, 1), "+", slope, "* speed\\n")\n' +
              'cat("Your squared errors:", round(sum((cars$dist - guess)^2)), "\\n")\n' +
              'fit <- lm(dist ~ speed, data = cars)\n' +
              'cat("lm\'s line:  dist =", round(coef(fit)[1], 1), "+", round(coef(fit)[2], 2), "* speed\\n")\n' +
              'cat("lm\'s squared errors:", round(sum(resid(fit)^2)), "\\n")\n',
            knobs: [
              { id: 'slope', kind: 'range', label: 'your slope, in half-feet per mph', min: 0, max: 16, start: 4 },
            ],
            probes: {
              yours: 'cbind(c(4, 25), intercept + slope * c(4, 25))',
              best: 'cbind(c(4, 25), predict(fit, data.frame(speed = c(4, 25))))',
              data: 'cbind(cars$speed, cars$dist)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'speed, mph',
              yLabel: 'stopping distance, ft',
              caption: 'Each grey dot is one car. Your line against the one `lm()` chose.',
              series: [
                { probe: 'yours', label: 'your line' },
                { probe: 'best', label: 'lm()' },
              ],
              points: 'data',
            },
            takeaway:
              'However you set the slope, your squared errors never go below lm()\'s. That is the whole definition of the least squares line, and it is why its coefficients are called **estimates**: they are the values that fit this sample best, and a different fifty cars would give different ones.',
          },
        },
      ],
    },
    {
      id: 'reading-summary',
      title: 'Reading summary()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`summary()` is where most of the unit\'s interpretation happens, for linear models now and generalised linear models later. The layout barely changes between them, so it is worth reading slowly once.',
        },
        {
          kind: 'code',
          code: 'fit <- lm(dist ~ speed, data = cars)\nsummary(fit)\n',
        },
        {
          kind: 'table',
          caption: 'What each part of the coefficients table and the lines under it are telling you.',
          head: ['Part', 'What it means'],
          rows: [
            ['`Estimate`', 'The fitted coefficient: the intercept, then one slope per predictor'],
            ['`Std. Error`', 'How much that estimate would wobble from sample to sample'],
            ['`t value`', 'Estimate divided by its standard error: how many standard errors from zero'],
            ['`Pr(>|t|)`', 'The p-value for "this coefficient is really zero"; small means the data argue against zero'],
            ['Stars', 'A shorthand for the p-value, keyed on the `Signif. codes` line'],
            ['`Residual standard error`', 'The typical size of a residual, in the units of the response'],
            ['`Multiple R-squared`', 'The share of the variation in the response the model accounts for'],
            ['`F-statistic`', 'A test that every slope is zero at once'],
          ],
        },
        {
          kind: 'prose',
          body:
            'The same numbers can be pulled out for use in code, which is how you would put them in a report rather than copying them by hand.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- lm(dist ~ speed, data = cars)',
            'summary(fit)$coefficients',
            'summary(fit)$r.squared',
            'confint(fit)',
          ],
          caption: '`confint()` gives 95% confidence intervals for each coefficient.',
        },
        {
          kind: 'quiz',
          prompt: 'The p-value on `speed` is tiny. Which reading is right?',
          options: [
            { text: 'If speed truly had no effect, data showing a slope this far from zero would almost never happen', correct: true, why: 'A p-value is computed assuming the coefficient is zero. Tiny means this sample would be very surprising under that assumption.' },
            { text: 'There is almost no chance the slope is zero', why: 'A p-value is not the probability that a hypothesis is true. It is the probability of data at least this extreme if it were.' },
            { text: 'Speed explains almost all of the stopping distance', why: 'That is a question for R-squared. A coefficient can be clearly non-zero and still explain only part of the variation.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say it in the units of the data',
          body:
            '"The slope is significant" is not an interpretation. "Each extra mile per hour adds about this many feet to the stopping distance, and the data are very unlikely under no effect at all" is. Name the variable, its units, the direction and the size.',
        },
      ],
    },
    {
      id: 'more-predictors',
      title: 'More than one predictor',
      blocks: [
        {
          kind: 'prose',
          body:
            'Add predictors with `+`. The `mtcars` data has fuel economy (`mpg`) for 32 cars, with weight in thousands of pounds (`wt`) and horsepower (`hp`).',
        },
        {
          kind: 'code',
          code: 'fit2 <- lm(mpg ~ wt + hp, data = mtcars)\nsummary(fit2)$coefficients\n',
        },
        {
          kind: 'prose',
          body:
            'Each slope now means **the change in the response for one unit of that predictor, with the other predictors held fixed**. The `wt` coefficient compares two cars with the same horsepower that differ by a thousand pounds.',
        },
        {
          kind: 'compare',
          caption: 'The same weight coefficient, with and without horsepower in the model.',
          left: { label: 'Weight alone', code: 'coef(lm(mpg ~ wt, data = mtcars))\n' },
          right: { label: 'Weight and horsepower', code: 'coef(lm(mpg ~ wt + hp, data = mtcars))\n' },
        },
        {
          kind: 'quiz',
          prompt: 'Why does the `wt` coefficient change when `hp` joins the model?',
          options: [
            { text: 'Heavier cars tend to have more horsepower, so with weight alone, part of the horsepower effect was being credited to weight', correct: true, why: 'When predictors are related, each coefficient only makes sense alongside the others in the model. A coefficient belongs to a model, not to a variable.' },
            { text: 'R estimates coefficients one at a time, and the order changed', why: 'All coefficients are estimated together, and the order of terms in the formula does not change them.' },
            { text: 'Adding any predictor always makes the other coefficients smaller', why: 'They can move either way, or barely at all when the predictors are unrelated. It depends on how the predictors relate to each other and to the response.' },
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
            'Write a function `slope_of(x, y)` that fits a straight line of `y` on `x` with `lm()` and returns the slope as a plain number. `unname()` drops the name R attaches, though the tests accept either.',
          run: 'function',
          fnName: 'slope_of',
          starter: 'slope_of <- function(x, y) {\n  # fit lm(y ~ x) and return its slope\n}\n',
          solution: 'slope_of <- function(x, y) {\n  fit <- lm(y ~ x)\n  unname(coef(fit)[2])\n}\n',
          tests: [
            { id: 'cars', label: 'speed and stopping distance', hidden: false, call: 'slope_of(cars$speed, cars$dist)', expect: 'coef(lm(dist ~ speed, data = cars))[[2]]', cmp: 'float' },
            { id: 'exact', label: 'points on the line y = 2x', hidden: false, call: 'slope_of(c(1, 2, 3), c(2, 4, 6))', expect: '2', cmp: 'float' },
            { id: 'mtcars', label: 'weight and fuel economy', hidden: true, call: 'slope_of(mtcars$wt, mtcars$mpg)', expect: 'coef(lm(mpg ~ wt, data = mtcars))[[2]]', cmp: 'float' },
          ],
          hint: '`coef(fit)` gives the intercept first and the slope second, so the slope is `coef(fit)[2]`.',
        },
      ],
    },
    {
      id: 'what-it-assumes',
      title: 'What the straight line assumes',
      blocks: [
        {
          kind: 'prose',
          body:
            'A linear model assumes the response is a straight-line function of the predictors plus **normal errors with the same spread everywhere**. For stopping distances that is a reasonable first try. For the data the rest of the unit is about, it breaks in ways you can see.',
        },
        {
          kind: 'prose',
          body:
            'In `mtcars`, `am` is 1 for a manual gearbox and 0 for an automatic. Fit a straight line to that and ask it about a very light car and a very heavy one.',
        },
        {
          kind: 'code',
          code: 'fit01 <- lm(am ~ wt, data = mtcars)\npredict(fit01, data.frame(wt = c(1.5, 5.5)))\n',
          caption: 'Predictions for a yes/no response, from a model that does not know the answer has to lie between 0 and 1.',
        },
        {
          kind: 'prose',
          body:
            'Neither of those can be a probability. A count has the same problem at zero, and on top of it, counts with a bigger average also vary more, so the spread is not the same everywhere either. Generalised linear models fix both at once: a **link function** keeps predictions in range, and a **family** (binomial for yes/no, Poisson for counts) says how the spread grows with the mean. That is the next lesson.',
        },
        {
          kind: 'quiz',
          prompt: 'Which of these responses is a straight-line model with normal errors best suited to?',
          options: [
            { text: 'The weight of a fish, in grams', correct: true, why: 'A continuous measurement that can vary either side of its mean is the case the normal model was built for.' },
            { text: 'Whether a seed germinated', why: 'A yes/no response: a straight line will predict values below 0 and above 1. Logistic regression is the tool.' },
            { text: 'The number of cracks found in a length of pipe', why: 'A count: never negative, and its spread grows with its mean. Poisson regression is the tool.' },
          ],
        },
      ],
    },
  ],
};

export default lesson;
