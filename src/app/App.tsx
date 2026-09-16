// App shell: header, navigation, route switch. Owner: shell agent (may restyle; keep route wiring).
import { route, href } from './router.ts';
import { Landing } from '../ui/screens/Landing.tsx';
import { TopicPage } from '../ui/screens/TopicPage.tsx';
import { QuestionPage } from '../ui/screens/QuestionPage.tsx';
import { Playground } from '../ui/screens/Playground.tsx';
import { Report } from '../ui/screens/Report.tsx';
import { TopicTest } from '../ui/screens/TopicTest.tsx';
import { MidsemTest } from '../ui/screens/MidsemTest.tsx';
import { Settings } from '../ui/screens/Settings.tsx';

export function App() {
  const r = route.value;
  let screen;
  switch (r.name) {
    case 'landing': screen = <Landing />; break;
    case 'topic': screen = <TopicPage topicId={r.topicId} />; break;
    case 'question': screen = <QuestionPage qid={r.qid} />; break;
    case 'playground': screen = <Playground />; break;
    case 'report': screen = <Report topicId={r.topicId} />; break;
    case 'topic-test': screen = <TopicTest topicId={r.topicId} />; break;
    case 'midsem': screen = <MidsemTest />; break;
    case 'settings': screen = <Settings />; break;
    default: screen = <div class="empty-state">Page not found. <a href={href.landing()}>Back to topics</a></div>;
  }
  return (
    <div class="app">
      <header class="app-header">
        <a class="app-logo" href={href.landing()}>Py<span>Ladder</span></a>
        <nav class="app-nav" aria-label="Main">
          <a href={href.landing()}>Topics</a>
          <a href={href.playground()}>Playground</a>
          <a href={href.midsem()}>Mid-sem test</a>
          <a href={href.report()}>Report</a>
          <a href={href.settings()}>Settings</a>
        </nav>
      </header>
      <main class="app-main" id="main">{screen}</main>
    </div>
  );
}
