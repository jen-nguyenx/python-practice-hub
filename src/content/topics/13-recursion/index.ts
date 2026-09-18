import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-skyworks.ts';
import s2 from './s2-smartrider-digits.ts';
import s3 from './s3-guild-puzzle-night.ts';
import s4 from './s4-quokka-survey.ts';
import s5 from './s5-showbags.ts';
import s6 from './s6-exam-practice.ts';

const topic: Topic = {
  id: 'recursion',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4, s5, s6],
};

export default topic;
