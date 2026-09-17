// Focused question bar (56px) that replaces the global top bar on question pages: "‹ Ladder | Topic" back links,
// progress dots for the topic's questions with small previous/next controls and "Question N of M", then the
// format pill and "Save & exit" (drafts save as you type; it returns to the topic page).
import type { Format, TopicId } from '../../content/ids.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';
import type { QuestionStats } from '../../engine/progress.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { Tip } from './Tip.tsx';
import './questionPage.css';

export interface QuestionBarProps {
  topicId: TopicId;
  topicShort: string;
  questions: readonly { id: string; title: string }[];
  index: number;
  stats: Map<string, QuestionStats>;
  format: Format;
  onExit?: () => void;
}

function dotState(s: QuestionStats | undefined): { cls: string; text: string } {
  if (!s) return { cls: '', text: 'not started' };
  if (s.solved) return { cls: 'done', text: 'solved' };
  if (s.revealed) return { cls: 'done', text: 'answer seen' };
  if (s.attempts > 0) return { cls: 'done', text: 'attempted' };
  return { cls: '', text: 'not started' };
}

export function QuestionBar({ topicId, topicShort, questions, index, stats, format, onExit }: QuestionBarProps) {
  const prev = index > 0 ? questions[index - 1] : undefined;
  const next = index >= 0 && index < questions.length - 1 ? questions[index + 1] : undefined;
  return (
    <header class="qbar">
      <nav class="qbar-left" aria-label="Back">
        <a class="qbar-back" href={href.landing()}><Icon name="chevronLeft" size={16} /> Ladder</a>
        <span class="qbar-sep" aria-hidden="true" />
        <a class="qbar-topic" href={href.topic(topicId)}>{topicShort}</a>
      </nav>
      <nav class="qbar-center" aria-label="Questions in this topic">
        <NavArrow dir="prev" target={prev} />
        <ol class="qbar-dots">
          {questions.map((x, i) => {
            const st = dotState(stats.get(x.id));
            const current = i === index;
            return (
              <li key={x.id}>
                <a
                  class={`qbar-dot${st.cls ? ' ' + st.cls : ''}${current ? ' current' : ''}`}
                  href={href.question(x.id)}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Question ${i + 1}: ${x.title}, ${st.text}`}
                  title={`${i + 1}. ${x.title}`}
                />
              </li>
            );
          })}
        </ol>
        <NavArrow dir="next" target={next} />
        <span class="qbar-count num">Question {index + 1} of {questions.length}</span>
      </nav>
      <div class="qbar-right">
        <span class="format-pill">{FORMAT_LABEL[format]}</span>
        <a class="qbar-exit" href={href.topic(topicId)} onClick={() => onExit?.()}>Save &amp; exit</a>
      </div>
    </header>
  );
}

function NavArrow({ dir, target }: { dir: 'prev' | 'next'; target?: { id: string; title: string } }) {
  const label = dir === 'prev' ? 'Previous question' : 'Next question';
  const keys = dir === 'prev' ? '[' : ']';
  const icon = dir === 'prev' ? 'chevronLeft' : 'chevronRight';
  if (!target) {
    return <span class="qbar-arrow disabled" aria-hidden="true"><Icon name={icon} size={16} /></span>;
  }
  return (
    <Tip text={`${label} · ${keys}`} side="bottom">
      {(id) => (
        <a class="qbar-arrow" href={href.question(target.id)} aria-label={`${label}: ${target.title}`} aria-describedby={id} aria-keyshortcuts={keys}>
          <Icon name={icon} size={16} />
        </a>
      )}
    </Tip>
  );
}
