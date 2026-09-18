import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-swan-river-sensors.ts';
import s2 from './s2-fringe-box-office.ts';
import s3 from './s3-reid-study-rooms.ts';
import s4 from './s4-zoo-gates.ts';
import s5 from './s5-matilda-bay-kayaks.ts';

const topic: Topic = {
  id: 'exceptions',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5],
};

export default topic;
