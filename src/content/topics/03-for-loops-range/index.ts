// Topic 03: for loops and range().
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import { experiments } from './experiments.ts';
import s1 from './s1-jacobs-ladder.ts';
import s2 from './s2-transperth-timetable.ts';
import s3 from './s3-heatwave-week.ts';
import s4 from './s4-quokka-colony.ts';
import s5 from './s5-fremantle-markets.ts';
import s6 from './s6-reid-library.ts';

const topic: Topic = {
  id: 'for-loops-range',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
  experiments,
};

export default topic;
