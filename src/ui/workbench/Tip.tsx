// Small hover/focus tooltip and a square icon button that carries one. The bubble is CSS-only (shown while the
// wrapper is hovered or holds keyboard focus), so it never steals focus. Pass `describe` when the tooltip adds
// information beyond the control's accessible name (it is then linked with aria-describedby).
import type { ComponentChildren, JSX } from 'preact';
import { useId } from 'preact/hooks';
import { Icon } from '../components/Icon.tsx';
import type { IconName } from '../components/Icon.tsx';
import './workbench.css';

export type TipSide = 'top' | 'bottom';
export type TipAlign = 'center' | 'start' | 'end';

export function Tip({ text, children, side = 'top', align = 'center', class: cls }: { text: ComponentChildren; children: (describedBy: string) => ComponentChildren; side?: TipSide; align?: TipAlign; class?: string }) {
  const id = useId();
  return (
    <span class={`tip${cls ? ' ' + cls : ''}`} data-side={side} data-align={align}>
      {children(id)}
      <span class="tip-bubble" role="tooltip" id={id}>{text}</span>
    </span>
  );
}

export interface IconButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'icon' | 'label'> {
  icon: IconName;
  /** Accessible name, also shown as the tooltip unless `tip` is given. */
  label: string;
  /** Tooltip text when it should say more than the label (linked with aria-describedby). */
  tip?: string;
  side?: TipSide;
  align?: TipAlign;
  size?: 'sm' | 'md';
  iconClass?: string;
  disabled?: boolean;
  pressed?: boolean;
}

export function IconButton({ icon, label, tip, side = 'top', align = 'center', size = 'md', iconClass, class: cls, pressed, ...rest }: IconButtonProps) {
  return (
    <Tip text={tip ?? label} side={side} align={align}>
      {(id) => (
        <button
          type="button"
          class={`wb-icon-btn${size === 'sm' ? ' sm' : ''}${cls ? ' ' + cls : ''}`}
          aria-label={label}
          aria-describedby={tip ? id : undefined}
          aria-pressed={pressed}
          {...rest}
        >
          <Icon name={icon} size={size === 'sm' ? 14 : 16} class={iconClass} />
        </button>
      )}
    </Tip>
  );
}

/** Same look as IconButton, for links (prev/next question). Renders a disabled button when there is no target. */
export function IconLink({ icon, label, tip, href, side = 'bottom', align = 'center', iconClass }: { icon: IconName; label: string; tip?: string; href?: string; side?: TipSide; align?: TipAlign; iconClass?: string }) {
  if (!href) {
    return (
      <button type="button" class="wb-icon-btn" aria-label={label} disabled>
        <Icon name={icon} size={16} class={iconClass} />
      </button>
    );
  }
  return (
    <Tip text={tip ?? label} side={side} align={align}>
      {(id) => (
        <a class="wb-icon-btn" href={href} aria-label={label} aria-describedby={tip ? id : undefined}>
          <Icon name={icon} size={16} class={iconClass} />
        </a>
      )}
    </Tip>
  );
}
