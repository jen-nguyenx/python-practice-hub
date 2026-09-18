// Topic 06: lists, tuples and sorting.
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-stadium.ts';
import s2 from './s2-weather.ts';
import s3 from './s3-uwa.ts';
import s4 from './s4-scorchers.ts';
import s5 from './s5-swim-squad.ts';
import s6 from './s6-rottnest-ferry.ts';

const topic: Topic = {
  id: 'lists-tuples',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
};

export default topic;
