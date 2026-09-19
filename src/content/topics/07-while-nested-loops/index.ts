// Topic 07: while loops, nested loops and series.
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import { experiments } from './experiments.ts';
import s1 from './s1-zoo-gates.ts';
import s2 from './s2-observatory.ts';
import s3 from './s3-fremantle-markets.ts';
import s4 from './s4-rain-gauge.ts';
import s5 from './s5-rottnest-ferry.ts';
import s6 from './s6-theatre-seats.ts';

const topic: Topic = {
  id: 'while-nested-loops',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
  experiments,
};

export default topic;
