// App: route switch inside the frame (AppShell: global top bar, main landmark, tour, shortcut sheet).
import { route, href } from './router.ts';
import { Landing } from '../ui/screens/Landing.tsx';
import { TopicPage } from '../ui/screens/TopicPage.tsx';
import { QuestionPage } from '../ui/screens/QuestionPage.tsx';
import { Playground } from '../ui/screens/Playground.tsx';
import { Report } from '../ui/screens/Report.tsx';
import { TopicTest } from '../ui/screens/TopicTest.tsx';
import { ExamPractice } from '../ui/screens/ExamPractice.tsx';
import { Settings } from '../ui/screens/Settings.tsx';
import { AppShell } from '../ui/shell/AppShell.tsx';

export function App() {
  const r = route.value;
  let screen;
  switch (r.name) {
    case 'landing': screen = <Landing />; break;
    case 'topic': screen = <TopicPage key={r.topicId} topicId={r.topicId} />; break;
    case 'question': screen = <QuestionPage qid={r.qid} />; break;
    case 'playground': screen = <Playground />; break;
    case 'report': screen = <Report topicId={r.topicId} />; break;
    case 'topic-test': screen = <TopicTest topicId={r.topicId} />; break;
    case 'exam': screen = <ExamPractice />; break;
    case 'settings': screen = <Settings />; break;
    default:
      screen = (
        <div class="page page-narrow notfound-page">
          <h1>Page not found</h1>
          <p class="notfound-text">That link doesn't match anything in PyLadder.</p>
          <p><a class="btn primary" href={href.landing()}>Back to topics</a></p>
        </div>
      );
  }
  return <AppShell route={r}>{screen}</AppShell>;
}
