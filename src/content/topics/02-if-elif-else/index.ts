// Topic 02: If, elif, else and Boolean logic.
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-uwa-grades.ts';
import s2 from './s2-heat-warnings.ts';
import s3 from './s3-cottesloe-swim.ts';
import s4 from './s4-transperth-fares.ts';
import s5 from './s5-scorchers-chase.ts';
import s6 from './s6-airport-bag-drop.ts';

const topic: Topic = {
  id: 'if-elif-else',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
};

export default topic;
