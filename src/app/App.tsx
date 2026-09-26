// App: route switch inside the frame (AppShell: global top bar, main landmark, tour, shortcut sheet).
import { route, href } from './router.ts';
import { Landing } from '../ui/screens/Landing.tsx';
import { LessonReader } from '../ui/screens/LessonReader.tsx';
import { TopicLesson } from '../ui/screens/TopicLesson.tsx';
import { LessonsIndex } from '../ui/screens/LessonsIndex.tsx';
import { DecodeError } from '../ui/screens/DecodeError.tsx';
import { ExamPlan } from '../ui/screens/ExamPlan.tsx';
import { Glossary } from '../ui/screens/Glossary.tsx';
import { Placement } from '../ui/screens/Placement.tsx';
import { ProjectBuild } from '../ui/screens/ProjectBuild.tsx';
import { Revision } from '../ui/screens/Revision.tsx';
import { Reference } from '../ui/screens/Reference.tsx';
import { Review } from '../ui/screens/Review.tsx';
import { TopicPage } from '../ui/screens/TopicPage.tsx';
import { QuestionPage } from '../ui/screens/QuestionPage.tsx';
import { Playground } from '../ui/screens/Playground.tsx';
import { RPlayground } from '../ui/screens/RPlayground.tsx';
import { StatExams } from '../ui/screens/StatExams.tsx';
import { StatQuiz } from '../ui/screens/StatQuiz.tsx';
import { store } from './services.ts';
import { unitOf } from '../content/units.ts';
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
    case 'lesson': screen = <TopicLesson key={r.topicId} topicId={r.topicId} />; break;
    case 'lessons': screen = <LessonsIndex />; break;
    case 'lesson-read': screen = <LessonReader key={r.lessonId} lessonId={r.lessonId} />; break;
    case 'question': screen = <QuestionPage qid={r.qid} />; break;
    case 'playground': screen = <Playground />; break;
    case 'r-playground': screen = <RPlayground />; break;
    case 'report': screen = <Report topicId={r.topicId} />; break;
    case 'review': screen = <Review />; break;
    case 'decode': screen = <DecodeError />; break;
    case 'reference': screen = <Reference />; break;
    case 'plan': screen = <ExamPlan />; break;
    case 'placement': screen = <Placement />; break;
    case 'glossary': screen = <Glossary />; break;
    case 'revision': screen = <Revision />; break;
    case 'build': screen = <ProjectBuild key={r.scenarioId} scenarioId={r.scenarioId} />; break;
    case 'topic-test': screen = <TopicTest topicId={r.topicId} />; break;
    // One Exams door, two papers behind it: CITS1401's Python bank or STAT2402's R one.
    case 'exam': screen = unitOf(store.settings.value) === 'stat2402' ? <StatExams /> : <ExamPractice />; break;
    case 'stat-quiz': screen = <StatQuiz key={r.lessonId} lessonId={r.lessonId} />; break;
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
