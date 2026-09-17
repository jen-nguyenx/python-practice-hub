// Topic 05: Strings. Indexing and slicing, methods, building strings in loops, case-insensitive comparison.
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-unit-codes.ts';
import s2 from './s2-smartrider.ts';
import s3 from './s3-scorchers.ts';
import s4 from './s4-kings-park-hunt.ts';

const topic: Topic = {
  id: 'strings',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4],
};

export default topic;
