// "Back to where you came from", for a question opened from a guided path.
//
// A question reached from a project build has to lead back to the build, or the guide is a one-way door
// and the student is dropped into the topic they were never browsing. Same shape as the Playground's
// return: session-scoped, validated on the way out, and cleared when it is used.
export const QUESTION_BACK_KEY = 'pyladder:question-back';

export interface QuestionReturn { href: string; label: string }

export function setQuestionReturn(back: QuestionReturn | null) {
  try {
    if (back && back.href.startsWith('#/') && back.label) {
      sessionStorage.setItem(QUESTION_BACK_KEY, JSON.stringify(back));
    } else {
      sessionStorage.removeItem(QUESTION_BACK_KEY);
    }
  } catch {
    /* storage blocked: the question simply opens without a way back */
  }
}

/** Where to return to, if the reader arrived from a guided path. */
export function questionReturn(): QuestionReturn | null {
  try {
    const raw = sessionStorage.getItem(QUESTION_BACK_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as QuestionReturn;
    // Only ever an in-app hash route: this comes from storage, which any page on this origin can write.
    if (v && typeof v.href === 'string' && v.href.startsWith('#/') && typeof v.label === 'string') {
      return { href: v.href, label: v.label.slice(0, 80) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function clearQuestionReturn() {
  try { sessionStorage.removeItem(QUESTION_BACK_KEY); } catch { /* ignore */ }
}
