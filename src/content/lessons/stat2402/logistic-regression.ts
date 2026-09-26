// Logistic regression: the generalised linear model for a yes/no response.
//
// Picks up where regression-in-r leaves off, with a straight line fitted to `am` in mtcars predicting
// values no probability can take. Everything under a block was printed by R; the prose points at the
// output ("the `wt` value in the second line") rather than typing a number R worked out, so the lesson
// cannot drift from what a student sees when they run the same lines in RStudio.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'logistic-regression',
  title: 'Yes or no: logistic regression',
  summary: 'Why a straight line fails for yes/no data, how odds and log-odds fix it, and how to fit, read and predict from a binomial glm in R',
  track: 'stat2402',
  order: 4,
  prereqs: ['regression-in-r'],
  minutes: 18,
  outcomes: [
    'Say why a straight line is the wrong model for a 0/1 response',
    'Move between probability, odds and log-odds with `p / (1 - p)`, `qlogis()` and `plogis()`',
    'Fit a logistic regression with `glm(..., family = binomial)` and read its `summary()` on the log-odds scale',
    'Turn a coefficient into an odds ratio with `exp()` and say it in words',
    'Predict a probability with `type = "response"`, and recognise a log-odds prediction when you see one',
  ],
  sections: [
    {
      id: 'why-not-a-line',
      title: 'Why a straight line fails',
      blocks: [
        {
          kind: 'prose',
          body:
            'Plenty of questions have a yes/no answer: did the seed germinate, did the patient recover, does the car have a manual gearbox. Code the answer as 1 for yes and 0 for no, and the thing worth modelling is the **probability of a yes**, and how it changes with the predictors.\n\n' +
            'The last lesson ended by fitting a straight line to exactly that kind of response. In `mtcars`, `am` is 1 for a manual gearbox and 0 for an automatic. Here are the counts, and the smallest and largest values a straight line on weight fits to the 32 cars.',
        },
        {
          kind: 'code',
          code: 'table(mtcars$am)\nfit_lm <- lm(am ~ wt, data = mtcars)\nrange(fitted(fit_lm))\n',
          caption: '`table()` counts the automatics (0) and the manuals (1). `range()` gives the lowest and highest fitted values.',
        },
        {
          kind: 'prose',
          body:
            'The lowest fitted value is below 0 and the highest is above 1, and these are cars in the data, not a guess far outside it. No probability can do either. A straight line has no idea its answer is meant to stay between 0 and 1, so the fix is to stop asking a straight line for the probability, and ask it for something that is allowed to run without limit in both directions.',
        },
        {
          kind: 'quiz',
          prompt: 'Predictions outside 0 and 1 are one problem with `lm()` on a 0/1 response. Which of these is another?',
          options: [
            { text: 'The spread of a 0/1 response depends on its probability, so it cannot be the same everywhere', correct: true, why: 'A yes/no response with probability p has variance p(1 − p): largest at an even chance, shrinking to nothing near 0 and 1. A linear model assumes one spread for every car.' },
            { text: '32 cars are too few to fit a line', why: 'Thirty-two observations is plenty for an intercept and one slope. The trouble is the shape of the model, not the size of the sample.' },
            { text: '`lm()` refuses a response that only takes the values 0 and 1', why: 'It ran without complaint above. R fits whatever model you ask for, which is exactly why checking that the model suits the data is your job.' },
          ],
        },
      ],
    },
    {
      id: 'odds',
      title: 'Probability, odds and log-odds',
      blocks: [
        {
          kind: 'prose',
          body:
            'Logistic regression uses three ways of saying how likely something is. **Probability** you know: a number from 0 to 1. The **odds** are the chance it happens divided by the chance it does not, p / (1 − p). The **log-odds** are the natural log of the odds. Here is one probability taken through all three and back, followed by a few more each way.',
        },
        {
          kind: 'shell',
          lines: [
            'p <- 0.2',
            'p / (1 - p)',
            'log(p / (1 - p))',
            'qlogis(p)',
            'plogis(qlogis(p))',
            'qlogis(c(0.01, 0.25, 0.75, 0.99))',
            'plogis(c(-10, -1, 1, 10))',
          ],
          caption: '`qlogis()` takes a probability straight to its log-odds, a step called the **logit**. `plogis()` goes back the other way.',
        },
        {
          kind: 'prose',
          body:
            'Look at the ranges. A probability is stuck between 0 and 1. Odds start at 0 but have no ceiling. Log-odds have no floor either: probabilities near 0 give large negative log-odds, probabilities near 1 give large positive ones, and the last line shows `plogis()` bringing even extreme log-odds back inside 0 to 1. A quantity that can run from minus infinity to plus infinity is one a straight line can predict without ever giving an impossible answer.',
        },
        {
          kind: 'predict',
          code: 'plogis(0)\n',
          ask: 'A log-odds of exactly 0. What probability is that?',
          choices: ['[1] 0', '[1] 0.5', '[1] 1', '[1] NaN'],
        },
        {
          kind: 'quiz',
          prompt: 'A model gives an event a log-odds of −2. What does the minus sign tell you?',
          options: [
            { text: 'The event is less likely to happen than not', correct: true, why: 'Negative log-odds means odds below 1, which means a probability below one half. The event is unlikely, not impossible.' },
            { text: 'The event is impossible', why: 'Only a probability of exactly 0 has log-odds of minus infinity. Any finite log-odds, however negative, is a probability above 0.' },
            { text: 'The model has made a mistake, because a chance cannot be negative', why: 'Log-odds are not a chance. They are allowed to be negative; `plogis()` turns them into a probability, which is always between 0 and 1.' },
          ],
        },
      ],
    },
    {
      id: 'the-logit-link',
      title: 'The logit link',
      blocks: [
        {
          kind: 'prose',
          body:
            'Logistic regression puts the straight line on the log-odds scale:\n\n' +
            '**log(p / (1 − p)) = b0 + b1 × x**\n\n' +
            'The function on the left, the logit, is the **link**: it links the probability you care about to the straight line the model fits. To get a probability back, undo it with `plogis()`. A straight line pushed through `plogis()` comes out as an S-shaped curve, and that curve is the model. Set a line and watch what it becomes.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'logit-line-to-curve',
            title: 'A straight line, bent into an S',
            intro: 'Set the **intercept** b0 and the **slope** b1 of a line on the log-odds scale. The table gives the log-odds and the probability at three values of x; the curve is the probability at every x, with a dot where x is 0.',
            template:
              'b0 <- ⟦b0⟧\n' +
              'b1 <- ⟦b1⟧ / 10\n' +
              'x <- seq(-6, 6, by = 0.2)\n' +
              'p <- plogis(b0 + b1 * x)\n' +
              'at <- c(-2, 0, 2)\n' +
              'print(data.frame(x = at, log_odds = b0 + b1 * at, probability = round(plogis(b0 + b1 * at), 3)))\n',
            knobs: [
              { id: 'b0', kind: 'range', label: 'intercept b0', min: -3, max: 3, start: 0 },
              { id: 'b1', kind: 'range', label: 'slope b1, in tenths', min: -12, max: 12, start: 10 },
            ],
            probes: {
              curve: 'cbind(x, p)',
              'at-zero': 'cbind(0, plogis(b0))',
            },
            visual: {
              kind: 'plot',
              xLabel: 'x',
              yLabel: 'probability',
              caption: 'The probability `plogis(b0 + b1 * x)` for every x. The dot sits at x = 0, where the log-odds are the intercept.',
              series: [{ probe: 'curve', label: 'probability' }],
              marker: 'at-zero',
            },
            takeaway:
              'The log-odds column always moves in equal steps, because it is a straight line. The probability never leaves 0 to 1, however steep you make it. The **slope** sets which way the S runs and how sharply it turns, and a slope of 0 flattens it: x then makes no difference. The **intercept** sets the probability at x = 0, which slides the whole S left or right.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'In a logistic regression with one predictor x, which of these is a straight-line function of x?',
          options: [
            { text: 'The log-odds', correct: true, why: 'That is the model: log(p / (1 − p)) = b0 + b1 × x. Everything else is a transformation of that line.' },
            { text: 'The probability', why: 'The probability is the S-shaped curve you get by pushing the line through `plogis()`. It bends so that it never leaves 0 to 1.' },
            { text: 'The odds', why: 'The odds are exp(b0 + b1 × x): they are multiplied by the same amount for each unit of x, so they curve upwards or decay rather than rising in a straight line.' },
          ],
        },
      ],
    },
    {
      id: 'fitting',
      title: 'Fitting it with glm()',
      blocks: [
        {
          kind: 'prose',
          body:
            '`glm()` fits a generalised linear model. It takes the same formula and data as `lm()`, plus a **family** saying what kind of response it is. For a yes/no response the family is `binomial`. The response can be 0/1 numbers like `am`, `TRUE` and `FALSE`, or a factor, where the first level counts as no and every other level as yes.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)\nfit\n',
          caption: 'Printing the model gives the call, the two coefficients and a few lines about the fit that `summary()` repeats in more detail.',
        },
        {
          kind: 'prose',
          body:
            'The coefficients are on the log-odds scale. Read the model as **log-odds of a manual gearbox = intercept + slope × weight**, with the two numbers from the output. The family carries its own link, so you never type the logit yourself.',
        },
        {
          kind: 'predict',
          code: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)\nfamily(fit)$link\n',
          ask: '`family(fit)` reports the family a model was fitted with. Which link did `family = binomial` choose?',
          choices: ['[1] "logit"', '[1] "binomial"', '[1] "log"', '[1] "identity"'],
        },
        {
          kind: 'compare',
          caption: 'Leave the family out and `glm()` falls back to the normal (gaussian) family, which is an ordinary straight line: on the left, `glm()` and `lm()` give the same coefficients.',
          left: {
            label: 'Family left out',
            code: 'coef(glm(am ~ wt, data = mtcars))\ncoef(lm(am ~ wt, data = mtcars))\n',
            bad: true,
          },
          right: {
            label: 'family = binomial',
            code: 'coef(glm(am ~ wt, family = binomial, data = mtcars))\n',
          },
        },
      ],
    },
    {
      id: 'reading-summary',
      title: 'Reading a glm summary',
      blocks: [
        {
          kind: 'prose',
          body:
            '`summary()` of a glm is laid out like the one for `lm()`, with a few changes worth knowing. Compare it with the summary from the last lesson as you read.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)\nsummary(fit)\n',
        },
        {
          kind: 'table',
          caption: 'What each part of a glm summary is telling you.',
          head: ['Part', 'What it means'],
          rows: [
            ['`Estimate`', 'The fitted coefficient, on the log-odds scale: the intercept, then one slope per predictor'],
            ['`Std. Error`', 'How much that estimate would wobble from sample to sample'],
            ['`z value`', 'Estimate divided by its standard error. It is a z, not a t: with a yes/no response the spread follows from the probability, so there is no separate spread to estimate'],
            ['`Pr(>|z|)`', 'The p-value for "this coefficient is really zero", from the normal distribution'],
            ['Dispersion line', 'The binomial family fixes the spread at what the probabilities imply, which is why there is no residual standard error'],
            ['`Null deviance`', 'How badly a model with no predictors fits, where every car gets the same probability'],
            ['`Residual deviance`', 'How badly this model fits. The drop from the null deviance is what the predictors bought'],
            ['`AIC`', 'For comparing models fitted to the same data: lower is better'],
            ['Fisher Scoring iterations', 'How many rounds the fitting took. There is no formula for the answer, so R improves a guess until it settles'],
          ],
        },
        {
          kind: 'quiz',
          prompt: 'The `wt` estimate in the summary is negative. Which reading is right?',
          options: [
            { text: 'Heavier cars have lower log-odds, and so a lower probability, of a manual gearbox', correct: true, why: 'The sign carries straight through: lower log-odds means lower odds means a lower probability. The size is on the log-odds scale, so it needs translating before you can say how much.' },
            { text: 'Each extra thousand pounds lowers the probability of a manual gearbox by that amount', why: 'The estimate is a change in log-odds, not in probability. The same change in log-odds moves the probability a lot in the middle of the S and hardly at all near 0 or 1.' },
            { text: 'Heavier cars are less likely to have an automatic gearbox', why: 'This flips the coding. `am` is 1 for a manual, so the model is for the probability of a manual; that falls with weight, which makes automatics more likely.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Deviance, briefly',
          body:
            'A glm summary has no R-squared and no F-statistic. The two deviance lines take over their job: each measures how far a model is from fitting every observation perfectly, so a big drop from the null deviance to the residual deviance means the predictors earned their place. Deviance gets its own lesson; for now, read it as "smaller fits better".',
        },
      ],
    },
    {
      id: 'odds-ratios',
      title: 'Odds ratios',
      blocks: [
        {
          kind: 'prose',
          body:
            'A slope on the log-odds scale is hard to picture. Undo the log and it becomes something you can say out loud. If the log-odds go up by b1 for each unit of x, the odds are **multiplied** by exp(b1). That multiplier is the **odds ratio**: the odds at x + 1 divided by the odds at x, and it is the same whatever x you start from.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
            'exp(coef(fit))',
            'range(mtcars$wt)',
            'exp(0.1 * coef(fit)["wt"])',
            'exp(confint(fit, "wt"))',
          ],
          caption: '`exp()` of the coefficients gives odds ratios. Multiplying the slope by 0.1 first gives the odds ratio for a tenth of a unit: a hundred pounds. The "Waiting for profiling" line is `confint()` saying how it works: for a glm the interval comes from profiling the likelihood, not from the estimate plus or minus two standard errors.',
        },
        {
          kind: 'prose',
          body:
            'The number under `wt` in the second line is the odds ratio for an extra thousand pounds, and it is far below 1. A thousand pounds is a big step for cars whose weights all sit between the two values `range()` printed, so the fourth line asks about a hundred pounds instead. The last line is a 95% confidence interval for the odds ratio per thousand pounds, made by exponentiating the interval for the slope; it does not reach 1, which matches the small p-value in the summary.\n\n' +
            'The intercept\'s odds ratio is the odds of a manual at a weight of zero. No car weighs nothing, so like the intercept of a straight line it is where the model starts, not a fact about any car.',
        },
        {
          kind: 'quiz',
          prompt: 'Suppose a logistic regression of whether a seed germinates on soil temperature gives an odds ratio of 1.5 per degree. Which reading is right?',
          options: [
            { text: 'Each extra degree multiplies the odds of germinating by 1.5', correct: true, why: 'An odds ratio is a multiplier on the odds, and it is the same for every one-degree step.' },
            { text: 'Each extra degree multiplies the probability of germinating by 1.5', why: 'A probability cannot keep growing by half again: a few degrees would carry it past 1. The multiplier applies to the odds, which have no ceiling.' },
            { text: 'Each extra degree adds 1.5 to the log-odds', why: 'That would be a slope of 1.5. The slope is log(1.5), and the odds ratio is exp() of the slope.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say it in words',
          body:
            '"The weight coefficient is significant" is not an interpretation. "Each extra hundred pounds multiplies the odds that a car has a manual gearbox by the number printed above" is. An odds ratio below 1 means the odds fall, and 1 minus the ratio is the share they fall by; above 1, they rise. Name the predictor, the size of the step, and that it is the **odds** that change.',
        },
      ],
    },
    {
      id: 'predictions',
      title: 'Predictions on two scales',
      blocks: [
        {
          kind: 'prose',
          body:
            '`predict()` on a glm answers on the log-odds scale unless you ask otherwise, because that is where the model\'s straight line lives. `type = "response"` pushes the answer through `plogis()` and gives a probability.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
            'new <- data.frame(wt = c(2, 3, 4))',
            'predict(fit, new)',
            'predict(fit, new, type = "response")',
            'plogis(predict(fit, new))',
          ],
          caption: 'The last two lines agree: `type = "response"` is `plogis()` of the log-odds.',
        },
        {
          kind: 'predict',
          code: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)\nguess <- predict(fit, data.frame(wt = c(1.5, 5.5)))\nguess > 0 & guess < 1\n',
          ask: 'Someone forgets `type = "response"` and checks whether their predictions for a very light and a very heavy car are between 0 and 1. What does R print?',
          choices: [
            '   1    2\nTRUE TRUE',
            '    1     2\n TRUE FALSE',
            '    1     2\nFALSE  TRUE',
            '    1     2\nFALSE FALSE',
          ],
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'fitted-curve-by-weight',
            title: 'One car, two models',
            intro: 'Drag the **weight**. The curve is the fitted probability of a manual gearbox from `glm()`, the straight line is `lm()` on the same data, and the coloured dots are each model\'s answer at the weight you chose. R prints a very small probability in e-notation: `e-05` on the end means times 10 to the power −5.',
            template:
              'fit <- glm(am ~ wt, family = binomial, data = mtcars)\n' +
              'fit_lm <- lm(am ~ wt, data = mtcars)\n' +
              'new <- data.frame(wt = ⟦wt⟧ / 10)\n' +
              'cat("weight:", new$wt * 1000, "pounds\\n")\n' +
              'cat("straight line, lm:", round(predict(fit_lm, new), 3), "\\n")\n' +
              'cat("log-odds, glm:", round(predict(fit, new), 3), "\\n")\n' +
              'cat("probability, glm:", signif(predict(fit, new, type = "response"), 3), "\\n")\n',
            knobs: [
              { id: 'wt', kind: 'range', label: 'weight, in hundreds of pounds', min: 15, max: 55, start: 30 },
            ],
            probes: {
              curve: 'cbind(seq(1.5, 5.5, by = 0.05), predict(fit, data.frame(wt = seq(1.5, 5.5, by = 0.05)), type = "response"))',
              line: 'cbind(c(1.5, 5.5), predict(fit_lm, data.frame(wt = c(1.5, 5.5))))',
              here: 'rbind(c(new$wt, predict(fit, new, type = "response")), c(new$wt, predict(fit_lm, new)))',
              cars: 'cbind(mtcars$wt, mtcars$am)',
            },
            visual: {
              kind: 'plot',
              xLabel: 'weight, thousands of lb',
              yLabel: 'P(manual)',
              caption: 'Each grey dot is one car: manuals at 1, automatics at 0.',
              series: [
                { probe: 'curve', label: 'glm, binomial' },
                { probe: 'line', label: 'lm, straight line' },
              ],
              marker: 'here',
              points: 'cars',
            },
            takeaway:
              'At the ends of the slider the straight line leaves 0 to 1, above 1 at the light end and below 0 at the heavy end, while the curve flattens towards 0 and 1 and never crosses them. The log-odds fall by the same amount for every hundred pounds, which is the straight line hiding inside the model, but the probability changes fastest in the middle of the S, where the cars stop being mostly manual and start being mostly automatic.',
          },
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Name the scale',
          body:
            'A negative number from `predict()` on a glm is not a broken model: it is a log-odds below an even chance. When you report a prediction, say whether it is a log-odds, an odds or a probability, and use `type = "response"` whenever a reader will expect a probability.',
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
            'Write a function `odds_ratio(fit, step = 1)` that takes a logistic regression with one predictor and returns the odds ratio for an increase of `step` in that predictor, as a plain number: the factor the odds are multiplied by. With the default `step = 1` it is `exp()` of the slope. For `wt` in `mtcars`, `step = 0.1` is a hundred pounds.',
          run: 'function',
          fnName: 'odds_ratio',
          starter: 'odds_ratio <- function(fit, step = 1) {\n  # the factor the odds are multiplied by when the predictor goes up by step\n}\n',
          solution: 'odds_ratio <- function(fit, step = 1) {\n  slope <- unname(coef(fit)[2])\n  exp(step * slope)\n}\n',
          tests: [
            {
              id: 'thousand', label: 'weight, a thousand pounds', hidden: false,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'odds_ratio(fit)',
              expect: 'exp(coef(glm(am ~ wt, family = binomial, data = mtcars))[[2]])',
              cmp: 'float',
            },
            {
              id: 'hundred', label: 'weight, a hundred pounds', hidden: false,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'odds_ratio(fit, 0.1)',
              expect: 'exp(0.1 * coef(glm(am ~ wt, family = binomial, data = mtcars))[[2]])',
              cmp: 'float',
            },
            {
              id: 'engine', label: 'engine shape and fuel economy, five mpg', hidden: true,
              setup: 'fit <- glm(vs ~ mpg, family = binomial, data = mtcars)',
              call: 'odds_ratio(fit, 5)',
              expect: 'exp(5 * coef(glm(vs ~ mpg, family = binomial, data = mtcars))[[2]])',
              cmp: 'float',
            },
            {
              id: 'no-step', label: 'a step of zero changes nothing', hidden: true,
              setup: 'fit <- glm(am ~ wt, family = binomial, data = mtcars)',
              call: 'odds_ratio(fit, 0)',
              expect: '1',
              cmp: 'float',
            },
          ],
          hint: 'The log-odds change by `step` times the slope, so the odds are multiplied by `exp(step * slope)`. The slope is `coef(fit)[2]`.',
        },
      ],
    },
  ],
};

export default lesson;
