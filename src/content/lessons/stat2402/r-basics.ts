// R for this unit: the first lesson of the STAT2402 path, for a student who may never have typed R.
//
// Everything later in the track reads R output and writes a few lines of R, so this lesson covers only
// what those need: the console and `<-`, vectors, indexing, data frames, factors (and why the first level
// is the baseline every model compares against), missing values, reading data and group summaries.
// As in every R lesson, each output under a block was printed by R when the verifier ran it; the prose
// points at the output and never types a value R worked out.
import type { Lesson } from '../../lessonSchema.ts';

const lesson: Lesson = {
  id: 'r-basics',
  title: 'R for this unit: vectors, data frames and factors',
  summary: 'The R every later lesson leans on: the console, vectors, data frames, factors and their baseline, missing values and group summaries',
  track: 'stat2402',
  order: 1,
  minutes: 18,
  outcomes: [
    'Store values with `<-` and do arithmetic on a whole vector at once',
    'Pick out values by position, by condition and by column name with `[ ]` and `$`',
    'Look inside a data frame with `head()`, `str()` and `summary()`, and keep only the rows you want',
    'Say what a factor\'s levels are, and why the first level becomes the baseline of a model',
    'Deal with missing values using `is.na()`, `na.rm = TRUE` and `na.omit()`',
    'Read data with `read.csv()` and summarise it group by group with `tapply()`',
  ],
  sections: [
    {
      id: 'console',
      title: 'Typing at the console',
      blocks: [
        {
          kind: 'prose',
          body:
            'Every lesson after this one hands you R output to read and asks you to write a few lines of R. This lesson is the R those need, and nothing more.\n\n' +
            'In RStudio, the **console** is the pane where you type a line and press Enter. R works it out and prints the answer underneath. What you see under each block in these lessons was printed by R in exactly that way.',
        },
        {
          kind: 'shell',
          lines: [
            '2 + 3 * 4',
            'sqrt(16)',
            'x <- 7',
            'x',
            'x * 2',
            'y <- x + 1',
            'y',
          ],
          caption: 'A line that stores a value prints nothing. Typing a name on its own prints what it holds.',
        },
        {
          kind: 'prose',
          body:
            '`<-` stores a value under a name: read `x <- 7` as "x gets 7". From then on `x` stands for that value, until you give it a new one. RStudio types `<-` for you when you press **Alt** and **-** together (**Option** and **-** on a Mac).\n\n' +
            'The `[1]` at the start of each answer is R numbering the values it prints: the line starts with value number 1. It matters once an answer runs to more than one line.',
        },
        {
          kind: 'quiz',
          prompt: 'You type `total <- 5 + 5` at the console and press Enter. What happens?',
          options: [
            { text: 'R works out the sum, stores it under the name `total`, and prints nothing', correct: true, why: 'Assigning is silent. Type `total` on its own afterwards to see what it holds.' },
            { text: 'R prints the sum and stores nothing', why: 'That is what `5 + 5` on its own does. The `<-` is what makes R keep the answer.' },
            { text: 'R checks whether `total` is equal to 5 + 5', why: 'Checking equality is `==`, as in `total == 5 + 5`. `<-` stores a value; it does not compare.' },
            { text: 'R stops with an error, because `total` does not exist yet', why: 'Assigning to a name is how it comes to exist. Only reading a name that was never assigned is an error.' },
          ],
        },
      ],
    },
    {
      id: 'vectors',
      title: 'Vectors and functions',
      blocks: [
        {
          kind: 'prose',
          body:
            'R\'s basic object is the **vector**: several values of the same kind, in order. `c()` (for "combine") builds one. A single number is a vector too, of length one, which is why it printed with `[1]`.\n\n' +
            'Arithmetic on a vector works on every value at once, so there is no need for a loop. Functions such as `mean()`, `sd()` (standard deviation) and `summary()` take the whole vector and describe it.',
        },
        {
          kind: 'shell',
          lines: [
            'breaks <- c(26, 30, 54, 25, 70)',
            'length(breaks)',
            'breaks + 1',
            'breaks / 10',
            'mean(breaks)',
            'sd(breaks)',
            'summary(breaks)',
          ],
          caption: '`summary()` gives the smallest value, the quartiles, the median, the mean and the largest value.',
        },
        {
          kind: 'predict',
          code: 'x <- c(5, 10, 15)\nx - mean(x)\n',
          ask: '`mean(x)` is one number. What happens when you take it away from a vector of three?',
          choices: [
            '[1] -5  0  5',
            '[1] 0',
            '[1]  5 10 15',
            '[1] 20',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'The vector `breaks` holds five numbers. What does `breaks * 2` give?',
          options: [
            { text: 'Five numbers, each one doubled', correct: true, why: 'Arithmetic works value by value, and the 2 is used for each of the five.' },
            { text: 'One number: twice the total', why: 'That would be `2 * sum(breaks)`. On its own, `*` keeps every value separate.' },
            { text: 'Ten numbers: the vector repeated twice', why: 'That is `rep(breaks, times = 2)`. Multiplying changes the values, not how many there are.' },
            { text: 'An error, because a vector needs a loop', why: 'Working on a whole vector at once is what R is built for; a loop is rarely needed.' },
          ],
        },
        {
          kind: 'prose',
          body:
            'The values you hand a function are its **arguments**. Each one has a name, and you can give them by name with `=` inside the brackets. Named arguments can come in any order, and they make a line say what it means: `round(x, digits = 1)` reads better than `round(x, 1)`.\n\n' +
            'Arguments without names are matched by position, in the order the function lists them. In RStudio, `?round` opens the help page that gives that order.',
        },
        {
          kind: 'shell',
          lines: [
            'x <- c(2.567, 3.141, 10.5)',
            'round(x, digits = 1)',
            'round(digits = 1, x = x)',
            'seq(from = 0, to = 20, by = 5)',
            'seq(0, 20, 5)',
            'rep("A", times = 3)',
          ],
          caption: 'The two `round()` lines ask for the same thing, and so do the two `seq()` lines: by name, or by position.',
        },
        {
          kind: 'match',
          ask: 'Match each call to what it asks for.',
          pairs: [
            { left: 'round(x, digits = 2)', right: 'each value of x to two decimal places' },
            { left: 'seq(from = 1, to = 9, by = 2)', right: 'from 1 up to 9, in steps of 2' },
            { left: 'rep("B", times = 4)', right: 'the letter B four times over' },
            { left: 'mean(x, na.rm = TRUE)', right: 'the average of x, leaving out missing values' },
          ],
        },
      ],
    },
    {
      id: 'indexing',
      title: 'Picking values out',
      blocks: [
        {
          kind: 'prose',
          body:
            'Square brackets pick values out of a vector. Inside them you can put a position, several positions, a minus sign to leave positions out, or a **condition**: a comparison that is `TRUE` or `FALSE` for each value, which keeps the values where it is `TRUE`.',
        },
        {
          kind: 'shell',
          lines: [
            'breaks <- c(26, 30, 54, 25, 70)',
            'breaks[1]',
            'breaks[c(2, 4)]',
            'breaks[-1]',
            'breaks > 28',
            'breaks[breaks > 28]',
            'sum(breaks > 28)',
          ],
          caption: 'A condition gives one `TRUE` or `FALSE` per value. Put it inside the brackets to keep the `TRUE` ones.',
        },
        {
          kind: 'callout',
          tone: 'note',
          title: 'If you have used Python',
          body:
            'R counts from 1, not 0: `x[1]` is the first value. And a minus sign leaves a value out rather than counting from the end, so `x[-1]` is everything except the first value.',
        },
        {
          kind: 'predict',
          code: 'x <- c(8, 3, 12, 5)\nx[c(1, 3)]\n',
          ask: 'What does this print?',
          choices: [
            '[1]  8 12',
            '[1] 3 5',
            '[1]  8  3 12',
          ],
        },
        {
          kind: 'quiz',
          prompt: 'Why does `sum(breaks > 28)` give a count of values, not a total of them?',
          options: [
            { text: 'In arithmetic, `TRUE` counts as 1 and `FALSE` as 0, so the sum is the number of `TRUE`s', correct: true, why: 'This is the quickest way to count how many values meet a condition, and you will see it often.' },
            { text: 'Because `sum()` always counts its values', why: '`sum(breaks)` adds the values up. It is the `TRUE`/`FALSE` vector inside that makes this a count.' },
            { text: 'It does not: it adds up the values above 28', why: 'That would be `sum(breaks[breaks > 28])`, which picks the values out first and then adds them.' },
          ],
        },
      ],
    },
    {
      id: 'data-frames',
      title: 'Data frames',
      blocks: [
        {
          kind: 'prose',
          body:
            'A **data frame** is R\'s table: one row per observation, one column per variable, and each column a vector of the same length. Nearly every data set in the unit arrives as one. `mtcars`, which comes with R, has one row per car, for a range of cars from the 1970s.',
        },
        {
          kind: 'shell',
          lines: [
            'head(mtcars, 3)',
            'nrow(mtcars)',
            'names(mtcars)',
            'str(mtcars[, 1:4])',
          ],
          caption: '`head()` shows the first rows, `nrow()` counts them, `names()` lists the columns, and `str()` gives each column\'s type and first few values.',
        },
        {
          kind: 'prose',
          body:
            '`$` takes one column out as a vector: `mtcars$mpg`. Square brackets work on a data frame too, with two parts: **`df[rows, columns]`**. Before the comma picks rows, after it picks columns, and leaving one side empty means "all of them". `subset()` does the same job in words.',
        },
        {
          kind: 'shell',
          lines: [
            'mtcars$mpg[1:5]',
            'mtcars[1:3, c("mpg", "wt")]',
            'mtcars[mtcars$mpg > 30, c("mpg", "hp")]',
            'subset(mtcars, mpg > 30, select = c(mpg, hp))',
          ],
          caption: 'The last two lines ask for the same rows and columns. `subset()` lets you name the columns without `mtcars$` in front.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'which-rows-survive',
            title: 'Which cars survive the subset?',
            intro: 'Choose a condition. `subset()` keeps the rows where it is `TRUE`. Watch how many cars are left, what they look like, and how many of each engine size remain.',
            template:
              'kept <- subset(mtcars, ⟦cond⟧, select = c(mpg, cyl, hp, wt))\n' +
              'nrow(kept)\n' +
              'head(kept, 4)\n' +
              'summary(kept$mpg)\n',
            knobs: [
              {
                id: 'cond',
                label: 'the cars to keep',
                choices: [
                  { value: 'am == 1', caption: 'manual gearbox' },
                  { value: 'mpg > 25', caption: 'more than 25 mpg' },
                  { value: 'hp > 200', caption: 'over 200 horsepower' },
                  { value: 'wt < 3 & hp > 100', caption: 'light and powerful' },
                ],
              },
            ],
            probes: {
              counts: 'as.vector(table(factor(kept$cyl, levels = c(4, 6, 8))))',
              engines: 'c("4 cylinders", "6 cylinders", "8 cylinders")',
            },
            visual: {
              kind: 'bars',
              values: 'counts',
              labels: 'engines',
              caption: 'How many of the cars left have each engine size.',
            },
            takeaway:
              'The condition is checked row by row, and only the rows where it is `TRUE` are kept; with `&`, both parts must be `TRUE`. Check `nrow()` after every subset: a condition that keeps no rows, or every row, usually has a typo in it.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'What does `mtcars[mtcars$cyl == 4, ]` give, with nothing after the comma?',
          options: [
            { text: 'Every column, for the cars with four cylinders', correct: true, why: 'An empty side of the comma means "all of them". Here the rows are chosen and the columns are not.' },
            { text: 'No columns at all', why: 'Empty means no restriction, not nothing. To keep no columns you would have to ask for that on purpose.' },
            { text: 'An error, because the columns must be named', why: 'Either side of the comma may be left empty. Leaving out the comma itself is what changes the meaning.' },
            { text: 'The `cyl` column only', why: 'The condition uses `cyl` to choose rows; it does not choose columns. The columns come after the comma.' },
          ],
        },
      ],
    },
    {
      id: 'factors',
      title: 'Factors and the baseline',
      blocks: [
        {
          kind: 'prose',
          body:
            'A variable that sorts observations into groups, such as a spray, a gearbox type or a tension setting, is stored as a **factor**: values drawn from a fixed set of **levels**. `warpbreaks` counts the breaks in lengths of yarn woven at three tensions: `L`, `M` and `H`.\n\n' +
            'Factors matter because of what models do with them. A model in this unit compares every level of a factor with **one baseline level, and the baseline is whichever level comes first**. So the order of the levels decides what every coefficient means.',
        },
        {
          kind: 'shell',
          lines: [
            'str(warpbreaks)',
            'levels(warpbreaks$tension)',
            'table(warpbreaks$tension)',
            'f <- factor(c("low", "high", "medium", "high"))',
            'levels(f)',
            'f2 <- factor(c("low", "high", "medium", "high"), levels = c("low", "medium", "high"))',
            'levels(f2)',
          ],
          caption: '`table()` counts how many observations are at each level. Look at the order `factor()` chose for `f` when it was given no `levels`, and the order it kept for `f2`.',
        },
        {
          kind: 'prose',
          body:
            'Without `levels =`, `factor()` puts the levels in alphabetical order, which is rarely the order that means something. `relevel(f, ref = "...")` moves one level to the front and leaves the rest as they were. Try it on the tension.',
        },
        {
          kind: 'interactive',
          experiment: {
            id: 'first-level-baseline',
            title: 'Which tension is the baseline?',
            intro: 'Choose the level to put first. The output shows the new order of the levels, the table a model builds from the factor (one column for each level except the baseline), the mean breaks at each tension, and each mean minus the baseline\'s.',
            template:
              'wb <- warpbreaks\n' +
              'wb$tension <- relevel(wb$tension, ref = "⟦ref⟧")\n' +
              'levels(wb$tension)\n' +
              'contrasts(wb$tension)\n' +
              'means <- tapply(wb$breaks, wb$tension, mean)\n' +
              'round(means, 2)\n' +
              'round(means - means[1], 2)\n',
            knobs: [
              {
                id: 'ref',
                label: 'the level that comes first',
                choices: [
                  { value: 'L', caption: 'L, low (the default)' },
                  { value: 'M', caption: 'M, medium' },
                  { value: 'H', caption: 'H, high' },
                ],
              },
            ],
            probes: {
              gap: 'unname(round((means - means[1])[c("L", "M", "H")], 2))',
              tension: 'c("L", "M", "H")',
            },
            visual: {
              kind: 'bars',
              values: 'gap',
              labels: 'tension',
              caption: 'Each tension\'s mean breaks minus the baseline\'s. The baseline\'s own bar is 0.',
            },
            takeaway:
              'The mean at each tension never changes, only the order it is listed in. What changes is the comparison: every difference is measured from the level that comes first. A model\'s coefficients for a factor are comparisons of exactly this kind, so put first the level you want the others compared with, such as a control group, and say which one it is.',
          },
        },
        {
          kind: 'quiz',
          prompt: 'A trial stores its groups as a factor with the levels `drugA`, `drugB` and `placebo`, in that order. Why might you run `relevel(group, ref = "placebo")` before fitting a model?',
          options: [
            { text: 'So that each drug is compared with the placebo, which is the comparison the trial is about', correct: true, why: 'The first level is the baseline. With the placebo first, each drug\'s coefficient says how it differs from no drug at all.' },
            { text: 'So that the model fits the data better', why: 'The fit is the same whichever level is first, in the same way the group means above never changed. Only the comparisons the output reports change.' },
            { text: 'Because R cannot fit a model unless the levels are in alphabetical order', why: 'Any order works. Alphabetical is only what `factor()` does when you do not choose.' },
            { text: 'To leave the placebo group out of the data', why: '`relevel()` changes the order of the levels, not which rows are there. Leaving rows out is a job for `subset()`.' },
          ],
        },
      ],
    },
    {
      id: 'missing-values',
      title: 'Missing values',
      blocks: [
        {
          kind: 'prose',
          body:
            'Real data has gaps: a reading that was not taken, a question left blank. R marks each one `NA`, for "not available". A total or an average with an `NA` in it is `NA` as well, because the answer depends on the value nobody knows. The second-last line below goes wrong on purpose.',
        },
        {
          kind: 'shell',
          lines: [
            'oz <- c(41, 36, NA, 18)',
            'mean(oz)',
            'is.na(oz)',
            'sum(is.na(oz))',
            'mean(oz, TRUE)',
            'mean(oz, na.rm = TRUE)',
          ],
          caption: '`na.rm = TRUE` means "remove the NAs first". Given without its name, the `TRUE` went to `mean()`\'s second argument, which is a different one (`trim`), and R stopped.',
        },
        {
          kind: 'prose',
          body:
            '`airquality`, which comes with R, has daily air quality readings from New York in 1973, and some of its columns have gaps. `na.omit()` drops every row that has a missing value anywhere in it.',
        },
        {
          kind: 'code',
          code: 'summary(airquality$Ozone)\ncolSums(is.na(airquality))\nnrow(airquality)\nnrow(na.omit(airquality))\n',
          caption: 'When a column has gaps, `summary()` adds a column at the end counting them. `colSums(is.na(df))` counts the gaps in every column at once.',
        },
        {
          kind: 'quiz',
          prompt: 'Compare the two `nrow()` lines with the number of missing ozone readings. Which rows did `na.omit(airquality)` drop?',
          options: [
            { text: 'Every row with a missing value in any column', correct: true, why: 'Some days are missing a solar reading but not an ozone one, so more rows go than the ozone count alone.' },
            { text: 'Only the rows where `Ozone` is missing', why: 'Then the drop would equal the ozone count exactly. `na.omit()` looks at every column.' },
            { text: 'The columns that have any missing values', why: '`na.omit()` works on rows. Every column is still there afterwards; check with `names()`.' },
          ],
        },
        {
          kind: 'callout',
          tone: 'warn',
          title: 'Models drop incomplete rows too',
          body:
            '`lm()` and `glm()` leave out any row with a missing value in the variables they use, without stopping. Check how many rows a model really used, for instance with `nobs(fit)`, before you describe it as a model of the whole data set.',
        },
      ],
    },
    {
      id: 'reading-data',
      title: 'Reading and grouping data',
      blocks: [
        {
          kind: 'prose',
          body:
            'In RStudio you read a data file with **`read.csv("file.csv")`**, which gives back a data frame. There are no files in the R these lessons run, so the example below hands `read.csv()` the same kind of text through `text =`. Everything after the reading works the same way on a file.',
        },
        {
          kind: 'code',
          code:
            'plots <- read.csv(text = "field,spray,count\n1,A,10\n2,B,11\n3,A,7\n4,C,2\n5,B,17\n6,C,1")\n' +
            'str(plots)\n' +
            'plots$spray <- factor(plots$spray)\n' +
            'levels(plots$spray)\n',
          caption: 'Look at the type `str()` gives `spray`: `read.csv()` reads text as text, so turn a grouping column into a factor yourself.',
        },
        {
          kind: 'prose',
          body:
            '`tapply(values, groups, f)` splits `values` by `groups` and applies `f` to each group: the mean count for each spray, the median breaks at each tension. Anything after `f` is handed on to it, which is how `na.rm = TRUE` reaches `mean()`.',
        },
        {
          kind: 'shell',
          lines: [
            'tapply(warpbreaks$breaks, warpbreaks$tension, mean)',
            'tapply(warpbreaks$breaks, warpbreaks$tension, median)',
            'tapply(InsectSprays$count, InsectSprays$spray, max)',
            'tapply(airquality$Ozone, airquality$Month, mean)',
            'tapply(airquality$Ozone, airquality$Month, mean, na.rm = TRUE)',
          ],
          caption: 'The groups come out in the order of the factor\'s levels. The fourth line shows what missing values do: a month with even one gap gets an average of `NA`.',
        },
        {
          kind: 'quiz',
          prompt: 'Which line gives the average ozone reading for each month, leaving out the missing ones?',
          options: [
            { text: '`tapply(airquality$Ozone, airquality$Month, mean, na.rm = TRUE)`', correct: true, why: 'Values first, then the groups, then the function, then anything the function needs.' },
            { text: '`tapply(airquality$Month, airquality$Ozone, mean, na.rm = TRUE)`', why: 'The first two are swapped: this averages the month numbers for each distinct ozone reading.' },
            { text: '`mean(airquality$Ozone, na.rm = TRUE)`', why: 'That is one average over the whole summer, not one per month.' },
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
            'Write a function `count_missing(df)` that returns how many missing values each column of the data frame `df` holds: one number per column, in the order of the columns. `is.na()` works on a whole data frame at once.',
          run: 'function',
          fnName: 'count_missing',
          starter: 'count_missing <- function(df) {\n  # one number per column: how many NAs it holds\n}\n',
          solution: 'count_missing <- function(df) {\n  colSums(is.na(df))\n}\n',
          tests: [
            { id: 'small', label: 'a small data frame built by hand', hidden: false, call: 'count_missing(data.frame(a = c(1, NA, 3), b = c(NA, NA, 6)))', expect: 'c(a = 1, b = 2)' },
            { id: 'airquality', label: 'the airquality data', hidden: false, call: 'count_missing(airquality)', expect: 'sapply(airquality, function(column) sum(is.na(column)))' },
            { id: 'none', label: 'a data frame with nothing missing', hidden: true, call: 'count_missing(warpbreaks)', expect: 'c(breaks = 0, wool = 0, tension = 0)' },
          ],
          hint: '`is.na(df)` gives a `TRUE` for every missing cell, and `colSums()` adds up each column, counting `TRUE` as 1.',
        },
      ],
    },
  ],
};

export default lesson;
