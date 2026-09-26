// Choosing between models: deviance, the likelihood ratio test and AIC.
//
// The fifth STAT2402 lesson. Same discipline as the rest of the track: every deviance, AIC and p-value a
// reader sees was printed by R, and the prose points at the output rather than typing it. warpbreaks
// carries the lesson because the previous one found it overdispersed: the Poisson tests are shown first
// as the mechanics, flagged as too confident, and then redone as F tests on the quasi-Poisson fit. The
// second card draws counts from a model that is exactly right, so the goodness-of-fit check can be
// watched going wrong when the counts are small.
import type { Lesson } from '../../lessonSchema.ts';

/** The four nested models the first card steps through, smallest first. */
const LADDER = [
  { value: '1', caption: '1 (no predictors)' },
  { value: 'tension' },
  { value: 'wool + tension' },
  { value: 'wool * tension' },
];

/** A model's fitted mean for one wool at the three tensions, nudged sideways so the two wools sit apart. */
const fittedFor = (wool: 'A' | 'B', nudge: string) =>
  `cbind(1:3 ${nudge}, predict(fit, data.frame(wool = "${wool}", tension = c("L", "M", "H")), type = "response"))`;

const lesson: Lesson = {
  id: 'comparing-models',
  title: 'Choosing between models: deviance, likelihood ratio tests and AIC',
  summary: 'How to decide whether a bigger model earns its extra coefficients: deviance, likelihood ratio tests with anova() and drop1(), AIC, and what still works for quasi fits',
  track: 'stat2402',
  order: 9,
  prereqs: ['overdispersion'],
  minutes: 18,
  outcomes: [
    'Say what the null and residual deviance measure, and what the saturated model is',
    'Test a model against a bigger one that contains it with `anova(small, big, test = "Chisq")`, and say where the degrees of freedom come from',
    'Test each term of a model with `drop1()`, and explain why it leaves main effects alone while their interaction is in',
    'Compare models with `AIC()`, including models that are not nested, and say when AIC cannot be used',
    'Use F tests for quasi fits, and check a fit with its residual deviance and degrees of freedom, knowing when that check fails',
  ],
  sections: [
    {
      id: 'deviance',
      title: 'Deviance: how far from perfect',
      blocks: [
        {
          kind: 'prose',
          body:
            'Once you can fit a generalised linear model, the next question comes up every time there is more than one candidate: **which model should you keep?** Adding a predictor never makes the fit worse, even a predictor that is pure noise, so "fits better" cannot be the whole answer. This lesson is about deciding when an improvement is big enough to be worth having.\n\n' +
            'The data is `warpbreaks` again: how many times the yarn broke on each loom, for two wools (`wool`: A or B) at three tensions (`tension`: L, M and H). Print a Poisson fit and look at its last lines.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\nfit\n',
          caption: 'Printing a glm gives its coefficients and, at the bottom, two deviances and an AIC. This lesson is about those last lines.',
        },
        {
          kind: 'prose',
          body:
            'A **deviance** measures how far a model is from fitting perfectly. The yardstick is the **saturated model**: a model with one coefficient for every observation, so that its fitted values are the data themselves. Nothing fits the data better, and nothing is less use, because it has learned nothing that would carry over to a new loom.\n\n' +
            'A model\'s deviance is twice the gap between the saturated model\'s log-likelihood and its own:\n\n' +
            '**deviance = 2 × (log-likelihood of the saturated model − log-likelihood of this model)**\n\n' +
            'So 0 means a perfect fit, and bigger means worse. The **null deviance** belongs to the model with an intercept only, where every loom gets the same mean. The **residual deviance** belongs to the model you fitted. The drop from one to the other is what the predictors bought.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'sat <- glm(breaks ~ factor(seq_along(breaks)), family = poisson, data = warpbreaks)',
            'length(coef(sat)) == nrow(warpbreaks)',
            'logLik(sat)',
            'logLik(fit)',
            '2 * (as.numeric(logLik(sat)) - as.numeric(logLik(fit)))',
            'deviance(fit)',
          ],
          caption: '`factor(seq_along(breaks))` gives every loom a level of its own, so `sat` has one coefficient per observation. The last two lines are the same deviance worked out two ways.',
        },
        {
          kind: 'predict',
          code: 'sat <- glm(breaks ~ factor(seq_along(breaks)), family = poisson, data = warpbreaks)\nround(deviance(sat), 6)\n',
          ask: 'What is the deviance of the saturated model itself, rounded to six decimal places?',
          choices: ['[1] 0', '[1] 1', '[1] 54'],
        },
        {
          kind: 'quiz',
          prompt: 'In the printed fit, the null deviance is bigger than the residual deviance. What does the gap between them measure?',
          options: [
            { text: 'How much closer to a perfect fit wool and tension bring the model, compared with giving every loom the same mean', correct: true, why: 'Both deviances are measured from the same perfect fit, the saturated model. The null model has an intercept only, so the gap between them is the improvement the predictors made.' },
            { text: 'How far the model is from the saturated model', why: 'That is the residual deviance on its own. The gap is between two models you might actually use.' },
            { text: 'The probability that wool and tension have no effect', why: 'A deviance is not a probability. It can be turned into a p-value, which is what the tests later in this lesson do, but it is measured on a different scale.' },
          ],
        },
      ],
    },
    {
      id: 'nested',
      title: 'Nested models',
      blocks: [
        {
          kind: 'prose',
          body:
            'Two models are **nested** when the smaller one is the bigger one with some coefficients fixed at zero. `breaks ~ tension` sits inside `breaks ~ wool + tension`: set the `woolB` coefficient to zero and the bigger model becomes the smaller one. In turn, `breaks ~ wool + tension` sits inside `breaks ~ wool * tension`, which adds interaction coefficients so that the effect of tension can differ between the two wools.\n\n' +
            '`breaks ~ wool` and `breaks ~ tension` are not nested: neither can be turned into the other by setting coefficients to zero. Keep that pair in mind, because it comes back with AIC.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'nested-ladder',
            title: 'A ladder of nested models',
            intro: 'Step down a ladder of models, each one containing the one above it. The lines are each model\'s fitted mean for wool A and wool B at the three tensions, and the grey dots are the looms. Watch the lines, and the residual deviance in the output.',
            template:
              'fit <- glm(breaks ~ ⟦terms⟧, family = poisson, data = warpbreaks)\n' +
              'cat("Coefficients:", length(coef(fit)), "\\n")\n' +
              'cat("Residual deviance:", round(deviance(fit), 2), "on", df.residual(fit), "degrees of freedom\\n")\n' +
              'cat("AIC:", round(AIC(fit), 2), "\\n")\n',
            knobs: [
              { id: 'terms', label: 'the right-hand side of the formula', choices: LADDER },
            ],
            probes: {
              looms: 'cbind(as.numeric(warpbreaks$tension) + ifelse(warpbreaks$wool == "A", -0.08, 0.08), warpbreaks$breaks)',
              'wool-a': fittedFor('A', '- 0.08'),
              'wool-b': fittedFor('B', '+ 0.08'),
            },
            visual: {
              kind: 'plot',
              xLabel: 'tension: 1 low, 2 medium, 3 high',
              yLabel: 'breaks',
              caption: 'Each grey dot is one loom, wool A a little to the left of each tension and wool B a little to the right. Where a model ignores wool, its two lines lie on top of each other.',
              series: [
                { probe: 'wool-a', label: 'fitted mean, wool A' },
                { probe: 'wool-b', label: 'fitted mean, wool B' },
              ],
              points: 'looms',
            },
            takeaway:
              'Each model can do everything the one above it could, and more: set its extra coefficients to zero and you are back to the smaller model. So its best fit can never be worse, and the residual deviance never goes up as you step down the ladder. That is why a smaller deviance on its own proves nothing. The real question is whether a drop is bigger than the extra coefficients would buy by chance, and that is what the likelihood ratio test measures.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Which pair of models is nested?',
          options: [
            { text: '`breaks ~ tension` and `breaks ~ wool * tension`', correct: true, why: 'Set the `woolB` coefficient and both interaction coefficients to zero, and the bigger model is the smaller one. A model can sit inside another several steps down the ladder.' },
            { text: '`breaks ~ wool` and `breaks ~ tension`', why: 'Each has something the other lacks. Neither is the other with some coefficients set to zero, so they are not nested.' },
            { text: '`glm(breaks ~ tension, family = poisson)` and `lm(log(breaks) ~ tension)`', why: 'They model different responses, the counts and the logs of the counts. Nested models share a response and the same observations; these share neither the response nor the kind of model.' },
          ],
        },
      ],
    },
    {
      id: 'likelihood-ratio',
      title: 'The likelihood ratio test',
      blocks: [
        {
          kind: 'prose',
          body:
            'Take a small model and a bigger one that contains it. The drop in deviance between them is twice the log of the ratio of their likelihoods, which is where the **likelihood ratio test** gets its name. If the small model is right, so that the extra coefficients are really zero, the drop behaves like a chi-squared variable whose **degrees of freedom are the number of extra coefficients**. A drop far bigger than that chi-squared distribution usually gives is evidence that the extra coefficients are not zero.\n\n' +
            '`anova()` with two models and `test = "Chisq"` does the whole test. Is the interaction worth having?',
        },
        {
          kind: 'code',
          code:
            'small <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\n' +
            'big <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)\n' +
            'anova(small, big, test = "Chisq")\n',
          caption: 'One row per model, smallest first. On the second row, `Df` is the number of extra coefficients, `Deviance` is the drop in deviance, and `Pr(>Chi)` is the p-value.',
        },
        {
          kind: 'predict',
          code:
            'small <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\n' +
            'big <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)\n' +
            'anova(small, big, test = "Chisq")$Df\n',
          ask: 'Pull out the `Df` column on its own. `small` has an intercept, `woolB`, `tensionM` and `tensionH`; `big` adds a coefficient for wool B at each tension other than L. What does the column hold?',
          choices: ['[1] NA  2', '[1] NA  1', '[1] NA  6', '[1] 4 6'],
        },
        {
          kind: 'shell',
          lines: [
            'small <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'big <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)',
            'drop <- deviance(small) - deviance(big)',
            'extra <- df.residual(small) - df.residual(big)',
            'c(drop = drop, extra = extra)',
            'pchisq(drop, extra, lower.tail = FALSE)',
          ],
          caption: 'The same test by hand. `lower.tail = FALSE` asks for the chance of a drop at least this big: the upper tail of the chi-squared distribution.',
        },
        {
          kind: 'quiz',
          prompt: 'Where do the test\'s degrees of freedom come from?',
          options: [
            { text: 'The coefficients the big model has and the small one lacks: one for wool B at medium tension, one for wool B at high tension', correct: true, why: 'Each extra coefficient is one more thing the big model can adjust to chase the data, so each adds one degree of freedom to the chi-squared distribution the drop is compared with.' },
            { text: 'The number of predictors in the big model', why: 'A factor with three levels brings two coefficients, and the intercept counts too. What matters is coefficients, not variables, and only the ones the small model lacks.' },
            { text: 'The residual degrees of freedom of the big model', why: 'Those are in the `Resid. Df` column. The test\'s degrees of freedom are the *difference* between the two rows of that column.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'These counts are overdispersed',
          body:
            'The overdispersion lesson found that the warpbreaks counts spread out far more than a Poisson model allows. A Poisson likelihood ratio test has the same flaw as the Poisson standard errors: it takes the dispersion to be 1, so its p-values come out too small. The next two sections use Poisson fits to show the mechanics; the section on quasi fits redoes the tests allowing for the spread.',
        },
      ],
    },
    {
      id: 'drop1',
      title: 'Testing each term',
      blocks: [
        {
          kind: 'prose',
          body:
            '`drop1()` runs one likelihood ratio test per term. For each term in turn it refits the model without it and compares the two, so each row answers: does this term earn its place, given everything else in the model?',
        },
        {
          kind: 'code',
          code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\ndrop1(fit, test = "Chisq")\n',
          caption: 'The `<none>` row is the model as fitted. Each row under it leaves one term out: `Df` is how many coefficients go, `Deviance` is the residual deviance without them, `LRT` is the rise in deviance, and `Pr(>Chi)` is its p-value. `AIC` belongs to a later section.',
        },
        {
          kind: 'prose',
          body: 'Now ask `drop1()` about the model with the interaction.',
        },
        {
          kind: 'code',
          code: 'fit <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)\ndrop1(fit, test = "Chisq")\n',
        },
        {
          kind: 'quiz',
          prompt: 'This time the table only offers to drop `wool:tension`, not `wool` or `tension`. Why?',
          options: [
            { text: 'A model that keeps an interaction but loses one of its main effects makes little sense, so `drop1()` only offers terms that can leave without breaking that rule', correct: true, why: 'This is the **marginality** principle: keep the main effects of any interaction in the model. Test the interaction first. Only if it goes do the main effects get tested on their own, as in the first table.' },
            { text: 'Wool and tension are so clearly important that R does not bother testing them', why: 'R does not judge importance before testing. It leaves them out because dropping a main effect while its interaction stays gives a model that is hard to interpret.' },
            { text: 'The interaction model has too few degrees of freedom left to test more terms', why: 'The restriction is about which models make sense, not about how many can be fitted.' },
          ],
        },
      ],
    },
    {
      id: 'aic',
      title: 'AIC',
      blocks: [
        {
          kind: 'prose',
          body:
            'A test answers one yes-or-no question about two nested models. Often you want something else: a ranking of several candidates, some of which are not nested. **AIC**, the Akaike information criterion, gives one. It starts from the log-likelihood, which can only rise as coefficients are added to a model, and charges a fixed price for each parameter:\n\n' +
            '**AIC = −2 × log-likelihood + 2 × (number of parameters)**\n\n' +
            'The first part falls as the fit improves; the second grows with every parameter. **Smaller AIC is better**, and a coefficient is worth adding only if it improves −2 × log-likelihood by more than the 2 it costs.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)',
            'logLik(fit)',
            'k <- attr(logLik(fit), "df")',
            '-2 * as.numeric(logLik(fit)) + 2 * k',
            'AIC(fit)',
          ],
          caption: '`logLik()` prints the log-likelihood and, as `df`, the number of parameters it counts. The last two lines agree.',
        },
        {
          kind: 'code',
          code:
            'by_wool <- glm(breaks ~ wool, family = poisson, data = warpbreaks)\n' +
            'by_tension <- glm(breaks ~ tension, family = poisson, data = warpbreaks)\n' +
            'AIC(by_wool, by_tension)\n',
          caption: 'Two models that are not nested, on one scale. `df` is the number of parameters each one pays for.',
        },
        {
          kind: 'quiz',
          prompt: 'Read the two AICs. What can you conclude?',
          options: [
            { text: 'The tension model is the better of the two, even though it pays for more parameters', correct: true, why: 'Its AIC is smaller, and smaller wins. AIC can rank these two because both describe the same counts on the same looms. No likelihood ratio test between them is possible, because neither is nested in the other.' },
            { text: 'Nothing: AIC can only compare nested models', why: 'That is the rule for the likelihood ratio test. AIC only needs both models to describe the same response on the same rows.' },
            { text: 'The wool model is better, because it has fewer parameters', why: 'Fewer parameters means a smaller penalty, but the fit counts too. The tension model fits enough better to more than pay for its extra parameter.' },
          ],
        },
        {
          kind: 'code',
          code:
            'all_rows <- glm(breaks ~ wool, family = poisson, data = warpbreaks)\n' +
            'some_rows <- glm(breaks ~ wool, family = poisson, data = subset(warpbreaks, tension != "L"))\n' +
            'AIC(all_rows, some_rows)\n',
          caption: 'The same formula, fitted to every loom and to only the medium- and high-tension looms. R warns, and prints the table anyway.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Same response, same rows',
          body:
            'AIC can compare models that are not nested, but only when they describe the same response on the same observations. A log-likelihood adds up one term per observation, so a model fitted to fewer rows tends to get a smaller AIC without fitting any better, as `some_rows` does above. The same goes for a changed response: the AIC of a model for `log(breaks)` is on a different scale from one for `breaks`. Watch for rows dropped quietly because of missing values, too.',
        },
        {
          kind: 'prose',
          body:
            'With many candidate terms, `step()` searches for you. From a starting model it tries adding or dropping each term, makes the move that lowers AIC the most, and repeats until no move lowers it. `scope` says which terms it may use.',
        },
        {
          kind: 'code',
          code:
            'start <- glm(breaks ~ 1, family = poisson, data = warpbreaks)\n' +
            'best <- step(start, scope = ~ wool * tension)\n' +
            'formula(best)\n',
          caption: '`Start:` is the model it begins from and each `Step:` is one move. Under each is a table of the moves it considered next, best first: `+` adds a term, `-` drops one, and `<none>` stays put. The last line is the formula it settled on.',
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Use step() to explore, not to prove',
          body:
            '`step()` is a search, not a test. It only tries the terms you offer, one move at a time, so it can miss a better model. And the p-values in the summary of the model it picks ignore the search that found it: a term chosen because it looked strong will look strong. Report the choice as a choice, and check the chosen model the way you would any other.',
        },
      ],
    },
    {
      id: 'quasi-fits',
      title: 'Quasi fits: F tests instead',
      blocks: [
        {
          kind: 'prose',
          body:
            'Back to the problem flagged earlier: these counts are overdispersed, so the overdispersion lesson refitted them with `family = quasipoisson`. A quasi fit describes only the mean and how the variance grows with it, not a full probability distribution, so **it has no likelihood**. No likelihood means no AIC, and no likelihood ratio test in the usual form.\n\n' +
            'What survives is the drop in deviance. Divide it by its degrees of freedom and then by the estimated dispersion φ, and it can be compared with an **F distribution**, which allows for φ having been estimated from the same data. Ask for it with `test = "F"`, in `anova()` or `drop1()`.',
        },
        {
          kind: 'compare',
          caption: 'The same two terms tested both ways. The deviances match; what changes is the yardstick they are measured against.',
          left: {
            label: 'Poisson: chi-squared tests, dispersion taken as 1',
            code: 'fit <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\ndrop1(fit, test = "Chisq")\n',
            bad: true,
          },
          right: {
            label: 'Quasi-Poisson: F tests, dispersion estimated',
            code: 'qfit <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)\ndrop1(qfit, test = "F")\n',
          },
        },
        {
          kind: 'quiz',
          prompt: 'Compare the `wool` row on each side. What changed?',
          options: [
            { text: 'The drop in deviance is the same, but once the extra spread is allowed for, the evidence that wool matters is far weaker', correct: true, why: 'Same `Deviance` in both tables, very different p-values. The chi-squared test treats the drop as if the counts were Poisson; the F test scales it down by the estimated dispersion first. Allowing for the spread takes wool from a clear effect to a borderline one.' },
            { text: 'Wool has a smaller effect in the quasi-Poisson fit', why: 'Quasi-Poisson fits exactly the same means, so the coefficients and deviances do not change. Only the yardstick does.' },
            { text: 'The F test is less accurate, so its p-values are larger', why: 'It is the chi-squared test that is off here: it assumes a dispersion of 1 when these counts spread far more than that. The F test\'s larger p-values are the honest ones.' },
          ],
        },
        {
          kind: 'shell',
          lines: [
            'small <- glm(breaks ~ wool + tension, family = quasipoisson, data = warpbreaks)',
            'big <- glm(breaks ~ wool * tension, family = quasipoisson, data = warpbreaks)',
            'AIC(big)',
            '((deviance(small) - deviance(big)) / (df.residual(small) - df.residual(big))) / summary(big)$dispersion',
            'anova(small, big, test = "F")',
          ],
          caption: 'No AIC for a quasi fit, but the interaction can still be tested. The fourth line is the F statistic by hand; compare it with the table, and the p-value with the Poisson test in the likelihood ratio section.',
        },
      ],
    },
    {
      id: 'goodness-of-fit',
      title: 'Does the model fit at all?',
      blocks: [
        {
          kind: 'prose',
          body:
            'Every test so far has compared two models. The residual deviance can also be set against the saturated model, which asks a different question: does this model fit as well as a model of its family should? If the model is right, and the counts are not small, the residual deviance behaves roughly like a chi-squared variable on the residual degrees of freedom. A deviance far above its degrees of freedom, with a tiny p-value, says the model is missing something.',
        },
        {
          kind: 'shell',
          lines: [
            'fit <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)',
            'deviance(fit)',
            'df.residual(fit)',
            'pchisq(deviance(fit), df.residual(fit), lower.tail = FALSE)',
            'min(warpbreaks$breaks)',
          ],
          caption: 'Even the biggest model on the ladder leaves a deviance well above its degrees of freedom. With counts this size the check can be trusted, and it says what the overdispersion lesson found: more spread than a Poisson model allows.',
        },
        {
          kind: 'prose',
          body:
            'The check leans on an approximation, and the approximation fails when many of the counts are small. You can watch it fail by making counts from a model you know is right.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'small-counts-deviance',
            title: 'A right model, judged by its deviance',
            intro: 'Each setting draws 10,000 counts from a Poisson distribution with the mean you choose, so that luck plays almost no part, then fits the model that made them: a single mean, `y ~ 1`. The model is exactly right every time. Drag the mean and compare the residual deviance with its degrees of freedom.',
            template:
              'mu <- ⟦tenths⟧ / 10\n' +
              'y <- rpois(10000, lambda = mu)\n' +
              'fit <- glm(y ~ 1, family = poisson)\n' +
              'cat("True mean:", mu, "   counts of zero:", sum(y == 0), "of 10000\\n")\n' +
              'cat("Residual deviance:", round(deviance(fit), 1), "on", df.residual(fit), "degrees of freedom\\n")\n' +
              'cat("Deviance / df:", round(deviance(fit) / df.residual(fit), 3), "\\n")\n',
            knobs: [
              { id: 'tenths', kind: 'range', label: 'the true mean count, in tenths', min: 1, max: 100, start: 50 },
            ],
            probes: {
              sizes: 'c(deviance(fit), df.residual(fit))',
              names: 'c("residual deviance", "degrees of freedom")',
            },
            visual: {
              kind: 'bars',
              values: 'sizes',
              labels: 'names',
              caption: 'For a model that is right, the check expects these two bars to be about the same height.',
            },
            takeaway:
              'Every one of these samples came from exactly the model being fitted, so a check that worked would show two bars of about the same height at every setting. With a mean of several counts the deviance sits only a little above its degrees of freedom, and the gap narrows as the mean grows. Below that the two part company: around a mean of 1 the deviance runs noticeably above its degrees of freedom, and when nearly every count is 0 it falls far below. A right model can look worse or better than it is, depending only on how small the counts are. So when many fitted counts are small, read little into a residual deviance far from its degrees of freedom, or into the p-value built on it.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A Poisson model for rare-bird sightings, where most surveys see none, has a residual deviance well below its degrees of freedom. What should you conclude?',
          options: [
            { text: 'Not much: with counts this small the deviance does not follow the chi-squared distribution, so comparing it with its degrees of freedom is not a fair check', correct: true, why: 'The card showed a model that was exactly right landing well below its degrees of freedom when most counts were zero. Compare models with tests and AIC, and look at the residuals, rather than leaning on this one number.' },
            { text: 'The model fits very well', why: 'That would be the usual reading, but with mostly-zero counts even a model that is exactly right lands well below its degrees of freedom, so on its own it says little about this one.' },
            { text: 'The counts are underdispersed', why: 'Underdispersion, less spread than the model allows, does happen. But a small deviance from mostly-zero counts is not evidence of it: the check itself is off when counts are this small.' },
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
            'Write a function `lrt_p(small, big)` that takes two fitted glms, `small` nested in `big`, and returns the p-value of the likelihood ratio test between them: the drop in deviance, compared with a chi-squared distribution whose degrees of freedom are the number of extra coefficients. Use `deviance()`, `df.residual()` and `pchisq()` rather than `anova()`; the tests check your answer against `anova()`.',
          run: 'function',
          fnName: 'lrt_p',
          starter:
            'lrt_p <- function(small, big) {\n' +
            '  # the drop in deviance, the number of extra coefficients,\n' +
            '  # and the upper tail of pchisq()\n' +
            '}\n',
          solution:
            'lrt_p <- function(small, big) {\n' +
            '  drop <- deviance(small) - deviance(big)\n' +
            '  extra <- df.residual(small) - df.residual(big)\n' +
            '  pchisq(drop, extra, lower.tail = FALSE)\n' +
            '}\n',
          tests: [
            {
              id: 'high-tension',
              label: 'warpbreaks at high tension: does wool matter?',
              hidden: false,
              setup:
                'h <- subset(warpbreaks, tension == "H")\n' +
                'small <- glm(breaks ~ 1, family = poisson, data = h)\n' +
                'big <- glm(breaks ~ wool, family = poisson, data = h)',
              call: 'lrt_p(small, big)',
              expect: 'local({ h <- subset(warpbreaks, tension == "H"); s <- glm(breaks ~ 1, family = poisson, data = h); b <- glm(breaks ~ wool, family = poisson, data = h); anova(s, b, test = "Chisq")[2, "Pr(>Chi)"] })',
              cmp: 'float',
            },
            {
              id: 'sprays',
              label: 'InsectSprays A, B and F: do the three sprays differ?',
              hidden: false,
              setup:
                'd <- subset(InsectSprays, spray %in% c("A", "B", "F"))\n' +
                'small <- glm(count ~ 1, family = poisson, data = d)\n' +
                'big <- glm(count ~ spray, family = poisson, data = d)',
              call: 'lrt_p(small, big)',
              expect: 'local({ d <- subset(InsectSprays, spray %in% c("A", "B", "F")); s <- glm(count ~ 1, family = poisson, data = d); b <- glm(count ~ spray, family = poisson, data = d); anova(s, b, test = "Chisq")[2, "Pr(>Chi)"] })',
              cmp: 'float',
            },
            {
              id: 'logistic',
              label: 'a logistic model: does horsepower add anything to weight?',
              hidden: true,
              setup:
                'small <- glm(am ~ wt, family = binomial, data = mtcars)\n' +
                'big <- glm(am ~ wt + hp, family = binomial, data = mtcars)',
              call: 'lrt_p(small, big)',
              expect: 'local({ s <- glm(am ~ wt, family = binomial, data = mtcars); b <- glm(am ~ wt + hp, family = binomial, data = mtcars); anova(s, b, test = "Chisq")[2, "Pr(>Chi)"] })',
              cmp: 'float',
            },
            {
              id: 'interaction',
              label: 'warpbreaks: the wool-by-tension interaction, a very small p-value',
              hidden: true,
              setup:
                'small <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks)\n' +
                'big <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks)',
              call: 'lrt_p(small, big)',
              expect: 'local({ s <- glm(breaks ~ wool + tension, family = poisson, data = warpbreaks); b <- glm(breaks ~ wool * tension, family = poisson, data = warpbreaks); anova(s, b, test = "Chisq")[2, "Pr(>Chi)"] })',
              cmp: 'float',
              tol: 1e-9,
            },
          ],
          hint: '`deviance(small) - deviance(big)` is the drop, and `df.residual(small) - df.residual(big)` is the number of extra coefficients. `pchisq(drop, extra, lower.tail = FALSE)` gives the chance of a drop at least that big.',
        },
        {
          kind: 'match',
          ask: 'Match each call to the question it answers.',
          pairs: [
            { left: '`anova(small, big, test = "Chisq")`', right: 'Is the bigger of two nested models worth its extra coefficients?' },
            { left: '`drop1(fit, test = "Chisq")`', right: 'Does each term earn its place, given the others?' },
            { left: '`AIC(m1, m2, m3)`', right: 'Which of several models of the same data is best, nested or not?' },
            { left: '`anova(q1, q2, test = "F")`', right: 'Is the bigger of two nested quasi fits worth it, allowing for the estimated dispersion?' },
            { left: '`pchisq(deviance(fit), df.residual(fit), lower.tail = FALSE)`', right: 'Is there misfit left over, measured against a perfect fit?' },
          ],
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'Say what you compared',
          body:
            '"The interaction was significant" leaves a reader guessing. Name the two models, the test, its degrees of freedom and the p-value, all read off the table, and say which family the test assumed. That is a sentence anyone with your output can check.',
        },
      ],
    },
  ],
};

export default lesson;
