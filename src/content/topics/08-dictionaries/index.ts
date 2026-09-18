import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-cafe-stock.ts';
import s2 from './s2-smartrider-taps.ts';
import s3 from './s3-scorchers-rankings.ts';
import s4 from './s4-lab-marks.ts';
import s5 from './s5-wildflower-survey.ts';
import s6 from './s6-radio-requests.ts';

const topic: Topic = {
  id: 'dictionaries',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
};

export default topic;
