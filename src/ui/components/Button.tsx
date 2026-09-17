// Buttons (design system v0.1). primary = the one rung-green action in a region. secondary = white, bordered.
// outline = rung border on white. ghost = rung text link. danger = red outline. hint = amber tint, only for help. 40px (sm 32, lg 44), radius 8px.
// IconButton = square icon-only button with a required label.
import type { ComponentChildren, JSX } from 'preact';
import { Icon } from './Icon.tsx';
import type { IconName } from './Icon.tsx';
import { Tooltip } from './Tooltip.tsx';
import type { TooltipSide } from './Tooltip.tsx';

export interface ButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size' | 'icon'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'hint';
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to the full width of the container. */
  block?: boolean;
  /** Keyboard hint rendered in mono after the label, e.g. "⌘↵". */
  kbd?: string;
  /** Optional leading icon. */
  icon?: IconName;
  children?: ComponentChildren;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

function classesFor(variant: ButtonProps['variant'], size: ButtonProps['size'], extra?: unknown, block?: boolean) {
  return ['btn', variant && variant !== 'secondary' ? variant : '', size && size !== 'md' ? size : '', block ? 'block' : '', typeof extra === 'string' ? extra : '']
    .filter(Boolean).join(' ');
}

export function Button({ variant = 'secondary', size = 'md', block, kbd, icon, children, class: cls, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} class={classesFor(variant, size, cls, block)} {...rest}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {kbd ? <span class="kbd-hint">{kbd}</span> : null}
    </button>
  );
}

export function LinkButton({ href, variant = 'secondary', size = 'md', block, icon, children, class: cls, onClick }: {
  href: string; variant?: ButtonProps['variant']; size?: ButtonProps['size']; block?: boolean; icon?: IconName; children: ComponentChildren; class?: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <a class={classesFor(variant, size, cls, block)} href={href} onClick={onClick}>
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
    </a>
  );
}

export interface IconButtonProps extends Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size' | 'icon' | 'label'> {
  icon: IconName;
  /** Accessible name, also shown as the tooltip. */
  label: string;
  size?: 'sm' | 'md';
  /** White background with a 1px border (e.g. a settings button in a bar). */
  bordered?: boolean;
  /** Tooltip placement; pass false for no tooltip. */
  tooltip?: TooltipSide | false;
  kbd?: string;
  disabled?: boolean;
}

export function IconButton({ icon, label, size = 'md', bordered, tooltip = 'bottom', kbd, class: cls, ...rest }: IconButtonProps) {
  const btn = (
    <button type="button" class={`icon-btn${size === 'sm' ? ' sm' : ''}${bordered ? ' bordered' : ''}${typeof cls === 'string' ? ' ' + cls : ''}`} aria-label={label} {...rest}>
      <Icon name={icon} size={16} />
    </button>
  );
  if (tooltip === false) return btn;
  return <Tooltip content={label} side={tooltip} kbd={kbd} decorative>{btn}</Tooltip>;
}
