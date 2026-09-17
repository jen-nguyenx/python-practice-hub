// Topic 01: variables, types and expressions.
import type { Topic } from '../../schema.ts';
import { cheatsheet, commonMistakes, workedExample } from './cheatsheet.ts';
import s1 from './s1-rottnest-ferry.ts';
import s2 from './s2-smartrider-kiosk.ts';
import s3 from './s3-kings-park-run.ts';
import s4 from './s4-uwa-parking.ts';

const topic: Topic = {
  id: 'variables-expressions',
  cheatsheet,
  workedExample,
  commonMistakes,
  scenarios: [s1, s2, s3, s4],
};

export default topic;
