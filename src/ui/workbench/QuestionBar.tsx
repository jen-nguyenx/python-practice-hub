// First row of the question page (the global frame stays visible above it): "‹ Topic" back link, progress dots for
// the topic's questions (filled = attempted, check = solved, ring = current) with "Question N of M", previous/next
// icon buttons, the blue format chip and the "Report this question" flag button.
import { useEffect, useRef } from 'preact/hooks';
import type { Format, TopicId } from '../../content/ids.ts';
import { FORMAT_LABEL } from '../../content/ids.ts';
import type { QuestionStats } from '../../engine/progress.ts';
import { href } from '../../app/router.ts';
import { Icon } from '../components/Icon.tsx';
import { FlagButton } from './FlagDialog.tsx';
import { questionReturn } from './questionReturn.ts';
import { IconLink } from './Tip.tsx';
import './questionPage.css';

export interface QuestionBarProps {
  qid: string;
  topicId: TopicId;
  topicShort: string;
  questions: readonly { id: string; title: string }[];
  index: number;
  stats: Map<string, QuestionStats>;
  format: Format;
  onLeave?: () => void;
}

export type DotState = 'solved' | 'attempted' | 'new';

export function dotState(s: QuestionStats | undefined): DotState {
  if (!s) return 'new';
  if (s.solved) return 'solved';
  if (s.revealed || s.attempts > 0) return 'attempted';
  return 'new';
}

const DOT_TEXT: Record<DotState, string> = { solved: 'solved', attempted: 'attempted', new: 'not started' };

export function QuestionBar({ qid, topicId, topicShort, questions, index, stats, format, onLeave }: QuestionBarProps) {
  const back = questionReturn();
  const prev = index > 0 ? questions[index - 1] : undefined;
  const next = index >= 0 && index < questions.length - 1 ? questions[index + 1] : undefined;
  // On narrow screens the dots scroll inside their own box (the counter stays pinned), so bring the current one
  // into view. scrollLeft is set directly, so the page itself never moves.
  const dotsRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = dotsRef.current;
    const cur = list?.querySelector<HTMLElement>('.qdot.current');
    if (!list || !cur || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = Math.max(0, cur.offsetLeft - (list.clientWidth - cur.offsetWidth) / 2);
  }, [qid]);
  return (
    <div class="qrow">
      {/* A question opened from a guided path leads back to that path, not to a topic nobody was browsing. */}
      <a class="qrow-back" href={back ? back.href : href.topic(topicId)} onClick={() => onLeave?.()}>
        <Icon name="chevronLeft" size={16} />
        <span class="qrow-back-text">{back ? back.label : topicShort}</span>
      </a>
      <nav class="qrow-center" aria-label="Questions in this topic">
        <ol class="qrow-dots" ref={dotsRef}>
          {questions.map((x, i) => {
            const st = dotState(stats.get(x.id));
            const current = i === index;
            return (
              <li key={x.id}>
                <a
                  class={`qdot ${st}${current ? ' current' : ''}`}
                  href={href.question(x.id)}
                  onClick={() => onLeave?.()}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`Question ${i + 1}: ${x.title}, ${DOT_TEXT[st]}`}
                  title={`${i + 1}. ${x.title}`}
                >
                  {st === 'solved' ? <Icon name="check" size={8} /> : null}
                </a>
              </li>
            );
          })}
        </ol>
        <span class="qrow-count num">Question {index + 1} of {questions.length}</span>
      </nav>
      <div class="qrow-right">
        <span class="qrow-arrows">
          <IconLink icon="chevronLeft" label={prev ? `Previous question: ${prev.title}` : 'No previous question'} tip="Previous question · [" href={prev ? href.question(prev.id) : undefined} />
          <IconLink icon="chevronRight" label={next ? `Next question: ${next.title}` : 'No next question'} tip="Next question · ]" href={next ? href.question(next.id) : undefined} align="end" />
        </span>
        <span class="format-chip"><span class="format-dot" aria-hidden="true" />{FORMAT_LABEL[format]}</span>
        <FlagButton qid={qid} variant="icon" />
      </div>
    </div>
  );
}
