// Exam questions for "Choosing between models: deviance, likelihood ratio tests and AIC".
//
// Every output shown with a question was printed by R when the verifier ran it, and every number
// question's answer is an R expression the verifier evaluates: no option, prompt or explanation states a
// number R worked out. Contexts are drawn from MASS::quine (days absent from school) and InsectSprays,
// away from the lesson's own warpbreaks, so a student who only remembers the lesson's printed numbers
// cannot coast through the bank.
import type { StatQuestion } from '../../statQuestionSchema.ts';

const questions: StatQuestion[] = [
  {
    id: 'cm-null-residual-gap',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 2,
    prompt: 'This model predicts the number of days a student was absent from school. Look at the two deviances printed at the bottom. What does the gap between them measure?',
    code: 'library(MASS)\nfit <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)\nfit\n',
    options: [
      { text: 'How much closer to a perfect fit ethnicity, sex, age group and learner status bring the model, compared with giving every student the same predicted number of days', correct: true },
      { text: 'How far this model still is from a perfect fit' },
      { text: 'The probability that none of the four predictors matter' },
      { text: 'The share of the variation in Days that the model explains' },
      { text: 'The number of students the model got exactly right' },
    ],
    explain: 'Both deviances are measured from the same perfect fit, the saturated model. The null deviance belongs to a model with an intercept only; the residual deviance belongs to this one. The gap is what the four predictors bought. The residual deviance alone is how far this model is from perfect; a deviance is not a probability or a share of variation, and it is not a count of correct predictions.',
  },
  {
    id: 'cm-nested-pair',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 3,
    prompt: 'Three models for the same esoph data (oesophageal cancer cases and controls by age group, alcohol group and tobacco group). Reading the coefficient counts above, which pair is nested?',
    code:
      'm1 <- glm(cbind(ncases, ncontrols) ~ agegp, family = binomial, data = esoph)\n' +
      'm2 <- glm(cbind(ncases, ncontrols) ~ agegp + tobgp, family = binomial, data = esoph)\n' +
      'm3 <- glm(cbind(ncases, ncontrols) ~ alcgp, family = binomial, data = esoph)\n' +
      'sapply(list(m1 = m1, m2 = m2, m3 = m3), function(m) length(coef(m)))\n',
    options: [
      { text: 'm1 and m2: setting the tobgp coefficients in m2 to zero gives m1 back', correct: true },
      { text: 'm1 and m3: both use only one predictor' },
      { text: 'm2 and m3: m3 is the simpler model' },
      { text: 'All three are nested in each other, since they use the same response' },
    ],
    explain: 'm2 is m1 with tobgp added, so fixing those extra coefficients at zero turns m2 back into m1: that is what nested means. m1 and m3 each have a predictor the other lacks, and neither is a special case of the other, so they are not nested however few predictors each has. m2 does not contain m3 either, since m2 lacks any coefficient that could be set to zero to reach m3.',
  },
  {
    id: 'cm-lrt-df',
    lessonId: 'comparing-models',
    kind: 'number',
    marks: 3,
    prompt: 'Reading the anova() table above, how many extra coefficients does adding spray to the model buy?',
    code:
      'small <- glm(count ~ 1, family = poisson, data = InsectSprays)\n' +
      'big <- glm(count ~ spray, family = poisson, data = InsectSprays)\n' +
      'anova(small, big, test = "Chisq")\n',
    answer: 'anova(small, big, test = "Chisq")$Df[2]',
    tol: 0.06,
    unit: 'coefficients',
    explain: 'The Df column of the second row counts the coefficients the bigger model has that the smaller one lacks. spray has six levels, so it contributes five coefficients beyond the shared intercept.',
  },
  {
    id: 'cm-lrt-pvalue-read',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 2,
    prompt: 'The Pr(>Chi) value in the second row is small. What does it tell you?',
    code:
      'library(MASS)\n' +
      'small <- glm(Days ~ Eth, family = poisson, data = quine)\n' +
      'big <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)\n' +
      'anova(small, big, test = "Chisq")\n',
    options: [
      { text: 'If sex, age group and learner status really added nothing beyond ethnicity, a drop in deviance this large would rarely turn up in a sample like this', correct: true },
      { text: 'There is almost no chance that those three predictors have no effect' },
      { text: 'Ethnicity alone already explains nearly all the variation in Days' },
      { text: 'The residual deviance of the bigger model is close to zero' },
    ],
    explain: 'A p-value is worked out assuming the small model is right; a small one means the data would be surprising under that assumption. It is not the probability that a hypothesis is true, it says nothing about how much of the variation is explained by ethnicity alone, and it says nothing about the size of the residual deviance itself.',
  },
  {
    id: 'cm-drop1-marginality',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 3,
    prompt: 'This table only offers to drop the interaction, not Eth or Sex on their own. Why?',
    code: 'library(MASS)\nfit <- glm(Days ~ Eth * Sex, family = poisson, data = quine)\ndrop1(fit, test = "Chisq")\n',
    options: [
      { text: 'A model that keeps the interaction but drops one of the main effects it is built from makes little sense, so drop1() only offers terms that can leave without breaking that rule', correct: true },
      { text: 'Ethnicity and sex are too clearly important for R to bother testing them' },
      { text: 'There are not enough degrees of freedom left to test more than one term' },
      { text: 'Eth and Sex were not included in the formula' },
    ],
    explain: 'This is the marginality principle: keep the main effects of any interaction that is still in the model. Only once the interaction is tested and dropped do Eth and Sex become candidates on their own. R does not pre-judge importance, and both main effects are in the formula, printed in the model summary.',
  },
  {
    id: 'cm-aic-gap',
    lessonId: 'comparing-models',
    kind: 'number',
    marks: 3,
    prompt: 'These two models are not nested, since neither is the other with some coefficients fixed at zero. Using the table above, by how much does the larger AIC exceed the smaller one? Give it to one decimal place.',
    code:
      'library(MASS)\n' +
      'm_eth <- glm(Days ~ Eth, family = poisson, data = quine)\n' +
      'm_age <- glm(Days ~ Age, family = poisson, data = quine)\n' +
      'AIC(m_eth, m_age)\n',
    answer: 'round(abs(AIC(m_eth) - AIC(m_age)), 1)',
    tol: 0.06,
    unit: 'AIC points',
    explain: 'AIC can rank two models that are not nested as long as they describe the same response on the same rows, which m_eth and m_age do. Subtract the smaller AIC from the larger to get the gap.',
  },
  {
    id: 'cm-aic-rows-warning',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 3,
    prompt: 'Both models use the formula Days ~ Age, fitted to different sets of rows. R prints a table without complaint. What is wrong with comparing these two AICs directly?',
    code:
      'library(MASS)\n' +
      'full <- glm(Days ~ Age, family = poisson, data = quine)\n' +
      'girls <- glm(Days ~ Age, family = poisson, data = subset(quine, Sex == "F"))\n' +
      'AIC(full, girls)\n',
    options: [
      { text: 'A log-likelihood adds one term per observation, so the model fitted to fewer rows tends to get a smaller AIC without fitting the shape of the data any better', correct: true },
      { text: 'AIC cannot be computed at all once a subset is used' },
      { text: 'Age is no longer a valid predictor for girls only' },
      { text: 'Poisson models cannot be compared once the data changes' },
      { text: 'The two models would need the same family to be compared, and here they do' },
    ],
    explain: 'AIC needs the same response on the same observations to be a fair comparison. Fewer rows tend to lower the AIC on their own, regardless of fit, which is exactly what makes this comparison misleading. R computes both AICs without error, Age remains a valid predictor for either group, and both models already share the Poisson family.',
  },
  {
    id: 'cm-quasi-aic-na',
    lessonId: 'comparing-models',
    kind: 'predict',
    marks: 2,
    prompt: 'What does this print?',
    code: 'qfit <- glm(count ~ spray, family = quasipoisson, data = InsectSprays)\nAIC(qfit)\n',
    choices: ['[1] NA', '[1] 342.6', 'Error in AIC(qfit) : no applicable method', '[1] 0'],
    explain: 'A quasi-Poisson fit describes only the mean and how the variance grows with it, not a full probability distribution, so it has no likelihood. Asking AIC() for it gives NA rather than a number or an error.',
  },
  {
    id: 'cm-quasi-f-vs-chisq',
    lessonId: 'comparing-models',
    kind: 'choice',
    marks: 3,
    prompt: 'The quine counts are far more spread out than a Poisson model allows. Compare the Lrn row in the two tables above. What changed?',
    code:
      'library(MASS)\n' +
      'fit <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)\n' +
      'qfit <- glm(Days ~ Eth + Sex + Age + Lrn, family = quasipoisson, data = quine)\n' +
      'drop1(fit, test = "Chisq")\n' +
      'drop1(qfit, test = "F")\n',
    options: [
      { text: 'The Deviance for Lrn is the same in both tables, but once the extra spread is allowed for, the evidence that Lrn matters is far weaker', correct: true },
      { text: 'The quasi-Poisson fit gives Lrn a smaller effect' },
      { text: 'The F test is simply less accurate than the chi-squared test' },
      { text: 'The Deviance column changes because the two models fit different means' },
    ],
    explain: 'Both fits describe the same means, so the Deviance column matches in both tables; only the yardstick the drop is measured against changes. The chi-squared test assumes a dispersion of 1, which these counts do not have, so the F test\'s p-value is the honest one, not a less accurate one.',
  },
  {
    id: 'cm-write-aic-winner',
    lessonId: 'comparing-models',
    kind: 'write',
    marks: 5,
    prompt: 'Write a function aic_winner(fit1, fit2) that takes two fitted glms describing the same response and data, and returns TRUE if fit1 has the lower (better) AIC, and FALSE otherwise.',
    run: 'function',
    fnName: 'aic_winner',
    starter: 'aic_winner <- function(fit1, fit2) {\n  # compare AIC(fit1) and AIC(fit2)\n}\n',
    solution: 'aic_winner <- function(fit1, fit2) {\n  AIC(fit1) < AIC(fit2)\n}\n',
    tests: [
      {
        id: 'quine-nested',
        label: 'quine: a small model against a bigger one that fits better',
        hidden: false,
        setup:
          'library(MASS)\n' +
          'small <- glm(Days ~ Eth, family = poisson, data = quine)\n' +
          'big <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)',
        call: 'aic_winner(small, big)',
        expect: 'local({ library(MASS); s <- glm(Days ~ Eth, family = poisson, data = quine); b <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine); AIC(s) < AIC(b) })',
      },
      {
        id: 'reversed',
        label: 'the same two models, arguments swapped',
        hidden: false,
        setup:
          'library(MASS)\n' +
          'small <- glm(Days ~ Eth, family = poisson, data = quine)\n' +
          'big <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine)',
        call: 'aic_winner(big, small)',
        expect: 'local({ library(MASS); s <- glm(Days ~ Eth, family = poisson, data = quine); b <- glm(Days ~ Eth + Sex + Age + Lrn, family = poisson, data = quine); AIC(b) < AIC(s) })',
      },
      {
        id: 'insectsprays',
        label: 'InsectSprays: spray against an intercept-only model',
        hidden: true,
        setup: 'small <- glm(count ~ 1, family = poisson, data = InsectSprays)\nbig <- glm(count ~ spray, family = poisson, data = InsectSprays)',
        call: 'aic_winner(small, big)',
        expect: 'local({ s <- glm(count ~ 1, family = poisson, data = InsectSprays); b <- glm(count ~ spray, family = poisson, data = InsectSprays); AIC(s) < AIC(b) })',
      },
      {
        id: 'nonnested',
        label: 'quine: two single-predictor models that are not nested',
        hidden: true,
        setup: 'library(MASS)\nm_eth <- glm(Days ~ Eth, family = poisson, data = quine)\nm_age <- glm(Days ~ Age, family = poisson, data = quine)',
        call: 'aic_winner(m_eth, m_age)',
        expect: 'local({ library(MASS); a <- glm(Days ~ Eth, family = poisson, data = quine); b <- glm(Days ~ Age, family = poisson, data = quine); AIC(a) < AIC(b) })',
      },
    ],
    explain: 'AIC(fit1) and AIC(fit2) each give one number, and a smaller AIC is the better fit once the number of parameters is allowed for. The comparison works whether or not the two models are nested, as long as they describe the same response on the same rows.',
  },
];

export default questions;
